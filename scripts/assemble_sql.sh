#!/usr/bin/env bash
# scripts/assemble_sql.sh
#
# Assembles unreleased SQL migration fragments into a versioned upgrade script:
# pg_search/sql/pg_search--<prev>--<target>.sql
#
# Usage:
#   ./scripts/assemble_sql.sh <target_version> [--transient] [--prev-version <prev>]
#
# Arguments:
#   target_version  The version being released / tested (e.g. 0.25.5).
#   --transient     Do not delete unreleased fragments after assembly (used for CI upgrade tests).
#   --prev-version  Explicitly specify the previous version instead of auto-detecting.

set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
UNRELEASED_DIR="${REPO_ROOT}/pg_search/sql/unreleased"
SQL_DIR="${REPO_ROOT}/pg_search/sql"

TARGET_VERSION=""
TRANSIENT=false
PREV_VERSION=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --transient|--dry-run)
      TRANSIENT=true
      shift
      ;;
    --prev-version)
      PREV_VERSION="$2"
      shift 2
      ;;
    *)
      if [[ -z "$TARGET_VERSION" ]]; then
        TARGET_VERSION="$1"
      else
        echo "Unknown argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$TARGET_VERSION" ]]; then
  # Fallback to version declared in Cargo.toml
  TARGET_VERSION=$(grep "^version" "${REPO_ROOT}/Cargo.toml" | head -1 | awk -F '"' '{print $2}')
  echo "Target version not provided; using Cargo.toml version: ${TARGET_VERSION}"
fi

# Strip any prerelease suffixes (e.g. 0.25.0-rc.1 -> 0.25.0)
CLEAN_TARGET_VERSION="${TARGET_VERSION%%-*}"

# Determine PREV_VERSION if not supplied
if [[ -z "$PREV_VERSION" ]]; then
  # Try git tags first
  TAGS=$(git -C "${REPO_ROOT}" tag -l 'v*' 2>/dev/null | grep -E '^v[0-9]+\.[0-9]+\.[0-9]+$' || true)
  if [[ -n "$TAGS" ]]; then
    SORTED=$(printf "%s\nv%s\n" "$TAGS" "$CLEAN_TARGET_VERSION" | sort -V -u)
    PREV_VERSION=$(echo "$SORTED" | awk -v cur="v$CLEAN_TARGET_VERSION" 'prev != "" && $0 == cur { print prev; exit } { prev = $0 }' | sed 's/^v//')
  fi

  # Fallback: scan existing migration files for highest target version < CLEAN_TARGET_VERSION
  if [[ -z "$PREV_VERSION" ]]; then
    EXISTING_VERSIONS=$(find "${SQL_DIR}" -maxdepth 1 -name 'pg_search--*--*.sql' 2>/dev/null | sed -nE 's/.*pg_search--.*--([0-9]+\.[0-9]+\.[0-9]+)\.sql$/\1/p' | sort -V -u || true)
    if [[ -n "$EXISTING_VERSIONS" ]]; then
      SORTED=$(printf "%s\n%s\n" "$EXISTING_VERSIONS" "$CLEAN_TARGET_VERSION" | sort -V -u)
      PREV_VERSION=$(echo "$SORTED" | awk -v cur="$CLEAN_TARGET_VERSION" 'prev != "" && $0 == cur { print prev; exit } { prev = $0 }')
    fi
  fi
fi

if [[ -z "$PREV_VERSION" ]]; then
  echo "❌ Error: Could not determine previous version for target ${CLEAN_TARGET_VERSION}. Specify --prev-version <version> explicitly." >&2
  exit 1
fi

OUTPUT_FILE="${SQL_DIR}/pg_search--${PREV_VERSION}--${CLEAN_TARGET_VERSION}.sql"
echo "Assembling SQL upgrade script: ${OUTPUT_FILE} (from ${PREV_VERSION} to ${CLEAN_TARGET_VERSION})"

# Collect all unreleased SQL files
shopt -s nullglob
FRAGMENTS=("${UNRELEASED_DIR}"/*.sql)

# Sort fragments by PR prefix (numerical order)
# Helper python sort
SORTED_FRAGMENTS=()
if (( ${#FRAGMENTS[@]} > 0 )); then
  while IFS= read -r line; do
    [[ -n "$line" ]] && SORTED_FRAGMENTS+=("$line")
  done < <(python3 - <<'PY' "${FRAGMENTS[@]}"
import sys
import os
import re

files = sys.argv[1:]

def sort_key(filepath):
    filename = os.path.basename(filepath)
    match = re.match(r'^(\d+)', filename)
    if match:
        return (int(match.group(1)), filename)
    return (float('inf'), filename)

for f in sorted(files, key=sort_key):
    print(f)
PY
)
fi

# Generate output migration file
mkdir -p "${SQL_DIR}"
cat <<EOF > "${OUTPUT_FILE}"
\echo Use "ALTER EXTENSION pg_search UPDATE TO '${CLEAN_TARGET_VERSION}'" to load this file. \quit

EOF

if (( ${#SORTED_FRAGMENTS[@]} > 0 )); then
  echo "Found ${#SORTED_FRAGMENTS[@]} SQL fragment(s):"
  for f in "${SORTED_FRAGMENTS[@]}"; do
    echo "  - $(basename "$f")"
    cat "$f" >> "${OUTPUT_FILE}"
    echo "" >> "${OUTPUT_FILE}"
  done
else
  echo "No SQL fragments found in ${UNRELEASED_DIR}. Created minimal migration banner."
fi

# Clean up consumed fragments if not transient
if [[ "$TRANSIENT" == "false" ]]; then
  for f in "${SORTED_FRAGMENTS[@]}"; do
    echo "Removing consumed fragment: $f"
    rm -f "$f"
  done
else
  echo "Transient mode: fragments preserved in ${UNRELEASED_DIR}."
fi

echo "✅ Successfully generated: ${OUTPUT_FILE}"
