# ParadeDB Release Process

We use a single branch, `main`, for our development. Features are built on separate branches and merged into `main` via pull requests.

ParadeDB uses a **fragment-based workflow** for release artifacts:

- PRs that introduce user-facing changes add a changelog fragment to `docs/changelog/unreleased/<PR>.<category>.mdx`.
- PRs that modify extension DDL/schema add a SQL migration fragment to `pg_search/sql/unreleased/<PR>.<description>.sql`.

At release time, the [**Publish GitHub Release** workflow](https://github.com/paradedb/paradedb/actions/workflows/publish-github-release.yml) automatically assembles these fragments into the versioned SQL upgrade script and changelog page.

## Release Types

Releases must always be triggered **from the branch being released** (e.g., `main` for a minor or beta release, or a stable branch for patches).

| Type          | Description                                                                                 |
| ------------- | ------------------------------------------------------------------------------------------- |
| **Minor**     | Triggered from the `main` branch.                                                           |
| **Patch**     | A patch bump off an existing tag (e.g., `v1.4.0 → v1.4.1`) from a stable branch (`0.25.x`). |
| **Beta (RC)** | Marked with `beta: true`. Produces a prerelease tag like `vX.Y.Z-rc.N`.                     |

> **Note:** Minor and patch releases publish Docker images for all supported PostgreSQL major versions and prebuilt extension binaries for all supported platforms. Beta releases publish only the PostgreSQL 18 Docker image and the Debian 13 packages required to build it; the remaining prebuilt extension binaries are skipped.

## Workflow Inputs

| Input     | Type    | Default | Description                                                                                |
| --------- | ------- | ------- | ------------------------------------------------------------------------------------------ |
| `version` | string  | `""`    | Target release version in semver format (e.g., `1.2.3` or `1.2.3-rc.1` for beta releases). |
| `beta`    | boolean | `false` | If `true`, creates a beta release (`vX.Y.Z-rc.N`) and marks it as a pre-release in GitHub. |

## Triggering a Release

### Minor & Beta Releases

To publish a minor or beta release from `main`:

1. Go to [Actions → Publish GitHub Release](https://github.com/paradedb/paradedb/actions/workflows/publish-github-release.yml)
2. Click **Run workflow**, select `main` as the release branch, and provide the target `version` (e.g. `0.26.0` or `0.26.0-rc.1` with `beta: true`).
3. Click **Run workflow** to start the job.
4. The workflow will automatically:
   - Run `scripts/assemble_sql.sh` to assemble `pg_search/sql/unreleased/*.sql` into `pg_search--<prev>--<version>.sql` and remove the consumed fragments.
   - Run `scripts/assemble_changelog.sh` to assemble `docs/changelog/unreleased/*.mdx` into `docs/changelog/<version>.mdx`, register the page in `docs/docs.json`, and remove the consumed fragments.
   - Bump `workspace.package.version` in `Cargo.toml` and synchronize `Cargo.lock`.
   - Commit and push the release commit to `main`.
   - Create the Git tag `v<version>`, triggering downstream packaging and publishing workflows.

### Patch Releases

To publish a patch for an existing release:

1. **Branch off** the target release if a stable branch does not already exist (e.g., `git checkout -b 0.25.x v0.25.0`).
2. **Cherry-pick** the required fix commits from `main` into the stable branch. The unreleased fragments associated with those commits will carry over automatically.
3. Go to [Actions → Publish GitHub Release](https://github.com/paradedb/paradedb/actions/workflows/publish-github-release.yml).
4. Click **Run workflow**, select the stable branch (e.g. `0.25.x`) as the release branch, and provide the patch `version` (e.g. `0.25.5`).
5. The workflow will assemble only the fragments present on the stable branch, commit to the stable branch, tag, and publish.

## Post-Release Steps

1. **Verify** that the GitHub release and tag were created correctly and that all downstream packaging jobs completed successfully.
2. **Release** `paradedb/paradedb-enterprise` by following the instructions in the repository's RELEASE.md file.

That's it! Go for a walk, you deserve it.
