-- The chunked clustered-tier vector scan: with no flat segment at all,
-- a big-enough clustered tier splits into per-worker chunks that walk
-- the same router beam over disjoint segments, collecting against ONE
-- shared budget pool in the DSM; Gather Merge combines on the distance
-- column. Results must equal the serial plan's — the regress-sized
-- budget covers every cluster, so the pool's tail nondeterminism cannot
-- show.

CREATE EXTENSION IF NOT EXISTS vector;
CREATE EXTENSION IF NOT EXISTS pg_search;
-- Tiny fixtures: lower the centroid-training floor and the
-- parallel-worthiness floor.
SET paradedb.vector_min_training_rows = 1;
SET paradedb.vector_parallel_min_rows = 1;

CREATE TABLE pclust (
    id  int PRIMARY KEY,
    vec vector(3)
);

INSERT INTO pclust
SELECT g, ('[' || (g % 7)::text || ',' || (g % 5)::text || ',' || (g % 3)::text || ']')::vector
FROM generate_series(1, 52) g;

-- No mutable tier: without `mutable_segment_rows`, post-build inserts
-- flush straight to CLUSTERED segments, and the layer settings keep
-- them unmerged — two clustered segments, which the old gate would
-- have kept serial.
CREATE INDEX pclust_idx ON pclust
    USING paradedb (id, vec vector_l2_ops)
    WITH (
        key_field = id,
        background_layer_sizes = '0',
        layer_sizes = '100mb'
    );

INSERT INTO pclust
SELECT g, ('[' || (g % 7)::text || ',' || (g % 5)::text || ',' || (g % 3)::text || ']')::vector
FROM generate_series(53, 104) g;

-- Serial baseline.
SET max_parallel_workers_per_gather = 0;
SELECT id FROM pclust WHERE id @@@ pdb.all() ORDER BY vec <-> '[6,4,2]', id LIMIT 5;

-- Allow workers: the clustered tier alone must now split.
SET max_parallel_workers_per_gather = 2;

EXPLAIN (FORMAT TEXT, COSTS OFF, TIMING OFF)
SELECT id FROM pclust WHERE id @@@ pdb.all() ORDER BY vec <-> '[6,4,2]', id LIMIT 5;
SELECT id FROM pclust WHERE id @@@ pdb.all() ORDER BY vec <-> '[6,4,2]', id LIMIT 5;

-- Below the parallel-worthiness floor the scan stays serial.
SET paradedb.vector_parallel_min_rows = 1000000;
EXPLAIN (FORMAT TEXT, COSTS OFF, TIMING OFF)
SELECT id FROM pclust WHERE id @@@ pdb.all() ORDER BY vec <-> '[6,4,2]', id LIMIT 5;

DROP TABLE pclust;
