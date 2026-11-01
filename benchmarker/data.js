window.BENCHMARK_DATA = {
  "lastUpdate": 1787684794564,
  "repoUrl": "https://github.com/paradedb/paradedb",
  "entries": {
    "benchmarker hn-ci (QPS)": [
      {
        "commit": {
          "author": {
            "email": "james.sewell@gmail.com",
            "name": "James Sewell",
            "username": "jamessewell"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "dd2424c18610b36018c75540a31ee16ecb018339",
          "message": "ci: benchmarker suite for pg_search (hn-benchmarker) (#5850)\n\nAdds a RunsOn workflow that benchmarks pg_search built from this\nbranch's source against the `hn-benchmarker` dataset using the external\nbenchmarker suite.\n\n- Builds pg_search from source and overlays it onto the\n`paradedb/paradedb:v0.25.0-pg18` base (buildkit-cache-dance warms the\ncargo/target mounts).\n- Brings up the dataset's single `paradedb` service via the `paradedb`\ncompose profile, points `PARADEDB_IMAGE` at the source build.\n- Runs every `k6/*.js` the dataset ships (currently `topk.js`), once\neach.\n- Publishes each script's dashboard HTML (with CPU/mem graphs) to\ngh-pages and links it from a PR comment; pushes QPS + p50/p90/p95/p99 to\ngh-pages for over-time tracking (main only).\n\n**Testing:** add the `benchmark-benchmarker` label to run. Requires the\n`hn-benchmarker` dataset to be present at\n`s3://paradedb-benchmarker/datasets/hn-benchmarker`.\n\n---------\n\nSigned-off-by: Philippe Noël <21990816+philippemnoel@users.noreply.github.com>\nCo-authored-by: Philippe Noël <21990816+philippemnoel@users.noreply.github.com>",
          "timestamp": "2026-08-19T11:04:28-04:00",
          "tree_id": "8c3bcacafae807e4074e533538fd64bd40655c80",
          "url": "https://github.com/paradedb/paradedb/commit/dd2424c18610b36018c75540a31ee16ecb018339"
        },
        "date": 1787153837624,
        "tool": "customBiggerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) QPS",
            "value": 522.4333333333333,
            "unit": "QPS"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "stuhood@paradedb.com",
            "name": "Stu Hood",
            "username": "stuhood"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "45b92e5c6cee1d64839d7c6d0d2c20c6397f752e",
          "message": "fix: Report dynamic filter pushdown under MPP (#5951)\n\n## What\n\nRecord dynamic filter pushdown via a metric.\n\n## Why\n\nTo allow for accurate reporting under MPP. `dynamic_filter_pushdown` is\ntriggered only after execution has started, and only metrics are\ntransferred back over the wire after MPP execution.\n\n## Tests\n\nSee changed regress tests.",
          "timestamp": "2026-08-19T09:32:46-07:00",
          "tree_id": "80143b13afb100c52f85648a131b2fb4084feec8",
          "url": "https://github.com/paradedb/paradedb/commit/45b92e5c6cee1d64839d7c6d0d2c20c6397f752e"
        },
        "date": 1787159011692,
        "tool": "customBiggerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) QPS",
            "value": 529.3490216992767,
            "unit": "QPS"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "stuhood@paradedb.com",
            "name": "Stu Hood",
            "username": "stuhood"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "802585d3398c5f6f0384021feb29b3813c7e75b5",
          "message": "perf: Use an in-memory channel for self-loops in MPP (#6002)\n\n# Ticket(s) Closed\n\n- Closes #5332\n\n## What\n\nIncorporates a new tag of `datafusion-distributed` which picks up\nhttps://github.com/datafusion-contrib/datafusion-distributed/pull/656,\nand switches to using it for self-loops.\n\n## Why\n\nTo avoid serialization costs when sending data in-process.\n\n## Tests\n\nCauses some benchmark movement on small datasets, but no change on\nlarger datasets.\n\n---------\n\nCo-authored-by: paradedb-github-app[bot] <282009505+paradedb-github-app[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-19T19:03:30-07:00",
          "tree_id": "57508ac87b2e5595e113837b3c79f7cab2ddf966",
          "url": "https://github.com/paradedb/paradedb/commit/802585d3398c5f6f0384021feb29b3813c7e75b5"
        },
        "date": 1787192895476,
        "tool": "customBiggerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) QPS",
            "value": 511.1,
            "unit": "QPS"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "stuhood@paradedb.com",
            "name": "Stu Hood",
            "username": "stuhood"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ddf7f2f06fd7e6fffd7c7a35d5623c11db7b89a0",
          "message": "chore: Render table name (or alias) in `PgSearchScan`. (#6009)\n\n## What\n\nRender the table name (or its assigned alias) in `EXPLAIN` for\n`PgSearchScan`.\n\n## Why\n\nBecause otherwise it's necessary to differentiate tables by inspecting\ntheir filters, which is error prone.\n\n## Tests\n\nTons of regress changes; no semantic changes.",
          "timestamp": "2026-08-19T20:08:21-07:00",
          "tree_id": "ff181690bd989f2fc653e2071d784668ac3b21ae",
          "url": "https://github.com/paradedb/paradedb/commit/ddf7f2f06fd7e6fffd7c7a35d5623c11db7b89a0"
        },
        "date": 1787196758216,
        "tool": "customBiggerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) QPS",
            "value": 509.1836394546485,
            "unit": "QPS"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "mdashti@gmail.com",
            "name": "Moe",
            "username": "mdashti"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a1158b82f1ffd9deeafa7c4633afd516ff897dbb",
          "message": "perf: allocate the per-segment EXPLAIN info slots only where used (#6004)\n\nThis PR allocates the per-segment EXPLAIN info slots only for scans that\npublish them.\n\n## Why\n\n`amestimateparallelscan` sizes the parallel index-scan DSM for\n`u16::MAX` segments sight unseen below PG18, and the layout allocated\n`SEGMENT_INFO_MAX_PER_SEG` (1024) bytes per segment unconditionally: a\n~66MB estimate per parallel index scan. Only basescan's Top-K workers\npublish that telemetry (`publish_segment_info` / `take_segment_info`);\nthe AM index scan and the MPP launches never touch it.\n\n## What\n\n- `ParallelScanPayloadLayout` takes `with_segment_info`; the info\nregions are zero-length when off.\n- `ParallelScanArgs` carries the flag: on for BaseScan (which sizes and\npopulates from the same args), off for the JoinScan and AggregateScan\nMPP launches and the AM index scan. The PG15-17 estimate drops to ~2MB,\ndominated by the 16-byte segment ids.\n- `set_segment_info` / `take_segment_info` no-op when the layout has no\nslots, so a misrouted publish can't index past a zero-length region.\n\nThe estimate below PG18 stays a blind `u16::MAX` guess; sizing it from\nthe real segment count needs the relation, which only the PG18 signature\nprovides.",
          "timestamp": "2026-08-20T01:49:03-07:00",
          "tree_id": "fd871fe38fa58ba333797e6d0eeaf72d9b56c287",
          "url": "https://github.com/paradedb/paradedb/commit/a1158b82f1ffd9deeafa7c4633afd516ff897dbb"
        },
        "date": 1787217585155,
        "tool": "customBiggerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) QPS",
            "value": 504.41651944935165,
            "unit": "QPS"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "mdashti@gmail.com",
            "name": "Moe",
            "username": "mdashti"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "98c3378d167341dfdc736cd4a3126ef554205f84",
          "message": "feat: computed global partition boundaries for `CREATE INDEX`. (#5991)\n\n# Ticket(s) Closed\n\n- Closes #5736\n\n## What\n\nThe `CREATE INDEX` leader now computes global partition boundaries for a\n`partition_by` index and passes them to the parallel build workers. The\nboundaries are a recursive KD-tree over the `partition_by` fields, built\nonce from a heap sample. Workers deserialize the tree and log it at\n`DEBUG1`; routing on it is #5737.\n\n## Why\n\nEach parallel worker gets an arbitrary slice of the heap. If workers\npicked boundaries from their own tuples, segments wouldn't line up and\nlater merges would fix the edges. One set of boundaries fixed before any\nworker starts keeps a fresh index's segments aligned.\n\n## How\n\n- `index/kdtree.rs` (new, Postgres-free): `KdTree::from_sample` splits\nrecursively. Each cut is the quantile that gives both children a share\nof the sample proportional to their leaves; the dimension is the one\nspanning the widest slice of its global distribution (by rank, so mixed\ntypes compare), ties to the earlier field. Low-cardinality data can\nyield fewer than `target` leaves. Routing matches\n`RangePartitioning::partition_bounds` (NULL and `< split` left, `>=\nsplit` right, in-order leaves); in one dimension it *is* a\n`RangePartitioning`. `route`/`partition_bounds`/`partition_count` are\nthe #5737 API.\n- `postgres/build_partitioning.rs` (new): the leader samples the heap,\nnot `pg_statistic`. `BlockSampler` over <= 4096 blocks, reservoir to 30k\nrows (the `ANALYZE` size), converted through the writer's own path so\nexpression/aliased fields work.\n- `build_parallel.rs`: leaf count is `adjusted_target_segment_count`.\nThe tree ships as a binary Vec.\n\n## Tests\n\n- `kdtree.rs` and `pdb_owned_value.rs` unit test\n- `build_partitioning.rs` `pg_test`s",
          "timestamp": "2026-08-20T14:28:52-07:00",
          "tree_id": "3aaea0e0306b0d2236a8c0128d6e972f0038d5e6",
          "url": "https://github.com/paradedb/paradedb/commit/98c3378d167341dfdc736cd4a3126ef554205f84"
        },
        "date": 1787262751514,
        "tool": "customBiggerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) QPS",
            "value": 526.4666666666667,
            "unit": "QPS"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "142809952+aryanpatel-ctrl@users.noreply.github.com",
            "name": "aryanpatel-ctrl",
            "username": "aryanpatel-ctrl"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1eadf7532c877f8420ae9080f62a968e043c7281",
          "message": "fix(mpp): align plain EXPLAIN with serial fallback when MPP cannot launch (#5822)\n\n## Summary\n- Fixes [#5784](https://github.com/paradedb/paradedb/issues/5784): when\ntask discovery finds fewer than 2 producer tasks, plain `EXPLAIN`\nrebuilds and renders the serial plan instead of a cap-sized distributed\nshape.\n- Shares the launch gate (`mpp_plan_has_data_parallelism`) across\nJoinScan and AggregateScan, matching plan-first MPP launch behavior from\n#5756.\n- Extends `mpp_worker_sizing` to assert the 1-segment plain-EXPLAIN\nserial contract.\n\n## Test plan\n- [x] `mpp_worker_sizing` regress\n- [x] 1-segment join: plain EXPLAIN has no `RoundRobinBatch` /\n`SortPreservingMergeExec`\n- [x] 1-segment join: EXPLAIN ANALYZE has no `MPP Launch` line\n- [x] 2-segment join still launches `workers=2` under an oversized cap",
          "timestamp": "2026-08-20T17:30:20-04:00",
          "tree_id": "3f7b3f45ca6495f94b1d6633bedf18da1ab80ae1",
          "url": "https://github.com/paradedb/paradedb/commit/1eadf7532c877f8420ae9080f62a968e043c7281"
        },
        "date": 1787264639043,
        "tool": "customBiggerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) QPS",
            "value": 546.2333333333333,
            "unit": "QPS"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "70322560+mehrdad3301@users.noreply.github.com",
            "name": "Mehrdad Mahabadi",
            "username": "mehrdad3301"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "a5a85388a4b99a39baed12c5d300ee88dc42f06a",
          "message": "feat: Push down ORDER BY range into the index (#2688) (#5791)\n\nFixes #2688\n\nPushes `ORDER BY` on Postgres range columns into the BM25/paradedb index\nTopK path. `SortByRange` reads the indexed bound sub-columns and\ncompares them using the same ordering as Postgres `range_cmp`.\n\n**Limitations**\n- Range columns must be the **leading** `ORDER BY` key; later keys fall\nback to Postgres sorting.\n- Only raw range columns are supported (not `lower(range_col)` or other\nexpressions).\n\n**Mapping**\nEmpty ranges sort first, unbounded lowers before finite lowers,\nunbounded uppers after finite uppers, and inclusive/exclusive endpoints\ntie-break like `range_cmp`.\n\n---------\n\nCo-authored-by: Cursor <cursoragent@cursor.com>\nCo-authored-by: Mohammad Dashti <mdashti@gmail.com>",
          "timestamp": "2026-08-20T16:51:32-07:00",
          "tree_id": "7c778fa3068610ee989c53feecc39c9bf87eceb7",
          "url": "https://github.com/paradedb/paradedb/commit/a5a85388a4b99a39baed12c5d300ee88dc42f06a"
        },
        "date": 1787271420889,
        "tool": "customBiggerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) QPS",
            "value": 466.05113162894565,
            "unit": "QPS"
          }
        ]
      }
    ],
    "benchmarker hn-ci (latency)": [
      {
        "commit": {
          "author": {
            "email": "james.sewell@gmail.com",
            "name": "James Sewell",
            "username": "jamessewell"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1696390d10ad0772db19a7918a21d89803ff4d26",
          "message": "ci: only post the benchmarker summary comment on PRs (#6005)\n\nFollow-up to #5850, aligning the benchmarker with the benchmark-queries\n/ benchmark-stressgres conventions.\n\n- Summary comments are PR-only; nothing posts on pushes to main (main\nruns are tracked on the gh-pages charts). Compare tables come from\ngithub-action-benchmark's comment-always.\n- One tracked series instead of two: per-run mean + p50/p90/p95/p99\nlatency under a single customSmallerIsBetter publish, like queries. The\nk6 scripts are closed-loop, so mean ms carries the QPS signal (QPS = VUs\n/ mean latency); this halves the publish steps and PR comments.\n- Switched to the paradedb github-action-benchmark fork used by the\nother benchmark workflows (shallow-clones only the gh-pages branch).\n- Fixed a masked failure: with two publishes, the second one's gh-pages\nclone always failed on the non-empty ./benchmark-data-repository left by\nthe first, and continue-on-error hid it, so no latency history ever\nreached gh-pages. Now moot with a single publish, and the cleanup still\nruns before it.",
          "timestamp": "2026-08-21T13:12:54+12:00",
          "tree_id": "39bf4ea7592d99da81c362269c4af159c356ce01",
          "url": "https://github.com/paradedb/paradedb/commit/1696390d10ad0772db19a7918a21d89803ff4d26"
        },
        "date": 1787276285419,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 2.122381672851844,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 2.03,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.62,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.729,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.88,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "mithun.cy@gmail.com",
            "name": "Mithun Chicklore Yogendra",
            "username": "mithuncy"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b13e9670f0e2e66028a22eb4930141866837b07b",
          "message": "fix: respect collation semantics in AggregateScan grouping (#5703)\n\n# Ticket(s) Closed\n\n- None. Follow-up to #5180.\n\n## What\n\nAggregateScan declines GROUP BY pushdown when it cannot preserve\nPostgreSQL's\ngrouping semantics: nondeterministic collations, `GROUPING SETS`, and\nGROUP BY\nwithout verifiable pathkeys fall back to PostgreSQL. Deterministic\ncollations\n(including ICU like `en-US`) stay eligible. Declined `pdb.agg()` queries\nemit\na planner WARNING naming the reason.\n\n## Why\n\nPostgreSQL groups with collation-aware equality; ParadeDB's backends\ngroup by\nbytes. With a case-insensitive collation:\n\n```text\nElectronics | 1        electronics | 2\nelectronics | 1   vs.  (correct)\n```\n\nWrong groups cannot be repaired above the scan. Separately, `GROUPING\nSETS`\nsilently dropped the grand-total row — a grouping-shape bug the same\neligibility gate now catches, unrelated to collations.\n\n## How\n\nGrouping needs collation *equality*, not *ordering*: deterministic\ncollations\nbreak ties bytewise, so their grouping pushes down while their ORDER BY\nstays\nwith PostgreSQL. A new shared module `collation_semantics.rs` models\nboth\n(`CollationOperation::Equality` / `::Ordering`), replacing\n`orderby.rs::is_collation_pushdown_safe()` for all callers — including\n#5148's\nDISTINCT gates after merging main. `create_custom_path` declines the\nunsafe\nshapes before building any path; `pdb.agg()` declines warn first, then\nfail on\nthe placeholder as before.\n\n## Tests\n\nExtended `order_by_collation.sql`: deterministic ICU stays pushed down\nwith\n`pdb.agg()` executing; nondeterministic falls back and merges equivalent\nvalues; GROUPING SETS, constant-equality, hash-only, and mixed keys\ndecline\nwith correct results; each declined `pdb.agg()` warns with its reason.",
          "timestamp": "2026-08-21T08:14:37+05:30",
          "tree_id": "30787eb999c72c03cca092a44e2cd387c16006d5",
          "url": "https://github.com/paradedb/paradedb/commit/b13e9670f0e2e66028a22eb4930141866837b07b"
        },
        "date": 1787281748108,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.860179016598829,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.737,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.271,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.394,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.748,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "stuhood@paradedb.com",
            "name": "Stu Hood",
            "username": "stuhood"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ef3e38bb8d216544db715e5378429b0293dfbf9f",
          "message": "perf: Use predicate tagging for disjunctions. (#6010)\n\n## What\n\nReplaces `SearchPredicateUDF` with predicate tagging for evaluating\njoin-level search predicates (e.g. cross-table disjunctions such as\n`p.description @@@ 'laptop' OR s.description @@@ 'display'`) in the join\nand aggregate scans.\n\n## Why\n\nEvaluating join-level search predicates using UDFs\n(`pdb_search_predicate`) required:\n1. Shipping canonical segment IDs across logical and physical plan\nserialization boundaries.\n2. Special handling for visibility\n3. Computing and intersecting CTID sets using a UDF\n\nPredicate tagging simplifies the intersection into a per-segment bitmap\nlookup on the `DocId`, without needing to fetch or visibility check\nctids.\n\n## How\n\nExpose matches as synthetic boolean columns for DataFusion boolean\nexpressions, which are then evaluated as vectorized boolean operations\nafter the join.\n\n## Tests\n\nExpanded tests.\n\nIn local benchmarks, predicate tagging was 22x faster for low\nselectivity queries.\n\n---------\n\nCo-authored-by: paradedb-github-app[bot] <282009505+paradedb-github-app[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-21T08:11:18-07:00",
          "tree_id": "efd2c1616d7338a807bf2ec3e48e88690164ee0c",
          "url": "https://github.com/paradedb/paradedb/commit/ef3e38bb8d216544db715e5378429b0293dfbf9f"
        },
        "date": 1787326541050,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.812193764870972,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.703,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.222,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.392,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.672,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "ming.ying.nyc@gmail.com",
            "name": "Ming",
            "username": "rebasedming"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1173b5fa60ad3d8beeb01d6d485e4da1d956d617",
          "message": "ci(benchmarks): add pgvectorscale (diskann) as a cohere index variant (#5745)\n\nReauthors #5588 against the sweep-based CI that replaced its fixed\n`[params]`. Adds pgvectorscale StreamingDiskANN as a fifth cohere arm,\nrun via the `benchmark-cohere-pgvectorscale` label or the\n`pgvectorscale` dispatch choice.\n\nEach arm sweeps whichever GUC actually binds it, and every ladder ends\nat that GUC's hard maximum — verified against the extension's GUC\nregistration in 0.9.0 (`query_rescore` max 1000,\n`query_search_list_size` max 10000; #5588 stopped search_list_size at\n4000):\n\n| arm | swept GUC | ladder |\n|---|---|---|\n| unfiltered | `diskann.query_rescore` | 50 → 1000 |\n| 10pct | `diskann.query_search_list_size` | 200 → 10000 |\n| 1pct | `diskann.query_search_list_size` | 500 → 10000 |\n\n**The filtered arms cannot reach 90% on the default SBQ build.**\nFiltering is post-filter streaming, so only the ~10%/1% of the beam\npassing the predicate survives, and at most 1000 candidates are ever\nexact-rescored — with rescore pinned at that maximum, beam width is the\nonly lever left. Ending the ladders at the ceiling lets the sweep's\nexisting unreachable-target fallback report the best achievable point\n(flagged ⚠️) rather than a fabricated one. Uncompressed `storage_layout\n= plain` would lift them but is far too slow to build in CI. This arm is\ndeliberately **not** iso-recall with the others; that is the property\nbeing surfaced.\n\nSupersedes #5588.",
          "timestamp": "2026-08-21T12:05:37-07:00",
          "tree_id": "31d1103b88b59d2e32d3804dcec27c056bb087e6",
          "url": "https://github.com/paradedb/paradedb/commit/1173b5fa60ad3d8beeb01d6d485e4da1d956d617"
        },
        "date": 1787340584343,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.8296011948755917,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.708,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.192,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.327,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.568,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "rjhallsted@gmail.com",
            "name": "RJ Barman",
            "username": "barbarj"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "ff880e56c7a137931e7073e29c14007ca0aabe5a",
          "message": "chore: Update to df55-based df-d and fix api changes (#6015)\n\n## What\n\nUpdate to `datafusion-55`.\n\n## Tests\n\nBenchmarks are neutral.\n\nRegress tests show some lost dynamic filters due to\nhttps://github.com/apache/datafusion/pull/24045, which is necessary for\ncorrectness.\n\n---------\n\nCo-authored-by: paradedb-github-app[bot] <282009505+paradedb-github-app[bot]@users.noreply.github.com>\nCo-authored-by: Stu Hood <stuhood@gmail.com>",
          "timestamp": "2026-08-21T12:42:44-07:00",
          "tree_id": "12af687f821e5cd94415531f6c50b3cf84f92a10",
          "url": "https://github.com/paradedb/paradedb/commit/ff880e56c7a137931e7073e29c14007ca0aabe5a"
        },
        "date": 1787342918582,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.9089562423697302,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.771,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.363,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.487,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.818,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "mdashti@gmail.com",
            "name": "Moe",
            "username": "mdashti"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "12ddb8a9e2912c6ae86a797df8bd1b97383e8326",
          "message": "fix(mpp): replay the leader's segment view in every parallel reader (#5993)\n\nThis PR makes every reader a query opens for one index source replay the\nsame segment view, so packed `DocAddress`es stay valid across processes.\n\nCloses #5988.\n\n## Why\n\nStressgres hit `remote task 2.0 failed: range end index\n18446744073709551613 out of range for slice of length 8` on the JoinScan\nMPP path. Packed `(segment_ord, doc_id)` addresses are only meaningful\nagainst the reader that packed them, but the consumer side (a rebuilt\n`FFHelper` behind a network boundary, the leader-hosted\n`VisibilityFilterExec`, `SearchPredicateUDF`) opens its own reader over\nthe same segment id set. Two opens don't expose the same `DocId` space:\n\n- A mutable segment is materialized per open, bounded by the `(max_doc,\nnum_deleted_docs)` its meta entry holds at that moment. Concurrent DML\nmoves that bound between the producer's open and the consumer's, so a\n`doc_id` past the shorter view overflows tantivy's bitpacker, or\nresolves to the wrong ctid when the counts happen to match.\n- Segment ordinals come from an unstable doc-count sort, so they can\npermute between opens.\n\n## What\n\n- `MvccSatisfies::ParallelWorker` now has a `SegmentView`: the origin\nreader's segments in ordinal order, plus each mutable segment's\n`(max_doc, num_deleted_docs)` bound. `load_metas` rewinds mutable\nentries to that bound (the log is append-only, so it always is a prefix)\nand orders segments by the view.\n- `ParallelScanState` sends every source's view; the JoinScan leader's\nproviders, `SearchPredicateUDF`, the worker scans, and the rebuilt\nresolvers all replay that view.\n- `paradedb.aggregate` workers keep an id-only view; their addresses\nnever leave the process.\n\n## Tests\n\nA `pg_test` for the view replay\n(`test_segment_view_replays_origin_reader`), an `mpp_joinscan_mutable`\nregress covering the worker-hosted and leader-hosted shapes, and a\nconcurrent integration test (`mpp_joinscan_concurrent.rs`) that fails on\nthe base commit within a second and also catches the silent wrong-result\nvariant.",
          "timestamp": "2026-08-22T02:17:40-07:00",
          "tree_id": "55a004f381a03edc0e6a5e122a97bdab1fa801a3",
          "url": "https://github.com/paradedb/paradedb/commit/12ddb8a9e2912c6ae86a797df8bd1b97383e8326"
        },
        "date": 1787391697727,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 2.269713915166297,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 2.153,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.816,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.908,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 3.058,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "ming.ying.nyc@gmail.com",
            "name": "Ming",
            "username": "rebasedming"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e9491e6b4cc67e7d7d1706fcd1e8bc394eadc34f",
          "message": "ci(benchmarks): stop recall sweeps once the top target is reached (#6028)\n\nRecall sweeps measure every value in the ladder even after a point\nreaches r99, the highest recall target. Since values are ordered\ncheapest first and recall rises monotonically with these knobs, every\ntarget already has its cheapest qualifying point by then — probing the\nlarger values only burns runner time.\n\nThis breaks out of the sweep loop after the first value that reaches the\ntop target, and documents the cheapest-first ordering requirement on\n`SweepConfig.values`.",
          "timestamp": "2026-08-22T19:23:24-07:00",
          "tree_id": "9f2b9a833af20e3f74f1d8bb2abb442cfcb0446e",
          "url": "https://github.com/paradedb/paradedb/commit/e9491e6b4cc67e7d7d1706fcd1e8bc394eadc34f"
        },
        "date": 1787453206319,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.7539633764545914,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.652,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.089,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.244,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.382,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "21990816+philippemnoel@users.noreply.github.com",
            "name": "Philippe Noël",
            "username": "philippemnoel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "cc3dfcab58eb6a14179d639ad1e97f5369297f66",
          "message": "docs: refresh repository guidance and fix copy (#6033)\n\n## Summary\n- correct documentation spelling, capitalization, grammar, and the 2026\ncopyright year\n- align regression-test and Stressgres commands with the current CLIs\nand repository layout\n- replace obsolete Mintlify CLI instructions\n- repair JoinScan links after source files moved and replace stale\ncommit-pinned references with durable relative links\n- refresh Docker and Antithesis guidance\n- clarify the qgen.rs link label while retaining its correct target at\ntests/tests/qgen.rs\n- align Debian, Ubuntu, and RHEL package descriptions with current\nproduct messaging from #5909\n- clarify pgvector requirements in the pg_search development README and\nintegration-test fixture\n- update executable deployment examples to the verified 0.25.3 release\ntags\n\n## Audit scope\nReviewed every tracked README, including the GitHub Actions upgrade-test\nREADME, plus CONTRIBUTING.md, SECURITY.md, and CODE_OF_CONDUCT.md\nagainst current source files, manifests, workflows, and tool help.\n\n## Testing\n- targeted prek checks for every changed file\n- cargo pgrx regress --dry-run --auto pg18 PREFIX_your_test\n- cargo run -p stressgres -- --help\n- local-link resolution check across all audited files\n- verified the v0.25.3 release and both referenced Docker Hub tags\n\nStandalone actionlint reports pre-existing findings elsewhere in the\npublish workflows; the imported sections introduce no new findings.",
          "timestamp": "2026-08-23T13:01:18-04:00",
          "tree_id": "62d8c6c26a02f4f98d9e697298d0efc33f26f505",
          "url": "https://github.com/paradedb/paradedb/commit/cc3dfcab58eb6a14179d639ad1e97f5369297f66"
        },
        "date": 1787505898227,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.9869596256684505,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.9,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.498,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.694,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.993,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "21990816+philippemnoel@users.noreply.github.com",
            "name": "Philippe Noël",
            "username": "philippemnoel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "40a0c232be1ce4855e18b720c5b4fcc1bfe2b568",
          "message": "chore: refresh documentation and version references (#6034)\n\n## Summary\n- update Antithesis manifest application labels and monitoring\npredicates from 0.25.0 to 0.25.3\n- fix a broken changelog link and documentation copy issues\n- update django-paradedb from 0.12.0 to 0.13.0 and actions/cache from v4\nto v6\n\n## Validation\n- `prek run --files` on all changed files\n- `mint validate`\n- `mint broken-links`\n- Prettier, codespell, and `git diff --check`\n\n## Audit notes\n- historical changelog/migration version references remain unchanged\n- the Antithesis manifest is rendered from ParadeDB Helm chart 0.18.3\nwith manual overlays; updating it to the current chart should be handled\nas a dedicated regeneration and review",
          "timestamp": "2026-08-23T13:42:25-04:00",
          "tree_id": "411cb3c049dd156dda3a3ad21e735705a0de5977",
          "url": "https://github.com/paradedb/paradedb/commit/40a0c232be1ce4855e18b720c5b4fcc1bfe2b568"
        },
        "date": 1787508396555,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.8836379714738605,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.75,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.354,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.499,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.739,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "21990816+philippemnoel@users.noreply.github.com",
            "name": "Philippe Noël",
            "username": "philippemnoel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e351f6cc818a2ab88965f8997da360c9a33b600a",
          "message": "docs: refresh documentation and repository configuration (#6036)\n\n## Summary\n\n- clarify custom scan eligibility, filtered vector search, horizontal\nscaling, and Elasticsearch transaction behavior\n- improve Kubernetes and CloudNativePG production deployment guidance\n- refresh the release process, changelog wording, PostgreSQL 18 Nix\nexample, and development comments\n- organize and prune Codecov, Codespell, Docker, Git, and Prettier\nignore lists\n- clean up the root Cargo manifest and local pg_search helper scripts\n\n## Validation\n\n- `prek run --files` on the changed files\n- `cargo metadata --no-deps --format-version 1`\n- `shellcheck scripts/*.sh`\n- `mint validate`\n- `mint broken-links`",
          "timestamp": "2026-08-23T15:08:37-04:00",
          "tree_id": "ac4527a0921a0e4f7b0f5d0265d3149ed66edc01",
          "url": "https://github.com/paradedb/paradedb/commit/e351f6cc818a2ab88965f8997da360c9a33b600a"
        },
        "date": 1787513550737,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.8680196177062327,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.741,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.332,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.496,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.628,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "21990816+philippemnoel@users.noreply.github.com",
            "name": "Philippe Noël",
            "username": "philippemnoel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d7ff580c75e761f5c405d8585b37f6d6c23e6092",
          "message": "docs: refresh architecture and development guidance (#6038)\n\n## Summary\n\n- correct the architecture guide's description of mutable-segment\nbuffering and PostgreSQL parallel execution\n- refresh integration-test setup, dependency organization, paths, and\nshell examples\n- audit Stressgres helpers, CLI guidance, package metadata, and\nAntithesis scripts\n- fix Stressgres argument handling and Cargo invocation, plus a macOS\nBash compatibility issue in the Antithesis consistency check\n- update `THANKYOU.md` with pgvector, Lindera, DataFusion Distributed,\nand Apache Arrow\n- correct packaging and `pg_regress` terminology in `CONTRIBUTING.md`\n\n## Validation\n\n- repository commit hooks\n- `cargo test -p stressgres --no-default-features`\n- `cargo test --package tests --no-run`\n- `cargo fmt --all -- --check`\n- `bash -n` and `shellcheck` on the changed shell scripts\n- verified every Stressgres suite has a matching Antithesis setup script\n- `mint validate`\n- `mint broken-links`\n\n## References\n\n- [PostgreSQL parallel\nplans](https://www.postgresql.org/docs/current/parallel-plans.html)",
          "timestamp": "2026-08-23T17:00:23-04:00",
          "tree_id": "79e7aa2472e2d7ca420dd1c77fceaf6b03a946eb",
          "url": "https://github.com/paradedb/paradedb/commit/d7ff580c75e761f5c405d8585b37f6d6c23e6092"
        },
        "date": 1787521177225,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 2.1640804773339073,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 2.092,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.739,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.881,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 3.09,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "mdashti@gmail.com",
            "name": "Moe",
            "username": "mdashti"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "de6e2ebfe8c3bda48a5cc1e779c9848ac95040b7",
          "message": "feat(mpp): gate MPP behind a minimum source size (#5482)\n\n## Ticket(s) Closed\n\n- Closes #5329\n\n## What\n\nThis PR gates MPP behind a minimum estimated source size:\n`paradedb.mpp_min_rows`, default 500,000, with 0 disabling the gate.\n\n## Why\n\nThe MPP launch costs 13-18ms regardless of data size: worker spawn, plan\ndispatch, and per-worker index opens. On small queries that floor\ndominates whatever the parallel split saves. Measured on a 500K x 800K\njoin (release build, 4 workers), the crossover sits near 30ms of serial\nwork, about 300K driving rows: a selective anti-join runs 4.0ms serial\nvs 16.6ms under MPP, while a full-scan group-by runs 318ms serial vs\n82ms under MPP. Postgres has `min_parallel_table_scan_size` for the same\nreason; MPP had no analog. This is also the dominant share of the 0.24.3\nto 0.25.3 anti-join regression a customer reported.\n\n## How\n\nThe gate sits at the front of the launch path, the same point as the\nshort-launch serial fallback, so both reuse one serial path. Each source\ncounts the rows its `@@@` predicate is estimated to match, not the\nindex's document count: a selective query over a large index does little\nscan work, and the floor dominates it just the same. An unanalyzed\nsource falls back to its live document count, an upper bound, so missing\nstatistics err toward launching. The largest source stands for the scan;\nthe smaller sides ride along. Below the threshold the query runs the\nplain serial plan.\n\nThis gate is the `Row-capped` analog of BaseScan's #5150 policy table,\nand it reads the same planner match estimates. #5150's cost tier\n(`cost_test_limited`) doesn't transfer: BaseScan's parallelism is PG\nGather, so `parallel_setup_cost` honestly prices it, while the MPP\nlaunch floor has no PG cost-unit representation and JoinScan's\n`Flags::Force` path cost is fabricated. A cost comparison against those\nnumbers would be fake precision; if the floor gets priced later, the\ngate can graduate to a cost test.\n\nThe gate is a pure function of the planner estimates, shared between the\nlaunch and the plain-`EXPLAIN` plan rebuilds the same way #5822 shares\nthe producer-task floor, so the rendered plan agrees with the executed\nmode. An estimate the planner substituted from the index's total\ndocument count (Postgres expressions, heap filters) is discounted by\n`PARAMETERIZED_SELECTIVITY`, mirroring BaseScan, so prepared statements\non big indexes still gate. The default is calibrated at the measured\ncrossover with headroom; the GUC exists to tune it.\n\n## Tests\n\nRegression tests.",
          "timestamp": "2026-08-23T16:55:36-07:00",
          "tree_id": "77c61572da4eb096208e1777ec471191de03152c",
          "url": "https://github.com/paradedb/paradedb/commit/de6e2ebfe8c3bda48a5cc1e779c9848ac95040b7"
        },
        "date": 1787530752128,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.7490349843924897,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.639,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.069,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.261,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.451,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "21990816+philippemnoel@users.noreply.github.com",
            "name": "Philippe Noël",
            "username": "philippemnoel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "d297e61da2c2353a748fe6caf2fe23c898eccf06",
          "message": "chore: audit pg_search, Docker, and benchmarks (#6042)\n\n## Summary\n\n- refresh pg_search and pg_regress development guidance, remove the\nobsolete banner, and clean up stale regression TODOs\n- clarify generated versus hand-maintained Docker assets, complete the\nCloudNativePG extension-image example, and pin the property-test image\ndistro\n- align benchmark setup and CLI descriptions with current behavior and\nnarrow generated-result ignore rules\n- fix the benchmark CSV output filename and reject zero-run benchmark\ninvocations\n- protect generated pgBackRest configs containing AWS credentials with\nexclusive creation, mode 0600, and automatic cleanup\n\n## Validation\n\n- repository commit hooks\n- `cargo test -p benchmarks` (39 tests)\n- `cargo clippy -p benchmarks --all-targets -- -D warnings`\n- `cargo clippy -p pg_search --lib -- -D warnings`\n- `cargo fmt --all -- --check`\n- `cargo metadata --no-deps --format-version 1`\n- `cargo pgrx regress --dry-run` command verification\n- native ShellCheck and Bash syntax checks for Docker scripts\n- Docker Compose configuration validation\n- regenerated Dockerfiles from the published 0.25.3 packages and\nverified byte-for-byte template parity\n- Markdownlint, Prettier, and `git diff --check`\n\n## Audit notes\n\n- historical extension migrations and regression references were\nretained\n- open issue-linked TODOs were left unchanged\n- Docker-backed ShellCheck was unavailable because the local Docker\ndaemon was offline; native ShellCheck passed\n- full benchmark execution and Docker image builds were not run\n- `cargo test -p pg_search --lib` does not complete: the `pg_test` path\nlaunches a nested Cargo build against the same target directory and the\nouter process remains waiting after that build; no test failure was\nreported before termination",
          "timestamp": "2026-08-23T22:40:48-04:00",
          "tree_id": "8d844c3622ce7b3697bcdbec6b52a9973ff04a4f",
          "url": "https://github.com/paradedb/paradedb/commit/d297e61da2c2353a748fe6caf2fe23c898eccf06"
        },
        "date": 1787540720259,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.89207097349642,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.767,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.332,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.494,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.747,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "21990816+philippemnoel@users.noreply.github.com",
            "name": "Philippe Noël",
            "username": "philippemnoel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "b7262a75638c36e7e9ab3ff3dbc08bbe1f88ab1d",
          "message": "ci: audit GitHub automation and templates (#6044)\n\n## Summary\n\n- restore benchmark baseline publishing to `main` only and make manual\n`fail_on_error: false` effective\n- trigger benchmark runs when their local composite actions change\n- harden benchmark composite-action shell inputs and align the GitHub\nApp client-ID input name with its actual value\n- replace deprecated global `apt-key` usage with scoped PostgreSQL\nrepository keyrings and HTTPS package sources\n- repair issue and discussion links and route users to the core, ORM,\nand benchmark repositories with active issue trackers\n- reduce `FUNDING.yml` to the active GitHub Sponsors account and remove\nnonexistent discussion labels\n- refresh the benchmark source action description to match its actual\nbehavior\n\n## Validation\n\n- repository commit hooks\n- Prettier across `.github` YAML\n- Actionlint across all workflows, ignoring only known custom runner\nlabels, Actionlint's stale `create-github-app-token@v3` metadata, and\npre-existing inline ShellCheck findings\n- Actionlint with inline ShellCheck enabled for the changed benchmark\nworkflows\n- Python syntax compilation for `.github/actions` and `.github/scripts`\n- Bash syntax and ShellCheck for standalone `.github/scripts`\n- live verification of issue destinations and the `paradedb/charts`\nIssues setting\n- live verification of the GitHub Sponsors destination and repository\nlabels used by templates\n- `git diff --check`\n\n## Audit notes\n\n- generated code-snippet verification fixtures were treated as generated\nartifacts and were not hand-edited\n- action major-version updates remain managed by Dependabot\n- full benchmark, release, and publishing jobs require CI\ncredentials/infrastructure and were not run locally",
          "timestamp": "2026-08-23T23:42:36-04:00",
          "tree_id": "69fa91159263c72992b4308ca6f62fe5e301df8c",
          "url": "https://github.com/paradedb/paradedb/commit/b7262a75638c36e7e9ab3ff3dbc08bbe1f88ab1d"
        },
        "date": 1787544382896,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.8180154901120482,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.716,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.194,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.301,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.41,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "21990816+philippemnoel@users.noreply.github.com",
            "name": "Philippe Noël",
            "username": "philippemnoel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "81e7d38632bacafad455cde5ecf09bb694416c37",
          "message": "chore: audit docs configuration (#6045)\n\n## Summary\n- remove the obsolete Mintlify promotional search placeholder override\n- update the footer social link from `twitter.com` to `x.com`\n- remove the empty `.mintignore` file\n\n## Audit scope\nReviewed the full `docs/` tree for navigation coverage, metadata,\ninternal links, stale version and Postgres support claims,\nrelease/install examples, ORM package pins, legacy API references,\ntracked artifacts, and custom configuration. Historical changelogs and\nintentional roadmap/coming-soon language were left unchanged.\n\n## Validation\n- `git diff --check`\n- `prettier --check docs/override.js docs/docs.json`\n- `mint validate`\n- `mint broken-links`\n- commit-time prek hooks",
          "timestamp": "2026-08-24T00:30:46-04:00",
          "tree_id": "2d0f812deb84ba49dff0c5211eba8bf7c857a5a7",
          "url": "https://github.com/paradedb/paradedb/commit/81e7d38632bacafad455cde5ecf09bb694416c37"
        },
        "date": 1787547315846,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.928852729278901,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.797,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.447,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.61,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.786,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "21990816+philippemnoel@users.noreply.github.com",
            "name": "Philippe Noël",
            "username": "philippemnoel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "fd1ec5841aef3738ac7339ec2a2b8c890ccdcdaf",
          "message": "docs: update documentation URLs (#6052)\n\n## Summary\n\n- update ParadeDB documentation links from docs.paradedb.com to\nparadedb.com/docs\n- preserve every existing documentation path and anchor\n\n## Verification\n\n- confirmed representative replacement URLs resolve successfully\n- git diff --check\n- verified no obsolete documentation URLs remain, excluding the\nintentional legacy-host redirect rules in the website repository",
          "timestamp": "2026-08-24T16:31:41-04:00",
          "tree_id": "51abed1b88f4c0d42118c854f804f1617ae27e7b",
          "url": "https://github.com/paradedb/paradedb/commit/fd1ec5841aef3738ac7339ec2a2b8c890ccdcdaf"
        },
        "date": 1787605153298,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.9879533141595829,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.845,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.496,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.598,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.834,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "stuhood@paradedb.com",
            "name": "Stu Hood",
            "username": "stuhood"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "cd12adbf0bd58ef2e4307c19d15c55546a61f80c",
          "message": "feat: Add support for aggregate score joins. (#6024)\n\n## What\n\nAdds support for:\n* Aggregate score joins (without any Block-Max WAND dynamic filter\ncalculation, as described in #5301)\n* Calculation of scores for disjunctive joins under predicate tagging\n\n## Why\n\nAs described in #5961, we have been remiss in not tracking disjunctive\njoins in our benchmarks. But before tracking them, we need them to be\nfully supported, with accurate scores.\n\nThis change fills out support for ordering by a sum of scores, and adds\nsupport for scoring disjunctive joins.\n\n## How\n\n* Added expression matching for simple \"sum of scores\" patterns, and\nimproved planner warnings for other cases.\n* Fixed planning of `SegmentedTopK` to ensure that it is never\naccidentally pushed down through a join, or through a node with a schema\nthat it does not recognize.\n* Moved to lazily tagging and scoring blocks of rows in `BatchScanner`\nto avoid needing segment-sized score arrays.\n\n## Tests\n\nOverhauled `joinscan_sortby_score.sql` to use comprehensible per-table\nscores, and then validate that sums across those scores make sense under\nconjunction and disjunction.\n\nAdditionally, `join_distinct_expr.out` shows many changes due to the fix\nin `SegmentedTopK` planning.\n\n---------\n\nCo-authored-by: paradedb-github-app[bot] <282009505+paradedb-github-app[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-24T15:14:35-07:00",
          "tree_id": "773179c2a83f9dbb9d24c2947f379b9f27648312",
          "url": "https://github.com/paradedb/paradedb/commit/cd12adbf0bd58ef2e4307c19d15c55546a61f80c"
        },
        "date": 1787613322565,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.8444987576096303,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.748,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.218,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.33,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.542,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "stuhood@paradedb.com",
            "name": "Stu Hood",
            "username": "stuhood"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4696391e4f03afde8eae256cd320a5843819fdc2",
          "message": "chore: Prepare `0.25.4`. (#6056)\n\nCo-authored-by: paradedb-github-app[bot] <282009505+paradedb-github-app[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-24T16:48:04-07:00",
          "tree_id": "798879ff9d41f74fb2638d38af82b4187c792c45",
          "url": "https://github.com/paradedb/paradedb/commit/4696391e4f03afde8eae256cd320a5843819fdc2"
        },
        "date": 1787616644891,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 2.275230616302168,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 2.172,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.857,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.971,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 3.115,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "stuhood@paradedb.com",
            "name": "Stu Hood",
            "username": "stuhood"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "4696391e4f03afde8eae256cd320a5843819fdc2",
          "message": "chore: Prepare `0.25.4`. (#6056)\n\nCo-authored-by: paradedb-github-app[bot] <282009505+paradedb-github-app[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-24T16:48:04-07:00",
          "tree_id": "798879ff9d41f74fb2638d38af82b4187c792c45",
          "url": "https://github.com/paradedb/paradedb/commit/4696391e4f03afde8eae256cd320a5843819fdc2"
        },
        "date": 1787623460723,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.9500562372859125,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.815,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.45,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.569,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.846,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "21990816+philippemnoel@users.noreply.github.com",
            "name": "Philippe Noël",
            "username": "philippemnoel"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "e0083a5846437586684ef5c5a8cc0898162610f6",
          "message": "test(stressgres): expand planner and topology coverage (#5889)\n\n## What\n\nOur Stressgres workloads were extremely outdated. I discovered this\nwhile adding \"plan shape assertions\" to them, which was recommended by\nCarl Sverre from Antithesis. They existed from pre-AggregateScan and\npre-JoinScan era, and even for the BaseScan they only covered some\ncases. This PR revamps them to be more up-to-date and have wider\ncoverage, which notably caught an MPP bug that had previously slipped\nthrough.\n\nThe performance alerts can be ignored for this PR, since this revamps\nthe suites altogether and previous values are now meaningless.\n\nCloses (partially) #5500. I commented future area of work on that issue,\nwhich is why I'm not closing it fully. More context:\n\n## Planner coverage\n\nThe single-node planner suite now asserts coverage for:\n\n- ParadeDB Base Scan, including normal, parallel, columnar, unordered\nTop K, key-ordered Top K, and score-ordered Top K paths\n- Aggregate Scan, including plain counts, grouped aggregates, and\n`pdb.agg`\n- JoinScan\n- PostgreSQL fallbacks, including Index Scan, Index Only Scan, Seq Scan,\nand Sort over a ParadeDB Base Scan\n\nAssertions are attached to the executor state that actually represents\neach optimized path, including Top K coverage under `TopKScanExecState`.\n\n## Suites and topologies\n\n- Renames suites around the behavior they validate:\n  - `single-node-planner-paths.toml`\n  - `bulk-update-merge-pressure.toml`\n  - `logical-replication-mixed-workload.toml`\n  - `logical-replication-fsm-merge-race.toml`\n- Adds `partitioned-table.toml` for partition pruning, parent/child scan\nplanning, aggregates, joins, and writes\n- Adds `logical-replication-multi-subscriber.toml` for one publisher\nwith two ParadeDB subscribers under mixed reads and writes\n- Narrows the FSM merge-race workload to paths relevant to that race\n- Removes the unused `vanilla-postgres.toml` suite and its references\n- Adds Antithesis entrypoints for every bundled suite, including\nindependent databases for the two logical-replication subscribers\n\nPhysical replication remains an enterprise-only topology:\n`paradedb-enterprise` already exercises its physical-replication and\ncombined physical/logical-replication suites in CI and Antithesis.\n\n## Tests\n\n`benchmark-stressgres` and `antithesis-stressgres` both pass error-free.",
          "timestamp": "2026-08-25T12:18:01-04:00",
          "tree_id": "c9794ea2e72745d63a40423e253a4bfc016ddf50",
          "url": "https://github.com/paradedb/paradedb/commit/e0083a5846437586684ef5c5a8cc0898162610f6"
        },
        "date": 1787676352917,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.779005631440202,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.683,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 2.119,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 2.348,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.582,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "james.sewell@gmail.com",
            "name": "James Sewell",
            "username": "jamessewell"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "3540c09ec21744ca430ce76e6475201c4a292c6f",
          "message": "ci: run the benchmarker suite on the metal benchmark runner (#6069)\n\nMoves `benchmark-benchmarker` from `m8gd.2xlarge` to `m8gd.metal-24xl`,\nthe same whole-host runner the queries and stressgres benchmarks already\nuse (\"chosen for its performance consistency across hosts\").\n\n## Why\n\nThe tracked `hn-ci` latency series swings ~±15% between runs on\nidentical code: the last 12 runs on main range from 1.75 ms to 2.28 ms\nmean latency, including docs-only commits, and this tripped a false\nregression alert on 4696391e4 (a version bump). The workload itself is\nflat run-to-run on dedicated hardware, so the variance is per-run\nenvironment. A `.2xlarge` is a 1/12th slice of a shared metal host:\nvCPUs are dedicated, but memory bandwidth and the system-level cache are\nshared with whoever else is on the box that run.\n\nA whole host removes the noisy neighbours, matching what the other\nbenchmark suites concluded.\n\n## What doesn't change\n\n- Core pinning is untouched and works identically on the same Graviton4\nsilicon: DB on cores 0-3, pgbouncer on 4, k6 tasksetted onto 5-7.\n- Still no EBS data volume; the metal host's local NVMe serves the same\nrole.\n\n## Notes\n\n- The series may show a small step (likely faster) at the first metal\nrun, since the benchmark cores now get the chip's system-level cache to\nthemselves. Alerts only fire on regressions, so no false page, but the\nhistory chart will have a seam.\n- Runner cost per run goes up (~$5.40/hr vs ~$0.45/hr on-demand), the\nsame trade the other benchmark workflows accepted.\n\n**Testing:** add the `benchmark-benchmarker` label to run on this PR;\nre-dispatching on the same commit a few times afterwards will show\nwhether metal flattens the spread.\n\n🤖 Generated with [Claude Code](https://claude.com/claude-code)",
          "timestamp": "2026-08-25T12:23:36-04:00",
          "tree_id": "9854d10ba881cf37740c2db421a18e7982235e0b",
          "url": "https://github.com/paradedb/paradedb/commit/3540c09ec21744ca430ce76e6475201c4a292c6f"
        },
        "date": 1787676494676,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.6012192193809085,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.538,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 1.862,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 1.903,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.065,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "stuhood@paradedb.com",
            "name": "Stu Hood",
            "username": "stuhood"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "1da2ad788cb80fb3ad83e5879d4cab8e0cd1a56f",
          "message": "chore: Post release version bump. (#6061)\n\nCo-authored-by: paradedb-github-app[bot] <282009505+paradedb-github-app[bot]@users.noreply.github.com>",
          "timestamp": "2026-08-25T09:38:27-07:00",
          "tree_id": "889fef766f10e2aa5724c8c3e655c8fd9fbdc170",
          "url": "https://github.com/paradedb/paradedb/commit/1da2ad788cb80fb3ad83e5879d4cab8e0cd1a56f"
        },
        "date": 1787677746287,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.6543024742841226,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.589,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 1.921,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 1.972,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.263,
            "unit": "ms"
          }
        ]
      },
      {
        "commit": {
          "author": {
            "email": "mdashti@gmail.com",
            "name": "Moe",
            "username": "mdashti"
          },
          "committer": {
            "email": "noreply@github.com",
            "name": "GitHub",
            "username": "web-flow"
          },
          "distinct": true,
          "id": "400f131982cfe708ae9b48e8fcf9f4a1839c3215",
          "message": "feat: partitioned index build execution (#6077)\n\n## Ticket(s) Closed\n\n- Closes #5737\n\n## What\n\nThis PR adds partitioned `CREATE INDEX` execution for an index that\ndeclares `partition_by`. Each worker routes its rows onto the leader's\nkd-tree boundaries and writes one segment per cell, so every segment of\na fresh index stays inside one cell's bounds in `partition_by` space,\nwith no merges across workers.\n\nIt carries @devdattatalele's commits from #6012 unchanged, plus the two\nfollow-ups from the last review round.\n\n## Why\n\nSegment pruning on `partition_by` needs segments that don't straddle\ncell boundaries. A parallel scan hands each worker an arbitrary slice of\nthe heap, so a worker has to route every row it sees, and a cross-worker\nmerge would undo the alignment.\n\n## How\n\nPhase 1: the scan callback routes each row with the shared `KdTree` and\nspills only `(pid, ctid)` to a worker-local `bytea` tuplesort. Phase 2:\nthe sorted records re-fetch rows through `HeapDocFetcher` under a reused\nbuffer pin and index them cell by cell, one `SerialIndexWriter` alive at\na time. The sort and the writer split the worker budget. A cell boundary\nfinalizes a segment; an overfull cell merges its own segments in passes\nof at most `CELL_MERGE_FANIN`. The drain walks HOT chain roots to the\nlive tail, so it indexes what the inline callback would have.\n`CONCURRENTLY` skips boundary planning and takes the regular path.\n\nThree refactors land first: the `bytea` tuplesort wrapper moves out of\n`keyset.rs`, `HeapDocFetcher` moves out of `index_memory_segment`, and\n`merge_now` splits out of `try_merge`.\n\nPersisting each cell's `partition_bounds` into segment stats is a\nfollow-up, together with the query-side pruning that reads it. Phase-2\nread amplification for a `partition_by` uncorrelated with heap order is\na known follow-up too (see the discussion on #6012).\n\n## Tests\n\n`#[pg_test]`s in `build_parallel.rs`\n\n---------\n\nCo-authored-by: Devdatta Talele <devtalele0@gmail.com>",
          "timestamp": "2026-08-25T11:45:29-07:00",
          "tree_id": "78e6bec5fab50325abb7a6bc7ac19b0b213c7bcf",
          "url": "https://github.com/paradedb/paradedb/commit/400f131982cfe708ae9b48e8fcf9f4a1839c3215"
        },
        "date": 1787684787883,
        "tool": "customSmallerIsBetter",
        "benches": [
          {
            "name": "paradedb (single_topk) mean latency",
            "value": 1.6567064751405656,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p50 latency",
            "value": 1.601,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p90 latency",
            "value": 1.905,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p95 latency",
            "value": 1.952,
            "unit": "ms"
          },
          {
            "name": "paradedb (single_topk) p99 latency",
            "value": 2.108,
            "unit": "ms"
          }
        ]
      }
    ]
  }
}