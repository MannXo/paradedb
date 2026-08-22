\echo Use "ALTER EXTENSION pg_search UPDATE TO '0.25.4'" to load this file. \quit

-- 0.25.3 -> 0.25.4: vector indexes moved to tantivy's index-level centroid
-- index format: flushed segments cluster against the one index-level centroid
-- set and mutable segments store flat (vector_num_centroids = 0), so
-- vector_info's vector_format column is dropped and the cluster columns are
-- no longer nullable. Statement text is the pg-schema-diff canonical form
-- verbatim (the schema checker compares statements textually).
DROP FUNCTION IF EXISTS vector_info(index regclass, field text);
CREATE OR REPLACE FUNCTION vector_info(index regclass, field text) RETURNS TABLE(segno text, vector_field text, vector_num_vectors pg_catalog."numeric", vector_num_centroids pg_catalog."numeric", vector_min_cluster_size pg_catalog."numeric", vector_max_cluster_size pg_catalog."numeric", vector_avg_cluster_size pg_catalog.float8, vector_empty_clusters pg_catalog."numeric", vector_total_memberships pg_catalog."numeric") AS 'MODULE_PATHNAME', 'vector_info_wrapper' LANGUAGE c STRICT;

-- The released 0.25.3 was cut from a release branch that predates #5903 (the
-- create_bm25_test_table -> create_paradedb_test_table rename) and #5960
-- (vector_clusters). On main both ride the 0.25.2--0.25.3 script, which the
-- upgrade path from the released 0.25.3 never runs, so they are repeated
-- here (idempotently) to cover it.
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

DROP PROCEDURE IF EXISTS paradedb.create_bm25_test_table(table_name pg_catalog."varchar", schema_name pg_catalog."varchar", table_type paradedb.testtable);
CREATE OR REPLACE PROCEDURE paradedb.create_paradedb_test_table(table_name VARCHAR DEFAULT 'bm25_test_table', schema_name VARCHAR DEFAULT 'paradedb', table_type paradedb.TestTable DEFAULT 'Items')
LANGUAGE c AS 'MODULE_PATHNAME', 'create_paradedb_test_table_wrapper';
