//! Work distribution for a parallel vector scan, in one place: the tier
//! partition, the DSM segment sources, the participant count worth
//! launching, and the claim protocol.
//!
//! The clustered segments form ONE unit of work — they share a routing
//! pass and a heap (tantivy's `CollectorMode::MultiSegment`) — and each
//! flat (mutable-tier) segment is its own unit: exact and independent. A
//! participant claims units until none remain, so a lost worker costs
//! parallelism, never results.

use crate::api::OrderByFeature;
use crate::index::mvcc::MvccSatisfies;
use crate::index::reader::index::SearchIndexReader;
use crate::postgres::customscan::builders::custom_path::ExecMethodType;
use crate::postgres::rel::PgSearchRelation;
use crate::postgres::{ParallelScanState, VectorScanArgs, VectorScanLayoutSpec};
use pgrx::pg_sys;
use tantivy::SegmentReader;
use tantivy::index::SegmentId;
use tantivy::schema::Field;
use tantivy::vector::ivf::AdaptiveProbeParams;
use tantivy::vector::{WorkModelInputs, global_probe_budget};

/// DSM source index of the clustered segments. Not claimed by segment —
/// clustered work arrives as ranked clusters through the DSM ring — but
/// the source's SegmentView is still replayed by every participant.
#[allow(dead_code)]
const CLUSTERED_SOURCE: usize = 0;
/// DSM source index of the flat segments (one unit each).
const FLAT_SOURCE: usize = 1;

/// The planner's three-state view of a scan's vector parallelism —
/// replaces carrying `is_vector_orderby` and a participant count
/// separately.
pub enum VectorScanParallelism {
    /// Not a vector-distance ORDER BY scan.
    NotVector,
    /// Vector scan with no flat tier to hand a worker: serial only.
    Serial,
    /// Vector scan with a flat tier: force one participant per unit of
    /// work (each flat segment, plus the clustered chunk).
    Parallel { participants: usize },
}

impl VectorScanParallelism {
    /// Decide from the plan-time snapshot: parallel when there is a flat
    /// tier to hand a worker, or a clustered tier big enough that
    /// leader-routed scoring participants pay for their launch
    /// (`paradedb.vector_parallel_min_rows`).
    pub fn for_scan(indexrel: &PgSearchRelation, method: &ExecMethodType) -> Self {
        let is_vector_orderby = matches!(
            method,
            ExecMethodType::TopK {
                orderby_info: Some(infos),
                ..
            } if infos.first().is_some_and(|info| info.is_vector_distance())
        );
        if !is_vector_orderby {
            return VectorScanParallelism::NotVector;
        }
        match VectorScanWork::for_index(indexrel, method) {
            Some(work) if work.desired_participants() > 1 => VectorScanParallelism::Parallel {
                participants: work.desired_participants(),
            },
            _ => VectorScanParallelism::Serial,
        }
    }
}

/// A vector scan's snapshot partitioned by tier.
pub struct VectorScanWork {
    field: Field,
    clustered: Vec<SegmentReader>,
    flat: Vec<SegmentReader>,
}

impl VectorScanWork {
    /// Partition `reader`'s snapshot by tier for `method`'s vector ORDER
    /// BY; `None` when the scan is not one (or a vector reader fails to
    /// open, which falls back to the single-source layout).
    pub fn from_scan(method: &ExecMethodType, reader: &SearchIndexReader) -> Option<Self> {
        let ExecMethodType::TopK {
            orderby_info: Some(infos),
            ..
        } = method
        else {
            return None;
        };
        let OrderByFeature::VectorDistance { name, .. } = &infos.first()?.feature else {
            return None;
        };
        let field = reader.schema().search_field(name)?.field();
        let mut clustered = Vec::new();
        let mut flat = Vec::new();
        for segment in reader.segment_readers() {
            let vector = segment.vector_index(field).ok()?;
            if vector.clusters().is_some() {
                clustered.push(segment.clone());
            } else {
                flat.push(segment.clone());
            }
        }
        Some(Self {
            field,
            clustered,
            flat,
        })
    }

    /// Plan-time construction over a fresh snapshot of `indexrel`.
    pub fn for_index(indexrel: &PgSearchRelation, method: &ExecMethodType) -> Option<Self> {
        let reader = SearchIndexReader::empty(indexrel, MvccSatisfies::Snapshot).ok()?;
        Self::from_scan(method, &reader)
    }

    /// Participants worth running: one per flat segment, plus the
    /// leader-routed scoring participants the clustered tier merits —
    /// worker help only pays past `paradedb.vector_parallel_min_rows`
    /// (per-query worker launches cost real time).
    pub fn desired_participants(&self) -> usize {
        self.flat.len() + self.clustered_participants()
    }

    fn clustered_participants(&self) -> usize {
        if self.clustered.is_empty() {
            return 0;
        }
        let clustered_rows: usize = self
            .clustered
            .iter()
            .map(|reader| reader.num_docs() as usize)
            .sum();
        let cap = unsafe { pg_sys::max_parallel_workers_per_gather.max(0) } as usize + 1;
        if clustered_rows >= crate::gucs::vector_parallel_min_rows() && cap > 1 {
            cap
        } else {
            1
        }
    }

    /// The leader-routed scan's DSM sizing, budget, and work model — the
    /// same budget resolution the serial collector applies, priced off
    /// the whole clustered tier. `None` when there is no clustered tier.
    pub fn vector_scan_args(&self) -> Option<VectorScanArgs> {
        let first = self.clustered.first()?;
        let num_centroids = first
            .vector_index(self.field)
            .ok()?
            .clusters()?
            .num_clusters();
        let (mut docs, mut nonempty, mut max_doc) = (0u64, 0u64, 0u32);
        for reader in &self.clustered {
            let ivf_reader = reader.vector_index(self.field).ok()?;
            let ivf = ivf_reader.clusters()?;
            docs += ivf.num_docs() as u64;
            nonempty += ivf.num_non_empty_clusters() as u64;
            max_doc = max_doc.max(reader.max_doc());
        }
        let model = WorkModelInputs {
            total_docs: docs,
            total_nonempty_clusters: nonempty,
        };
        let params = AdaptiveProbeParams {
            max_probe_fraction: crate::gucs::vector_cluster_max_probe(),
            ..Default::default()
        };
        let budget = global_probe_budget(
            params.max_probe_fraction,
            params.min_probe_clusters,
            num_centroids,
            &model,
        );
        // A serialized dense bitset: max_value word plus the bit words,
        // with slack for framing.
        let filter_slot_bytes = 16 + (max_doc as usize).div_ceil(64) * 8 + 16;
        Some(VectorScanArgs {
            layout: VectorScanLayoutSpec {
                ring_capacity: num_centroids as u32,
                n_filter_segments: self.clustered.len() as u32,
                filter_slot_bytes: filter_slot_bytes as u32,
            },
            budget_millis: (budget.get() * 1000.0).ceil() as i64,
            total_docs: docs,
            total_nonempty_clusters: nonempty,
        })
    }

    /// The DSM segment sources, indexed by [`CLUSTERED_SOURCE`] and
    /// [`FLAT_SOURCE`].
    pub fn sources(&self) -> Vec<&[SegmentReader]> {
        vec![&self.clustered, &self.flat]
    }

    /// One atomic claim of a FLAT unit from the DSM; the clustered tier is
    /// not claimed by segment — its work arrives as ranked clusters through
    /// the DSM ring (see `reader::vector`).
    ///
    /// # Safety
    /// `pscan_state` must point at an initialized [`ParallelScanState`]
    /// whose sources were registered from [`Self::sources`].
    pub unsafe fn claim_flat(pscan_state: *mut ParallelScanState) -> Option<SegmentId> {
        unsafe { (*pscan_state).checkout_segment_for_source(FLAT_SOURCE) }
    }
}
