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
//! Plan time: `BitmapPlanner::from_query` gathers the coverable HeapExpr quals and
//! `harvest` finds or builds a covering `BitmapHeapPath`, which the caller attaches as
//! a `custom_paths` child and rewrites the covered HeapFilters. Execution time:
//! `BitmapExec` runs the planned child `BitmapIndexScan` and converts its TIDBitmap
//! into the `TidCandidateSet` the HeapFilter scorer probes.
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
use crate::query::SearchQueryInput;
use crate::query::heap_field_filter::TidCandidateSet;
use pgrx::{PgList, pg_sys};
use std::sync::Arc;

pub struct BitmapPlanner {
    root: *mut pg_sys::PlannerInfo,
    rel: *mut pg_sys::RelOptInfo,
    bm25_oid: pg_sys::Oid,
    heap_exprs: Vec<*mut pg_sys::Node>,
}

struct HarvestedClause {
    index_name: String,
    clause: *mut pg_sys::Node,
    lossy: bool,
    matched_heap_expr: bool,
}

/// A successful harvest: the path to attach as a `custom_paths` child, plus the
/// HeapExpr clauses its bitmap covers (with their planner-level lossiness).
pub struct HarvestedBitmap {
    pub path: *mut pg_sys::Path,
    covered: Vec<(*mut pg_sys::Node, bool)>,
}

impl HarvestedBitmap {
    /// Flag every HeapFilter covered by the bitmap and move filters for exactly-matched
    /// (non-lossy) clauses into `recheck_filters`: their predicate is proven by exact
    /// bitmap membership and only needs re-evaluation on lossy/recheck pages. Lossy
    /// clauses (e.g. `ST_DWithin` behind a bbox index qual) stay in `always_filters`,
    /// which run on every bitmap survivor.
    pub unsafe fn rewrite_query(&self, query: &mut SearchQueryInput) {
        query.visit(&mut |sqi| {
            if let SearchQueryInput::HeapFilter {
                always_filters,
                recheck_filters,
                uses_tid_bitmap,
                ..
            } = sqi
            {
                let mut i = 0;
                while i < always_filters.len() {
                    let node = unsafe { always_filters[i].get_expression_node() };
                    let covered = self.covered.iter().find(|(clause, _)| unsafe {
                        pg_sys::equal(node.cast(), (*clause).cast())
                    });
                    match covered {
                        Some((_, lossy)) => {
                            *uses_tid_bitmap = true;
                            if !*lossy {
                                recheck_filters.push(always_filters.remove(i));
                                continue;
                            }
                            i += 1;
                        }
                        None => i += 1,
                    }
                }
            }
        });
    }
}

impl BitmapPlanner {
    /// Collect the expr node of every `Qual::HeapExpr` reachable through top-level AND
    /// structure. Returns `None` when there is nothing to cover, or when a HeapExpr
    /// appears under OR/NOT, where its bitmap could not be used to reject rows (todo)
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
    pub unsafe fn harvest(&self) -> Option<HarvestedBitmap> {
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
    unsafe fn accept(&self, bhp: *mut pg_sys::BitmapHeapPath) -> Option<HarvestedBitmap> {
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
                            let clause = (*(*iclause).rinfo).clause.cast::<pg_sys::Node>();
                            clauses.push(HarvestedClause {
                                index_name: index_name.clone(),
                                clause,
                                lossy: (*iclause).lossy,
                                matched_heap_expr: self.matches_heap_expr(clause),
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
            Some(HarvestedBitmap {
                path: bhp.cast(),
                covered: clauses
                    .into_iter()
                    .filter(|c| c.matched_heap_expr)
                    .map(|c| (c.clause, c.lossy))
                    .collect(),
            })
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
                        && let Some(iclause) = match_clause_to_index(self.root, ri, ioi)
                    {
                        iclauses.push(iclause);
                    }
                }
                if iclauses.is_empty() {
                    continue;
                }
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

    unsafe fn matches_heap_expr(&self, clause: *mut pg_sys::Node) -> bool {
        unsafe {
            self.heap_exprs
                .iter()
                .any(|expr| pg_sys::equal(clause.cast(), (*expr).cast()))
        }
    }
}

/// Execution half: owns the initialized child `BitmapIndexScan`/`BitmapAnd` planned
/// from the harvested path, and converts its TIDBitmap into a probe-able
/// `TidCandidateSet` on first execution.
pub struct BitmapExec {
    child: *mut pg_sys::PlanState,
    consumed: bool,
    set: Option<Arc<TidCandidateSet>>,
}

impl BitmapExec {
    /// Initialize the CustomScan's planned child bitmap scan, if it carries one.
    pub unsafe fn init(
        cscan: *mut pg_sys::CustomScan,
        estate: *mut pg_sys::EState,
        eflags: i32,
    ) -> Option<Self> {
        unsafe {
            let child_plan = PgList::<pg_sys::Plan>::from_pg((*cscan).custom_plans).get_ptr(0)?;
            Some(Self {
                child: pg_sys::ExecInitNode(child_plan, estate, eflags),
                consumed: false,
                set: None,
            })
        }
    }

    pub fn planstate(&self) -> *mut pg_sys::PlanState {
        self.child
    }

    pub fn index_name(&self) -> String {
        unsafe {
            let plan = (*self.child).plan;
            if (*plan).type_ == pg_sys::NodeTag::T_BitmapIndexScan {
                PgSearchRelation::open((*plan.cast::<pg_sys::BitmapIndexScan>()).indexid)
                    .name()
                    .to_string()
            } else {
                "multiple indexes".to_string()
            }
        }
    }

    /// (exact ctids, lossy blocks, recheck blocks) once the set has been built.
    pub fn candidate_stats(&self) -> Option<(usize, usize, usize)> {
        self.set.as_ref().map(|set| {
            (
                set.exact_ctids.len(),
                set.lossy_blocks.len(),
                set.recheck_blocks.len(),
            )
        })
    }

    pub unsafe fn shutdown(self) {
        unsafe { pg_sys::ExecEndNode(self.child) }
    }

    /// Prepare for a rescan: params may have changed, so the bitmap must be rebuilt on
    /// the next execution.
    pub unsafe fn rescan(&mut self) {
        unsafe { pg_sys::ExecReScan(self.child) };
        self.consumed = false;
        self.set = None;
    }

    /// Run the child via `MultiExecProcNode` (first execution only) and convert its
    /// TIDBitmap into a `TidCandidateSet`.
    pub unsafe fn candidate_set(&mut self) -> Option<Arc<TidCandidateSet>> {
        if !self.consumed {
            self.consumed = true;
            self.set = unsafe { self.build_candidate_set() };
        }
        self.set.clone()
    }

    unsafe fn build_candidate_set(&mut self) -> Option<Arc<TidCandidateSet>> {
        unsafe {
            let result = pg_sys::MultiExecProcNode(self.child);
            if result.is_null() {
                return None;
            }
            assert_eq!(
                (*result).type_,
                pg_sys::NodeTag::T_TIDBitmap,
                "MultiExecProcNode must return a TIDBitmap"
            );
            let tbm: *mut pg_sys::TIDBitmap = result.cast();

            // TIDBitmap iteration returns pages in block order with ascending offsets,
            // so the vecs below are built sorted, as `TidCandidateSet::probe` requires.
            let mut set = TidCandidateSet::default();
            let pack = |blockno: u32, offset: pg_sys::OffsetNumber| {
                ((blockno as u64) << 16) | (offset as u64)
            };

            #[cfg(feature = "pg18")]
            {
                let iter = pg_sys::tbm_begin_private_iterate(tbm);
                let mut res = pg_sys::TBMIterateResult::default();
                let mut offsets = [0 as pg_sys::OffsetNumber; 1024];
                while pg_sys::tbm_private_iterate(iter, &mut res) {
                    if res.lossy {
                        set.lossy_blocks.push(res.blockno);
                    } else {
                        let ntuples =
                            pg_sys::tbm_extract_page_tuple(&mut res, offsets.as_mut_ptr(), 1024);
                        for &offset in &offsets[..ntuples as usize] {
                            set.exact_ctids.push(pack(res.blockno, offset));
                        }
                        if res.recheck {
                            set.recheck_blocks.push(res.blockno);
                        }
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
                    if (*res).ntuples < 0 {
                        set.lossy_blocks.push((*res).blockno);
                    } else {
                        for &offset in (*res).offsets.as_slice((*res).ntuples as usize) {
                            set.exact_ctids.push(pack((*res).blockno, offset));
                        }
                        if (*res).recheck {
                            set.recheck_blocks.push((*res).blockno);
                        }
                    }
                }
                pg_sys::tbm_end_iterate(iter);
            }

            pg_sys::tbm_free(tbm);
            pgrx::notice!(
                "[bitmap_harvest] TidCandidateSet: {} exact ctids, {} lossy blocks, {} recheck blocks",
                set.exact_ctids.len(),
                set.lossy_blocks.len(),
                set.recheck_blocks.len(),
            );
            Some(Arc::new(set))
        }
    }
}

/// Mirror of core's `match_opclause_to_indexcol` / `match_funcclause_to_indexcol`
/// (both `static` in indxpath.c and unreachable from extensions): direct
/// `indexkey OP pseudoconstant` matches, their commuted forms, and derivation through
/// the operator's or function's planner support function -- the route core's `LIKE`
/// and PostGIS's `ST_DWithin` use to produce (lossy) index quals.
unsafe fn match_clause_to_index(
    root: *mut pg_sys::PlannerInfo,
    ri: *mut pg_sys::RestrictInfo,
    ioi: *mut pg_sys::IndexOptInfo,
) -> Option<*mut pg_sys::IndexClause> {
    unsafe {
        match (*(*ri).clause.cast::<pg_sys::Node>()).type_ {
            pg_sys::NodeTag::T_OpExpr => match_opclause(root, ri, ioi),
            pg_sys::NodeTag::T_FuncExpr => match_funcclause(root, ri, ioi),
            _ => None,
        }
    }
}

unsafe fn match_opclause(
    root: *mut pg_sys::PlannerInfo,
    ri: *mut pg_sys::RestrictInfo,
    ioi: *mut pg_sys::IndexOptInfo,
) -> Option<*mut pg_sys::IndexClause> {
    unsafe {
        let opexpr = (*ri).clause.cast::<pg_sys::OpExpr>();
        let args = PgList::<pg_sys::Node>::from_pg((*opexpr).args);
        if args.len() != 2 {
            return None;
        }
        let (leftop, rightop) = (
            strip_relabel(args.get_ptr(0)?),
            strip_relabel(args.get_ptr(1)?),
        );

        for indexcol in 0..(*ioi).nkeycolumns {
            let opfamily = *(*ioi).opfamily.add(indexcol as usize);

            if pg_sys::match_index_to_operand(leftop, indexcol, ioi) && is_pseudoconstant(rightop) {
                if pg_sys::op_in_opfamily((*opexpr).opno, opfamily) {
                    let mut indexquals = PgList::<pg_sys::RestrictInfo>::new();
                    indexquals.push(ri);
                    return Some(build_index_clause(ri, indexquals, false, indexcol));
                }
                if let Some(iclause) =
                    derive_via_support(root, ri, (*opexpr).opfuncid, 0, indexcol, ioi)
                {
                    return Some(iclause);
                }
            }

            if pg_sys::match_index_to_operand(rightop, indexcol, ioi) && is_pseudoconstant(leftop) {
                let comm_op = pg_sys::get_commutator((*opexpr).opno);
                if comm_op != pg_sys::InvalidOid && pg_sys::op_in_opfamily(comm_op, opfamily) {
                    let mut indexquals = PgList::<pg_sys::RestrictInfo>::new();
                    indexquals.push(pg_sys::commute_restrictinfo(ri, comm_op));
                    return Some(build_index_clause(ri, indexquals, false, indexcol));
                }
                if let Some(iclause) =
                    derive_via_support(root, ri, (*opexpr).opfuncid, 1, indexcol, ioi)
                {
                    return Some(iclause);
                }
            }
        }
        None
    }
}

unsafe fn match_funcclause(
    root: *mut pg_sys::PlannerInfo,
    ri: *mut pg_sys::RestrictInfo,
    ioi: *mut pg_sys::IndexOptInfo,
) -> Option<*mut pg_sys::IndexClause> {
    unsafe {
        let funcexpr = (*ri).clause.cast::<pg_sys::FuncExpr>();
        let args = PgList::<pg_sys::Node>::from_pg((*funcexpr).args);
        for indexcol in 0..(*ioi).nkeycolumns {
            for (indexarg, arg) in args.iter_ptr().enumerate() {
                if pg_sys::match_index_to_operand(strip_relabel(arg), indexcol, ioi)
                    && let Some(iclause) = derive_via_support(
                        root,
                        ri,
                        (*funcexpr).funcid,
                        indexarg as i32,
                        indexcol,
                        ioi,
                    )
                {
                    return Some(iclause);
                }
            }
        }
        None
    }
}

/// Ask the clause function's planner support function to derive indexable quals
/// (`SupportRequestIndexCondition`), exactly as core's
/// `get_index_clause_from_support` does. The support function decides whether the
/// derivation is possible and whether it is lossy.
unsafe fn derive_via_support(
    root: *mut pg_sys::PlannerInfo,
    ri: *mut pg_sys::RestrictInfo,
    funcid: pg_sys::Oid,
    indexarg: i32,
    indexcol: i32,
    ioi: *mut pg_sys::IndexOptInfo,
) -> Option<*mut pg_sys::IndexClause> {
    unsafe {
        let prosupport = pg_sys::get_func_support(funcid);
        if prosupport == pg_sys::InvalidOid {
            return None;
        }

        let mut req = pg_sys::SupportRequestIndexCondition::default();
        req.type_ = pg_sys::NodeTag::T_SupportRequestIndexCondition;
        req.root = root;
        req.funcid = funcid;
        req.node = (*ri).clause.cast();
        req.indexarg = indexarg;
        req.index = ioi;
        req.indexcol = indexcol;
        req.opfamily = *(*ioi).opfamily.add(indexcol as usize);
        req.indexcollation = *(*ioi).indexcollations.add(indexcol as usize);
        req.lossy = true;

        let result = pg_sys::OidFunctionCall1Coll(
            prosupport,
            pg_sys::InvalidOid,
            pg_sys::Datum::from(std::ptr::addr_of_mut!(req) as usize),
        );
        let derived: *mut pg_sys::List = result.cast_mut_ptr();
        if derived.is_null() {
            return None;
        }

        let mut indexquals = PgList::<pg_sys::RestrictInfo>::new();
        for expr in PgList::<pg_sys::Node>::from_pg(derived).iter_ptr() {
            indexquals.push(make_simple_restrictinfo(root, expr.cast()));
        }
        if indexquals.is_empty() {
            return None;
        }
        Some(build_index_clause(ri, indexquals, req.lossy, indexcol))
    }
}

unsafe fn build_index_clause(
    ri: *mut pg_sys::RestrictInfo,
    indexquals: PgList<pg_sys::RestrictInfo>,
    lossy: bool,
    indexcol: i32,
) -> *mut pg_sys::IndexClause {
    unsafe {
        let iclause: *mut pg_sys::IndexClause =
            pg_sys::palloc0(std::mem::size_of::<pg_sys::IndexClause>()).cast();
        (*iclause).type_ = pg_sys::NodeTag::T_IndexClause;
        (*iclause).rinfo = ri;
        (*iclause).indexquals = indexquals.into_pg();
        (*iclause).lossy = lossy;
        (*iclause).indexcol = indexcol as _;
        (*iclause).indexcols = std::ptr::null_mut();
        iclause
    }
}

unsafe fn strip_relabel(mut node: *mut pg_sys::Node) -> *mut pg_sys::Node {
    unsafe {
        while (*node).type_ == pg_sys::NodeTag::T_RelabelType {
            node = (*node.cast::<pg_sys::RelabelType>()).arg.cast();
        }
        node
    }
}

unsafe fn is_pseudoconstant(node: *mut pg_sys::Node) -> bool {
    unsafe { !pg_sys::contain_var_clause(node) && !pg_sys::contain_volatile_functions(node) }
}

#[cfg(feature = "pg15")]
unsafe fn make_simple_restrictinfo(
    root: *mut pg_sys::PlannerInfo,
    clause: *mut pg_sys::Expr,
) -> *mut pg_sys::RestrictInfo {
    unsafe {
        pg_sys::make_restrictinfo(
            root,
            clause,
            true,
            false,
            false,
            0,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    }
}

#[cfg(not(feature = "pg15"))]
unsafe fn make_simple_restrictinfo(
    root: *mut pg_sys::PlannerInfo,
    clause: *mut pg_sys::Expr,
) -> *mut pg_sys::RestrictInfo {
    unsafe {
        pg_sys::make_restrictinfo(
            root,
            clause,
            true,
            false,
            false,
            false,
            0,
            std::ptr::null_mut(),
            std::ptr::null_mut(),
            std::ptr::null_mut(),
        )
    }
}
