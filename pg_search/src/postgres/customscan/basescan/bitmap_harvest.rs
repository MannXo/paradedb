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

//! Finds a `BitmapHeapPath` over a non-BM25 index (btree, GIN, PostGIS GiST) whose
//! bitmapqual covers quals we would otherwise evaluate as a `heap_filter`, so the
//! index's TIDBitmap can be intersected with the Tantivy result set (#5702).
//!
//! Plan time: `BitmapHarvester::from_query` gathers the coverable HeapExpr quals and
//! `harvest` finds or builds a covering `BitmapHeapPath`, which the caller attaches as
//! a `custom_paths` child. Execution time: `consume_and_report` runs the planned child
//! `BitmapIndexScan` and inspects its TIDBitmap.
//!
//! Scope: a single `BitmapIndexScan` or `BitmapAnd` tree over top-level AND clauses;
//! `BitmapOr` is rejected because a single OR arm is not a necessary condition of the
//! query, so rejecting rows absent from its bitmap would be unsound.
//!
//! Recheck invariant: a lossy `IndexClause` means the original predicate must always be
//! re-evaluated on bitmap survivors; a non-lossy original only needs re-evaluation when
//! the TIDBitmap page's recheck bit is set.

use crate::postgres::customscan::qual_inspect::Qual;
use crate::postgres::rel::PgSearchRelation;
use pgrx::{PgList, pg_sys};

pub struct BitmapHarvester {
    root: *mut pg_sys::PlannerInfo,
    rel: *mut pg_sys::RelOptInfo,
    bm25_oid: pg_sys::Oid,
    heap_exprs: Vec<*mut pg_sys::Node>,
}

struct HarvestedClause {
    index_name: String,
    lossy: bool,
    matched_heap_expr: bool,
}

impl BitmapHarvester {
    /// Collect the expr node of every `Qual::HeapExpr` reachable through top-level AND
    /// structure. Returns `None` when there is nothing to cover, or when a HeapExpr
    /// appears under OR/NOT, where its bitmap could not be used to reject rows.
    pub fn from_query(
        root: *mut pg_sys::PlannerInfo,
        rel: *mut pg_sys::RelOptInfo,
        bm25_oid: pg_sys::Oid,
        quals: &Qual,
    ) -> Option<Self> {
        fn collect(qual: &Qual, out: &mut Vec<*mut pg_sys::Node>) -> bool {
            match qual {
                Qual::HeapExpr { expr_node, .. } => {
                    out.push(*expr_node);
                    true
                }
                Qual::And(qs) => qs.iter().all(|q| collect(q, out)),
                Qual::Or(_) | Qual::Not(_) => !qual.contains_heap_expr(),
                _ => true,
            }
        }

        let mut heap_exprs = Vec::new();
        if !collect(quals, &mut heap_exprs) || heap_exprs.is_empty() {
            return None;
        }
        Some(Self {
            root,
            rel,
            bm25_oid,
            heap_exprs,
        })
    }

    /// Find a `BitmapHeapPath` usable as an intersection source. Prefers one the
    /// planner kept in the rel's pathlists; falls back to building one, since a
    /// BitmapHeapPath only survives add_path competition when it beats every other path
    /// (usually seqscan) -- absence does not mean no index applies.
    pub unsafe fn harvest(&self) -> Option<*mut pg_sys::Path> {
        unsafe {
            let mut candidates: Vec<*mut pg_sys::BitmapHeapPath> =
                PgList::<pg_sys::Path>::from_pg((*self.rel).pathlist)
                    .iter_ptr()
                    .chain(PgList::<pg_sys::Path>::from_pg((*self.rel).partial_pathlist).iter_ptr())
                    .filter(|path| (**path).type_ == pg_sys::NodeTag::T_BitmapHeapPath)
                    .map(|path| path.cast())
                    .collect();

            if candidates.is_empty()
                && let Some(bhp) = self.build_bitmap_path()
            {
                candidates.push(bhp);
            }

            candidates.into_iter().find_map(|bhp| self.accept(bhp))
        }
    }

    /// Accept or reject one candidate: walk its bitmapqual tree enforcing the
    /// module-level scope rules, and require that it covers at least one of our
    /// HeapExpr clauses.
    unsafe fn accept(&self, bhp: *mut pg_sys::BitmapHeapPath) -> Option<*mut pg_sys::Path> {
        unsafe {
            let mut clauses = Vec::new();
            let mut pending = vec![(*bhp).bitmapqual];
            while let Some(path) = pending.pop() {
                match (*path).type_ {
                    pg_sys::NodeTag::T_BitmapAndPath => {
                        let and_path: *mut pg_sys::BitmapAndPath = path.cast();
                        pending.extend(
                            PgList::<pg_sys::Path>::from_pg((*and_path).bitmapquals).iter_ptr(),
                        );
                    }
                    pg_sys::NodeTag::T_IndexPath => {
                        let ip: *mut pg_sys::IndexPath = path.cast();
                        let indexoid = (*(*ip).indexinfo).indexoid;
                        if indexoid == self.bm25_oid {
                            pgrx::notice!(
                                "[bitmap_harvest] skipping BitmapHeapPath: bitmapqual is over the BM25 index itself"
                            );
                            return None;
                        }
                        let index_name = PgSearchRelation::open(indexoid).name().to_string();
                        for iclause in
                            PgList::<pg_sys::IndexClause>::from_pg((*ip).indexclauses).iter_ptr()
                        {
                            clauses.push(HarvestedClause {
                                index_name: index_name.clone(),
                                lossy: (*iclause).lossy,
                                matched_heap_expr: self
                                    .matches_heap_expr((*(*iclause).rinfo).clause.cast()),
                            });
                        }
                    }
                    _ => {
                        pgrx::notice!(
                            "[bitmap_harvest] skipping BitmapHeapPath: bitmapqual contains BitmapOr"
                        );
                        return None;
                    }
                }
            }

            if !clauses.iter().any(|c| c.matched_heap_expr) {
                pgrx::notice!(
                    "[bitmap_harvest] skipping BitmapHeapPath: covers no heap_filter clause"
                );
                return None;
            }

            for clause in &clauses {
                pgrx::notice!(
                    "[bitmap_harvest] index={} lossy={} matched_heap_expr={}",
                    clause.index_name,
                    clause.lossy,
                    clause.matched_heap_expr,
                );
            }
            pgrx::notice!(
                "[bitmap_harvest] harvested BitmapHeapPath: {} index clause(s), {} matched heap_filter clause(s), est rows={:.0}",
                clauses.len(),
                clauses.iter().filter(|c| c.matched_heap_expr).count(),
                (*bhp).path.rows,
            );
            Some(bhp.cast())
        }
    }

    /// Build a `BitmapHeapPath` over the first non-BM25 index with at least one key
    /// column matching a HeapExpr clause.
    unsafe fn build_bitmap_path(&self) -> Option<*mut pg_sys::BitmapHeapPath> {
        unsafe {
            for ioi in PgList::<pg_sys::IndexOptInfo>::from_pg((*self.rel).indexlist).iter_ptr() {
                if (*ioi).indexoid == self.bm25_oid || !(*ioi).amhasgetbitmap {
                    continue;
                }
                // Partial indexes need predicate-implication checks.
                if !(*ioi).indpred.is_null() {
                    continue;
                }

                let mut iclauses = PgList::<pg_sys::IndexClause>::new();
                for ri in PgList::<pg_sys::RestrictInfo>::from_pg((*ioi).indrestrictinfo).iter_ptr()
                {
                    if self.matches_heap_expr((*ri).clause.cast())
                        && let Some(iclause) = Self::match_clause_to_index(ri, ioi)
                    {
                        iclauses.push(iclause);
                    }
                }
                if iclauses.is_empty() {
                    continue;
                }

                pgrx::notice!(
                    "[bitmap_harvest] directly built IndexPath over {} with {} clause(s)",
                    PgSearchRelation::open((*ioi).indexoid).name(),
                    iclauses.len()
                );
                let ipath = pg_sys::create_index_path(
                    self.root,
                    ioi,
                    iclauses.into_pg(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    std::ptr::null_mut(),
                    pg_sys::ScanDirection::ForwardScanDirection,
                    false,
                    std::ptr::null_mut(),
                    1.0,
                    false,
                );
                let bhp = pg_sys::create_bitmap_heap_path(
                    self.root,
                    self.rel,
                    ipath.cast(),
                    (*self.rel).lateral_relids,
                    1.0,
                    0,
                );
                return Some(bhp);
            }
            None
        }
    }

    /// Mirror of the direct-match arm of core's `match_opclause_to_indexcol`: accepts
    /// `indexkey OP pseudoconstant` with the operator in the key column's opfamily.
    /// Clauses needing support-function derivation (LIKE prefix, PostGIS ST_DWithin)
    /// are not yet matched.
    unsafe fn match_clause_to_index(
        ri: *mut pg_sys::RestrictInfo,
        ioi: *mut pg_sys::IndexOptInfo,
    ) -> Option<*mut pg_sys::IndexClause> {
        unsafe {
            let clause = (*ri).clause.cast::<pg_sys::Node>();
            if (*clause).type_ != pg_sys::NodeTag::T_OpExpr {
                return None;
            }
            let opexpr = clause.cast::<pg_sys::OpExpr>();
            let args = PgList::<pg_sys::Node>::from_pg((*opexpr).args);
            if args.len() != 2 {
                return None;
            }
            let (mut leftop, rightop) = (args.get_ptr(0)?, args.get_ptr(1)?);
            if (*leftop).type_ == pg_sys::NodeTag::T_RelabelType {
                leftop = (*leftop.cast::<pg_sys::RelabelType>()).arg.cast();
            }
            if pg_sys::contain_var_clause(rightop) || pg_sys::contain_volatile_functions(rightop) {
                return None;
            }

            for indexcol in 0..(*ioi).nkeycolumns {
                if pg_sys::match_index_to_operand(leftop, indexcol, ioi)
                    && pg_sys::op_in_opfamily(
                        (*opexpr).opno,
                        *(*ioi).opfamily.add(indexcol as usize),
                    )
                {
                    let iclause: *mut pg_sys::IndexClause =
                        pg_sys::palloc0(std::mem::size_of::<pg_sys::IndexClause>()).cast();
                    (*iclause).type_ = pg_sys::NodeTag::T_IndexClause;
                    (*iclause).rinfo = ri;
                    let mut indexquals = PgList::<pg_sys::RestrictInfo>::new();
                    indexquals.push(ri);
                    (*iclause).indexquals = indexquals.into_pg();
                    (*iclause).lossy = false;
                    (*iclause).indexcol = indexcol as _;
                    (*iclause).indexcols = std::ptr::null_mut();
                    return Some(iclause);
                }
            }
            None
        }
    }

    unsafe fn matches_heap_expr(&self, clause: *mut pg_sys::Node) -> bool {
        unsafe {
            self.heap_exprs
                .iter()
                .any(|expr| pg_sys::equal(clause.cast(), (*expr).cast()))
        }
    }
}

/// Run the child `BitmapIndexScan` via `MultiExecProcNode` and report what its
/// TIDBitmap contains.
pub unsafe fn consume_and_report(child: *mut pg_sys::PlanState) {
    unsafe {
        let result = pg_sys::MultiExecProcNode(child);
        if result.is_null() {
            pgrx::notice!("[bitmap_harvest] MultiExecProcNode returned NULL");
            return;
        }
        assert_eq!(
            (*result).type_,
            pg_sys::NodeTag::T_TIDBitmap,
            "MultiExecProcNode must return a TIDBitmap"
        );
        let tbm: *mut pg_sys::TIDBitmap = result.cast();

        let mut pages = 0u64;
        let mut exact_tuples = 0u64;
        let mut lossy_pages = 0u64;
        let mut recheck_pages = 0u64;

        #[cfg(feature = "pg18")]
        {
            let iter = pg_sys::tbm_begin_private_iterate(tbm);
            let mut res = pg_sys::TBMIterateResult::default();
            let mut offsets = [0 as pg_sys::OffsetNumber; 1024];
            while pg_sys::tbm_private_iterate(iter, &mut res) {
                pages += 1;
                if res.lossy {
                    lossy_pages += 1;
                } else {
                    let ntuples =
                        pg_sys::tbm_extract_page_tuple(&mut res, offsets.as_mut_ptr(), 1024);
                    exact_tuples += ntuples as u64;
                }
                if res.recheck {
                    recheck_pages += 1;
                }
            }
            pg_sys::tbm_end_private_iterate(iter);
        }

        #[cfg(not(feature = "pg18"))]
        {
            let iter = pg_sys::tbm_begin_iterate(tbm);
            loop {
                let res = pg_sys::tbm_iterate(iter);
                if res.is_null() {
                    break;
                }
                pages += 1;
                if (*res).ntuples < 0 {
                    lossy_pages += 1;
                } else {
                    exact_tuples += (*res).ntuples as u64;
                }
                if (*res).recheck {
                    recheck_pages += 1;
                }
            }
            pg_sys::tbm_end_iterate(iter);
        }

        pgrx::notice!(
            "[bitmap_harvest] TIDBitmap: {pages} pages ({exact_tuples} exact tuples, \
             {lossy_pages} lossy pages, {recheck_pages} recheck pages)"
        );
        pg_sys::tbm_free(tbm);
    }
}
