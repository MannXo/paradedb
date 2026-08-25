# Fragmented Release Artifacts: Implementation Plan

This document outlines the step-by-step implementation plan for the fragment-based release artifact workflow described in `fragment-proposal.md`.

---

## 1. Directory Structure & Header Configuration

- Create directory `pg_search/sql/unreleased/` (with `.gitkeep`).
- Create directory `docs/changelog/unreleased/` (with `.gitkeep`).
- Create `.changelog_headers.json` in the root of the repository mapping categories/header keys to Markdown headers:

  ```json
  {
    "features": "## New Features 🚀",
    "performance": "## Performance Improvements 🚀",
    "stability": "## Stability Improvements 💪",
    "breaking": "## Breaking Changes 🚨",
    "docs": "## Documentation 📚",
    "other": "## Other Changes 🛠️"
  }
  ```

---

## 2. Assembly Scripts

### `scripts/assemble_sql.sh`

- Accepts `<target_version>` (e.g. `0.25.5`) and an optional `--transient` flag.
- Resolves the immediately preceding version dynamically (from highest git tag or existing upgrade scripts).
- Reads and sorts `.sql` files in `pg_search/sql/unreleased/` numerically by PR prefix.
- Concatenates the fragments into `pg_search/sql/pg_search--<prev>--<new>.sql` with the standard header:

  ```sql
  \echo Use "ALTER EXTENSION pg_search UPDATE TO '<new-version>'" to load this file. \quit
  ```

- If `--transient` is passed (used by PR upgrade CI), the unreleased fragment files are preserved.
- In release mode (without `--transient`), deletes the consumed `.sql` fragments.

### `scripts/assemble_changelog.sh`

- Accepts `<target_version>` (e.g. `0.25.5`).
- Reads `.changelog_headers.json` and parses all `.mdx` fragments in `docs/changelog/unreleased/`.
- Extracts YAML frontmatter (`header:` key) and Markdown body from each fragment.
- Groups entries under their corresponding section headers with standard frontmatter (`title: <new-version>`, `noindex: true`).
- Generates `docs/changelog/<new-version>.mdx`.
- Updates `docs/docs.json` navigation array to insert `"changelog/<new-version>"` into the Mintlify navigation hierarchy.
- Deletes the consumed `.mdx` fragments.

---

## 3. PR Automation & SchemaBot Update

- Update `.github/workflows/test-pg_search-schema.yml`:
  - If a schema diff is detected by `pg-schema-diff` between base and PR head, check for a matching fragment `pg_search/sql/unreleased/${PR_NUMBER}.*.sql`.
  - If the fragment exists, validate that all statements in the diff are present in the fragment using `.github/scripts/check_migration_diff.py`.
  - If the fragment is missing or statements do not match, fail CI with clear instructions and the expected SQL snippet.

---

## 4. Extension Upgrade CI Integration

- Update `.github/actions/test-pg_search-upgrade/action.yml`:
  - Before compiling `pg_search` on the PR branch, invoke `scripts/assemble_sql.sh "$VERSION" --transient`.
  - This ensures a physical `pg_search--<prior>--<current>.sql` file exists on the runner so `ALTER EXTENSION pg_search UPDATE TO '$VERSION'` can test the cumulative unreleased migrations against real databases.

---

## 5. Release Workflow (`.github/workflows/publish-github-release.yml`)

- Remove the manual `confirmation` input requirement.
- When triggered via `workflow_dispatch` with a target version:
  1. Generate GitHub App token (`PARADEDB_GITHUB_APP`) to allow bypassing branch protection for the release commit.
  2. Run `scripts/assemble_sql.sh <version>`.
  3. Run `scripts/assemble_changelog.sh <version>`.
  4. Bump `workspace.package.version` in `Cargo.toml` and run `cargo check` to update `Cargo.lock`.
  5. Commit the assembled artifacts, manifest updates, version bumps, and fragment deletions.
  6. Push the release commit directly to the release branch.
  7. Create and push the release tag, triggering downstream packaging and publishing workflows.

---

## 6. Update `RELEASE.md`

- Update `RELEASE.md` to document:
  - Developer workflow: creating `<PR_NUMBER>.<desc>.sql` in `pg_search/sql/unreleased/` and `<PR_NUMBER>.<category>.mdx` in `docs/changelog/unreleased/`.
  - Automated release process: triggering `publish-github-release.yml` without manual Release Preparation PRs or post-release empty migration PRs.

---

## 7. Update Contributor Documentation (`CONTRIBUTING.md` & `pg_search/README.md`)

- Update `CONTRIBUTING.md`:
  - Document the fragment creation requirement under the **Pull Request Workflow** section.
  - Explain when and how to add a changelog fragment (`docs/changelog/unreleased/<PR>.<category>.mdx`) for user-facing changes, with examples of categories and frontmatter format.
  - Explain when and how to add a SQL migration fragment (`pg_search/sql/unreleased/<PR>.<description>.sql`) for schema/DDL modifications, and how SchemaBot enforces this in CI.
- Update `pg_search/README.md`:
  - Add a note under **Modifying the Extension** linking to `CONTRIBUTING.md` and explaining how schema changes require adding unreleased SQL fragments.

---

## 8. Verification & Local Testing

- Test `scripts/assemble_sql.sh` and `scripts/assemble_changelog.sh` locally with sample fragments.
- Run `cargo check` across the workspace to ensure build hygiene.
