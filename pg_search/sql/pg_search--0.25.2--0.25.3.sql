\echo Use "ALTER EXTENSION pg_search UPDATE TO '0.25.3'" to load this file. \quit

-- 0.25.2 -> 0.25.3: add vector_clusters(index regclass, field text), the
-- per-segment per-cluster posting-list sizes and ball-bound radii, in cluster
-- order.
-- The CREATE below is the SchemaBot/pgrx canonical text verbatim (the schema
-- checker compares statements textually); the DROP keeps the script re-runnable.
DROP FUNCTION IF EXISTS vector_clusters(regclass, text);
CREATE  FUNCTION "vector_clusters"(
	"index" regclass, /* PgRelation */
	"field" TEXT /* String */
) RETURNS TABLE (
	"segno" TEXT,  /* String */
	"cluster_sizes" bigint[],  /* :: std :: option :: Option < Vec < i64 > > */
	"cluster_radii" real[]  /* :: std :: option :: Option < Vec < f32 > > */
)
STRICT
LANGUAGE c /* Rust */
AS 'MODULE_PATHNAME', 'vector_clusters_wrapper';

-- Rename paradedb.create_bm25_test_table to paradedb.create_paradedb_test_table
-- (#5903). The released 0.25.2 shipped without the rename, so it is repeated
-- here (idempotently) to cover upgrades from released 0.25.2.
DROP PROCEDURE IF EXISTS paradedb.create_bm25_test_table(table_name pg_catalog."varchar", schema_name pg_catalog."varchar", table_type paradedb.testtable);
CREATE OR REPLACE PROCEDURE paradedb.create_paradedb_test_table(table_name VARCHAR DEFAULT 'bm25_test_table', schema_name VARCHAR DEFAULT 'paradedb', table_type paradedb.TestTable DEFAULT 'Items')
LANGUAGE c AS 'MODULE_PATHNAME', 'create_paradedb_test_table_wrapper';

-- Vector indexes moved to tantivy's index-level centroid index format:
-- flushed segments cluster against the one index-level set and mutable
-- segments store flat (vector_num_centroids = 0), so vector_info's
-- vector_format column is dropped and the cluster columns are no longer
-- nullable. The CREATE below is the SchemaBot/pgrx canonical text
-- verbatim; the DROP keeps the script re-runnable.
DROP FUNCTION IF EXISTS vector_info(regclass, text);
CREATE  FUNCTION "vector_info"(
	"index" regclass, /* PgRelation */
	"field" TEXT /* String */
) RETURNS TABLE (
	"segno" TEXT,  /* String */
	"vector_field" TEXT,  /* String */
	"vector_num_vectors" NUMERIC,  /* AnyNumeric */
	"vector_num_centroids" NUMERIC,  /* AnyNumeric */
	"vector_min_cluster_size" NUMERIC,  /* AnyNumeric */
	"vector_max_cluster_size" NUMERIC,  /* AnyNumeric */
	"vector_avg_cluster_size" double precision,  /* f64 */
	"vector_empty_clusters" NUMERIC,  /* AnyNumeric */
	"vector_total_memberships" NUMERIC  /* AnyNumeric */
)
STRICT
LANGUAGE c /* Rust */
AS 'MODULE_PATHNAME', 'vector_info_wrapper';
