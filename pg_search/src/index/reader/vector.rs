// Copyright (c) 2023-2026 ParadeDB, Inc.
//
// This file is part of ParadeDB - Postgres for Search and Analytics
//
// This program is free software: you can redistribute it and/or modify
// it under the terms of the GNU Affero General Public License as published by
// the Free Software Foundation, either version 3 of the License, or
// (at your option) any later version.
//
// This program is distributed in the hope that it will be useful
// but WITHOUT ANY WARRANTY; without even the implied warranty of
// MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE. See the
// GNU Affero General Public License for more details.
//
// You should have received a copy of the GNU Affero General Public License
// along with this program. If not, see <http://www.gnu.org/licenses/>.

//! One participant's vector search execution.
//!
//! A LEADER-ROUTED parallel scan: only the leader opens the centroid
//! router — it streams ranked clusters into the DSM ring while every
//! participant (leader included) claims batches off the ring and scores
//! them across ALL clustered segments via `collect_clusters`, charging
//! each batch's spend against the one query-wide budget. Filter bitsets
//! are materialized once per segment into DSM slots (first-toucher CAS,
//! staggered start), and the flat (mutable) tier drains through the
//! existing per-segment claims afterwards. Serial scans keep the
//! collector's own partition-everything `search`.

use crate::postgres::customscan::basescan::vector_work::VectorScanWork;
use crate::postgres::{ParallelScanState, VectorFilterState, VectorRingClaim};
use pgrx::check_for_interrupts;
use pgrx::pg_sys;
use tantivy::collector::SortKeyComputer;
use tantivy::index::SegmentId;
use tantivy::query::{EnableScoring, Query};
use tantivy::vector::{
    TopDocsByVectorSimilarity, VectorElement, VectorSimilarityFruit, WorkModelInputs,
};
use tantivy::{Searcher, SegmentOrdinal};
use tantivy_common::{BitSet, OwnedBytes, ReadOnlyBitSet};

/// Ranked clusters per ring claim: the spend-report granularity, and the
/// unit of leader/worker interleaving.
const CLUSTER_BATCH: usize = 8;
/// How far ahead of consumption the leader fills the ring.
const FILL_AHEAD: u32 = 4 * CLUSTER_BATCH as u32;

/// One recorded unit of a participant's work, replayed verbatim on
/// re-query (the ring's entries persist in the DSM for the scan's life).
#[derive(Debug, Clone, Copy)]
pub enum VectorUnit {
    Clusters { start: u32, len: u32 },
    Flat(SegmentId),
}

/// One participant's slice of a parallel vector scan.
pub struct VectorParallelRun<'a> {
    pub pstate: *mut ParallelScanState,
    /// The Gather leader routes; workers only score.
    pub leader: bool,
    /// Recorded units from this scan's first pass — a re-query replays
    /// them instead of re-claiming (the budget was spent by that pass).
    pub replay: Option<Vec<VectorUnit>>,
    pub record: &'a mut dyn FnMut(VectorUnit),
}

pub struct VectorSearchWorker<'a> {
    searcher: &'a Searcher,
    query: &'a dyn Query,
    field: tantivy::schema::Field,
}

impl<'a> VectorSearchWorker<'a> {
    pub fn new(
        searcher: &'a Searcher,
        query: &'a dyn Query,
        field: tantivy::schema::Field,
    ) -> Self {
        Self {
            searcher,
            query,
            field,
        }
    }

    pub fn run<T, S>(
        &self,
        collector: TopDocsByVectorSimilarity<T, S>,
        parallel: Option<VectorParallelRun<'_>>,
    ) -> VectorSimilarityFruit
    where
        T: VectorElement,
        S: SortKeyComputer + Send + Sync + 'static,
    {
        let Some(run) = parallel else {
            return collector
                .search(self.searcher, self.query)
                .expect("search should not fail");
        };
        let field = self.field;
        // The clustered tier, ordered by segment id — the DETERMINISTIC
        // rank every participant agrees on for filter-slot indexing.
        let mut clustered: Vec<(SegmentId, SegmentOrdinal)> = self
            .searcher
            .segment_readers()
            .iter()
            .enumerate()
            .filter(|(_, reader)| {
                reader
                    .vector_index(field)
                    .ok()
                    .is_some_and(|vec| vec.clusters().is_some())
            })
            .map(|(ord, reader)| (reader.segment_id(), ord as SegmentOrdinal))
            .collect();
        clustered.sort_by_key(|(id, _)| *id);

        let pstate = run.pstate;
        let model = unsafe { (*pstate).vector_model() }.map(|(docs, nonempty)| WorkModelInputs {
            total_docs: docs,
            total_nonempty_clusters: nonempty,
        });

        let mut fruits = Vec::new();
        if let Some(units) = run.replay {
            // Replay: the ring and filter slots still hold the first
            // pass's data.
            let (ords, filters) = match model {
                Some(_) => self.resolve_filters(&clustered, pstate, run.leader),
                None => (Vec::new(), std::collections::HashMap::new()),
            };
            let provider = |ord: SegmentOrdinal| filters.get(&ord).cloned();
            for unit in units {
                match unit {
                    VectorUnit::Clusters { start, len } => {
                        let entries = unsafe { (*pstate).vector_ring_read(start, len) };
                        let model = model.expect("clustered replay requires a model");
                        fruits.push(
                            collector
                                .collect_clusters(
                                    self.searcher,
                                    self.query,
                                    &ords,
                                    &entries,
                                    &model,
                                    Some(&provider),
                                )
                                .expect("search should not fail"),
                        );
                    }
                    VectorUnit::Flat(id) => {
                        fruits.push(
                            collector
                                .collect_flat(self.searcher, self.query, self.ordinal_of(id))
                                .expect("search should not fail"),
                        );
                    }
                }
            }
            return collector.merge(fruits);
        }

        let record = run.record;
        if let Some(model) = model {
            let (ords, filters) = self.resolve_filters(&clustered, pstate, run.leader);
            let provider = |ord: SegmentOrdinal| filters.get(&ord).cloned();
            let budget_millis = unsafe { (*pstate).vector_budget_millis() };

            let mut routing = if run.leader {
                Some(
                    collector
                        .cluster_routing(self.searcher)
                        .expect("centroid routing should open"),
                )
            } else {
                None
            };
            let mut batch: Vec<(u32, f32)> = Vec::with_capacity(CLUSTER_BATCH);
            loop {
                if let Some(stream) = routing.as_mut() {
                    // Fill: stay FILL_AHEAD of consumption, stop at the
                    // budget (in-flight entries count ~1 work unit each —
                    // the model's normalization identity).
                    let head = unsafe { (*pstate).vector_ring_head() };
                    let tail = unsafe { (*pstate).vector_ring_tail() };
                    let inflight = head.saturating_sub(tail.min(head));
                    let spend = unsafe { (*pstate).vector_spend_millis() };
                    if spend + (inflight as i64) * 1000 >= budget_millis {
                        unsafe { (*pstate).vector_set_routing_done() };
                        routing = None;
                    } else if inflight < FILL_AHEAD {
                        batch.clear();
                        let more = stream.next_batch(&mut batch, CLUSTER_BATCH);
                        if !batch.is_empty() {
                            unsafe { (*pstate).vector_ring_push(&batch) };
                        }
                        if !more {
                            unsafe { (*pstate).vector_set_routing_done() };
                            routing = None;
                        }
                        continue;
                    }
                }
                match unsafe { (*pstate).vector_ring_claim(CLUSTER_BATCH) } {
                    VectorRingClaim::Batch { start, entries } => {
                        record(VectorUnit::Clusters {
                            start,
                            len: entries.len() as u32,
                        });
                        let fruit = collector
                            .collect_clusters(
                                self.searcher,
                                self.query,
                                &ords,
                                &entries,
                                &model,
                                Some(&provider),
                            )
                            .expect("search should not fail");
                        let millis = (fruit.stats.work_charged as f64 * 1000.0).ceil() as i64;
                        unsafe { (*pstate).vector_charge_spend(millis) };
                        fruits.push(fruit);
                    }
                    VectorRingClaim::Wait => {
                        if routing.is_some() {
                            continue;
                        }
                        check_for_interrupts!();
                        unsafe { pg_sys::pg_usleep(100) };
                    }
                    VectorRingClaim::Drained => break,
                }
            }
        }

        // The flat (mutable) tier: per-segment claims, as before.
        while let Some(id) = unsafe { VectorScanWork::claim_flat(pstate) } {
            record(VectorUnit::Flat(id));
            fruits.push(
                collector
                    .collect_flat(self.searcher, self.query, self.ordinal_of(id))
                    .expect("search should not fail"),
            );
        }
        collector.merge(fruits)
    }

    fn ordinal_of(&self, id: SegmentId) -> SegmentOrdinal {
        self.searcher
            .segment_readers()
            .iter()
            .position(|reader| reader.segment_id() == id)
            .map(|ordinal| ordinal as SegmentOrdinal)
            .expect("claimed segment must exist in the searcher's snapshot")
    }

    /// Resolves every clustered segment's shared filter: first-toucher
    /// builds into the DSM slot (start staggered by participant so the
    /// builds spread), everyone else waits briefly for READY/EMPTY.
    /// EMPTY segments are dropped from the returned ords. An all-docs
    /// query resolves to no filters at all.
    fn resolve_filters(
        &self,
        clustered: &[(SegmentId, SegmentOrdinal)],
        pstate: *mut ParallelScanState,
        leader: bool,
    ) -> (
        Vec<SegmentOrdinal>,
        std::collections::HashMap<SegmentOrdinal, ReadOnlyBitSet>,
    ) {
        let mut ords: Vec<SegmentOrdinal> = Vec::with_capacity(clustered.len());
        let mut filters = std::collections::HashMap::new();
        let weight = self
            .query
            .weight(EnableScoring::disabled_from_searcher(self.searcher))
            .expect("weight should build");
        if weight.matches_all_docs() {
            ords.extend(clustered.iter().map(|&(_, ord)| ord));
            return (ords, filters);
        }
        let n = clustered.len();
        let me = if leader {
            0
        } else {
            (unsafe { pg_sys::ParallelWorkerNumber }.max(0) as usize + 1) % n.max(1)
        };
        let mut dead: Vec<bool> = vec![false; n];
        for step in 0..n {
            let idx = (me + step) % n;
            let (_, ord) = clustered[idx];
            let reader = &self.searcher.segment_readers()[ord as usize];
            loop {
                match unsafe { (*pstate).vector_filter_try_claim(idx) } {
                    VectorFilterState::Build => {
                        let mut bits = BitSet::with_max_value(reader.max_doc());
                        let mut any = false;
                        weight
                            .for_each_no_score(reader, &mut |docs| {
                                for &doc in docs {
                                    bits.insert(doc);
                                    any = true;
                                }
                            })
                            .expect("filter drain should not fail");
                        if any {
                            let mut bytes = Vec::new();
                            bits.serialize(&mut bytes).expect("bitset serialize");
                            unsafe { (*pstate).vector_filter_publish(idx, Some(&bytes)) };
                            filters.insert(ord, ReadOnlyBitSet::open(OwnedBytes::new(bytes)));
                        } else {
                            unsafe { (*pstate).vector_filter_publish(idx, None) };
                            dead[idx] = true;
                        }
                        break;
                    }
                    VectorFilterState::Ready => {
                        let bytes = unsafe { (*pstate).vector_filter_bytes(idx) }.to_vec();
                        filters.insert(ord, ReadOnlyBitSet::open(OwnedBytes::new(bytes)));
                        break;
                    }
                    VectorFilterState::Empty => {
                        dead[idx] = true;
                        break;
                    }
                    VectorFilterState::Building | VectorFilterState::NotBuilt => {
                        check_for_interrupts!();
                        unsafe { pg_sys::pg_usleep(100) };
                    }
                }
            }
        }
        for (idx, &(_, ord)) in clustered.iter().enumerate() {
            if !dead[idx] {
                ords.push(ord);
            }
        }
        (ords, filters)
    }
}
