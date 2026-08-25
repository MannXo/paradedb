-- Bitmap intersection: custom scans intersect with other indexes via a
-- BitmapIndexScan child whose TIDBitmap is probed inside the heap filter.
--
-- The table and queries mirror the originating customer workload: a provider search
-- combining BM25 text/term predicates with a spatial radius filter and other
-- non-BM25-indexed predicates. Core GiST over `circle` stands in for PostGIS
-- (bounding-box leaves, always-recheck), and a `point <@ circle` predicate stands in
-- for ST_DWithin.

CREATE EXTENSION IF NOT EXISTS pg_search;
SET client_min_messages = warning;

SET paradedb.enable_filter_pushdown TO on;
SET max_parallel_workers_per_gather TO 0;

DROP TABLE IF EXISTS providers CASCADE;
CREATE TABLE providers (
    id BIGINT NOT NULL,
    description TEXT,
    gender TEXT,
    provider_type TEXT,
    specialty TEXT,
    location POINT,
    service_area CIRCLE
);

-- 10k providers on a 100x100 grid; every description mentions "cardiology" for a
-- constant BM25 driver, gender/type cycle for low selectivity, specialties cycle for
-- LIKE-prefix coverage.
INSERT INTO providers (id, description, gender, provider_type, specialty, location, service_area)
SELECT i,
       'provider offering cardiology and family medicine services ' || i,
       CASE WHEN i % 2 = 0 THEN 'female' ELSE 'male' END,
       CASE WHEN i % 10 = 0 THEN 'facility' ELSE 'individual' END,
       'specialty' || (i % 50),
       point(i % 100, i / 100),
       circle(point(i % 100, i / 100), 0.4)
FROM generate_series(0, 9999) i;

CREATE INDEX providers_bm25 ON providers
    USING bm25 (id, description, gender, provider_type) WITH (key_field = 'id');
CREATE INDEX providers_location ON providers USING gist (location);
CREATE INDEX providers_service_area ON providers USING gist (service_area);
CREATE INDEX providers_specialty ON providers (specialty text_pattern_ops);
VACUUM ANALYZE providers;

-- Q1 shape: term predicates via BM25, radius filter via the GiST index. The plan must
-- show the Bitmap Intersection and the child Bitmap Index Scan.
EXPLAIN (COSTS OFF)
SELECT id FROM providers
WHERE description @@@ 'cardiology'
  AND gender @@@ 'female'
  AND location <@ circle(point(50, 50), 5)
ORDER BY id;

SELECT count(*) AS q1_rows FROM (
    SELECT id FROM providers
    WHERE description @@@ 'cardiology'
      AND gender @@@ 'female'
      AND location <@ circle(point(50, 50), 5)
) q1;

-- Same rows with no intersection source: drop the GiST index so the same custom
-- scan falls back to plain heap filtering; results must be identical.
DROP INDEX providers_location;
SELECT count(*) AS q1_rows_no_bitmap FROM (
    SELECT id FROM providers
    WHERE description @@@ 'cardiology'
      AND gender @@@ 'female'
      AND location <@ circle(point(50, 50), 5)
) q1;
EXPLAIN (COSTS OFF)
SELECT id FROM providers
WHERE description @@@ 'cardiology'
  AND gender @@@ 'female'
  AND location <@ circle(point(50, 50), 5)
ORDER BY id;
CREATE INDEX providers_location ON providers USING gist (location);

-- Q2 shape: count(*) through the Aggregate Scan with the same predicates.
EXPLAIN (COSTS OFF)
SELECT count(*) FROM providers
WHERE description @@@ 'cardiology'
  AND gender @@@ 'female'
  AND location <@ circle(point(50, 50), 5);

SELECT count(*) AS q2_count FROM providers
WHERE description @@@ 'cardiology'
  AND gender @@@ 'female'
  AND location <@ circle(point(50, 50), 5);

-- AM-level recheck: circle_ops answers && through bounding boxes, so exact bitmap
-- membership still requires the original predicate on recheck-flagged pages. The
-- count must exclude bbox-only false positives.
SELECT count(*) AS overlap_count FROM providers
WHERE description @@@ 'cardiology'
  AND service_area && circle(point(50, 50), 1);
DROP INDEX providers_service_area;
SELECT count(*) AS overlap_count_no_bitmap FROM providers
WHERE description @@@ 'cardiology'
  AND service_area && circle(point(50, 50), 1);
CREATE INDEX providers_service_area ON providers USING gist (service_area);

-- Support-function derivation: LIKE prefix becomes a pattern-ops range on the child,
-- with the original clause kept as an always-filter.
EXPLAIN (COSTS OFF)
SELECT id FROM providers
WHERE description @@@ 'cardiology' AND specialty LIKE 'specialty1%'
ORDER BY id LIMIT 5;

SELECT count(*) AS like_count FROM (
    SELECT id FROM providers
    WHERE description @@@ 'cardiology' AND specialty LIKE 'specialty1%'
) q;

-- Cost gate: an unselective predicate (every row matches the prefix) makes the
-- bitmap useless, so the ledger must reject it: no Bitmap Intersection, and the
-- clause stays a plain always-filter.
EXPLAIN (COSTS OFF)
SELECT id FROM providers
WHERE description @@@ 'cardiology' AND specialty LIKE 'specialty%'
ORDER BY id LIMIT 5;

SELECT count(*) AS unselective_like_count FROM (
    SELECT id FROM providers
    WHERE description @@@ 'cardiology' AND specialty LIKE 'specialty%'
) q;

-- OR-positioned predicates must not be covered: no Bitmap Intersection in the plan.
EXPLAIN (COSTS OFF)
SELECT id FROM providers
WHERE description @@@ 'cardiology'
  AND (location <@ circle(point(50, 50), 5) OR specialty LIKE 'specialty1%')
ORDER BY id LIMIT 5;

-- Rescan: a generic prepared plan must rebuild the bitmap when the param changes.
SET plan_cache_mode = force_generic_plan;
PREPARE radius_search(float8) AS
SELECT count(*) FROM (
    SELECT id FROM providers
    WHERE description @@@ 'cardiology'
      AND gender @@@ 'female'
      AND location <@ circle(point(50, 50), $1)
) q;
EXECUTE radius_search(5);
EXECUTE radius_search(2);
EXECUTE radius_search(5);
EXECUTE radius_search(0);
DEALLOCATE radius_search;
RESET plan_cache_mode;

DROP TABLE providers CASCADE;
RESET paradedb.enable_filter_pushdown;
RESET max_parallel_workers_per_gather;
RESET client_min_messages;
