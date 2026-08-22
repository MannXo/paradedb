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

use crate::postgres::customscan::basescan::vector_work::VectorClaim;
use tantivy::collector::SortKeyComputer;
use tantivy::index::SegmentId;
use tantivy::query::Query;
use tantivy::vector::{TopDocsByVectorSimilarity, VectorElement, VectorSimilarityFruit};
use tantivy::{Searcher, SegmentOrdinal};

/// Drives one participant's vector search through the collector's
/// explicit API. Units are pulled from `claims` ONE AT A TIME, and each
/// maps 1:1 onto a call — the clustered chunk to `collect_ivf`, a flat
/// segment to `collect_flat` — so the next unit is claimed only after
/// the previous one's work is done: while one participant is inside the
/// chunk, the others drain the flat units. `merge` folds the fruits.
/// Without a claim source (serial), the collector's own
/// partition-everything `search` runs.
pub struct VectorSearchWorker<'a> {
    searcher: &'a Searcher,
    query: &'a dyn Query,
}

impl<'a> VectorSearchWorker<'a> {
    pub fn new(searcher: &'a Searcher, query: &'a dyn Query) -> Self {
        Self { searcher, query }
    }

    pub fn run<T, S>(
        &self,
        collector: TopDocsByVectorSimilarity<T, S>,
        claims: Option<&mut (dyn FnMut() -> Option<VectorClaim> + '_)>,
    ) -> VectorSimilarityFruit
    where
        T: VectorElement,
        S: SortKeyComputer + Send + Sync + 'static,
    {
        let Some(claims) = claims else {
            return collector
                .search(self.searcher, self.query)
                .expect("search should not fail");
        };
        let readers = self.searcher.segment_readers();
        let ordinal_of = |id: SegmentId| {
            readers
                .iter()
                .position(|reader| reader.segment_id() == id)
                .map(|ordinal| ordinal as SegmentOrdinal)
                .expect("claimed segment must exist in the searcher's snapshot")
        };
        let mut fruits = Vec::new();
        while let Some(claim) = claims() {
            fruits.push(match claim {
                VectorClaim::Clustered(ids) => {
                    let ordinals: Vec<SegmentOrdinal> =
                        ids.iter().copied().map(ordinal_of).collect();
                    collector
                        .collect_ivf(self.searcher, self.query, &ordinals)
                        .expect("search should not fail")
                }
                VectorClaim::Flat(id) => collector
                    .collect_flat(self.searcher, self.query, ordinal_of(id))
                    .expect("search should not fail"),
            });
        }
        collector.merge(fruits)
    }
}
