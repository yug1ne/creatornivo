#!/usr/bin/env bash
# Mandatory restore drill: download latest encrypted backup, restore to local Docker
# PostgreSQL, and verify core table counts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

AGE_KEY_FILE=""
OUTPUT_DIR="${OUTPUT_DIR:-./restore-work}"
CONTAINER_NAME="${CONTAINER_NAME:-creatornivo-restore-test}"
HOST_PORT="${HOST_PORT:-5433}"
DB_PASSWORD="${DB_PASSWORD:-restore-test-password}"

usage() {
  cat <<'EOF'
Usage:
  drill.sh --age-key-file PATH

Environment (optional):
  OUTPUT_DIR, CONTAINER_NAME, HOST_PORT, DB_PASSWORD
  R2_* variables for download (same as restore.sh)
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --age-key-file) AGE_KEY_FILE="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

[[ -n "${AGE_KEY_FILE}" ]] || { echo "error: --age-key-file is required" >&2; exit 1; }

require_cmd() {
  command -v "$1" >/dev/null 2>&1 || {
    echo "error: required command not found: $1" >&2
    exit 1
  }
}

require_cmd docker
require_cmd psql
require_cmd pg_restore

cleanup() {
  docker rm -f "${CONTAINER_NAME}" >/dev/null 2>&1 || true
}
trap cleanup EXIT

echo "=== Creatornivo restore drill ==="

bash "${SCRIPT_DIR}/restore.sh" \
  --latest \
  --age-key-file "${AGE_KEY_FILE}" \
  --output-dir "${OUTPUT_DIR}" \
  --decrypt-only

dump_path="${OUTPUT_DIR}/restore.dump"
[[ -f "${dump_path}" ]] || { echo "error: decrypted dump not found at ${dump_path}" >&2; exit 1; }

echo "starting temporary postgres container on port ${HOST_PORT}"
cleanup
docker run -d \
  --name "${CONTAINER_NAME}" \
  -e POSTGRES_PASSWORD="${DB_PASSWORD}" \
  -p "${HOST_PORT}:5432" \
  postgres:17 >/dev/null

echo "waiting for postgres to become ready"
for _ in $(seq 1 30); do
  if docker exec "${CONTAINER_NAME}" pg_isready -U postgres >/dev/null 2>&1; then
    break
  fi
  sleep 1
done

target_url="postgresql://postgres:${DB_PASSWORD}@127.0.0.1:${HOST_PORT}/postgres"

echo "restoring decrypted dump into drill database"
pg_restore \
  --dbname="${target_url}" \
  --no-owner \
  --no-acl \
  "${dump_path}"

echo "running verification queries"
user_count="$(psql "${target_url}" -Atqc 'SELECT count(*) FROM "User";')"
generation_count="$(psql "${target_url}" -Atqc 'SELECT count(*) FROM "Generation";')"
subscription_count="$(psql "${target_url}" -Atqc 'SELECT count(*) FROM "Subscription";')"
migration_count="$(psql "${target_url}" -Atqc 'SELECT count(*) FROM "_prisma_migrations";')"

echo "User count: ${user_count}"
echo "Generation count: ${generation_count}"
echo "Subscription count: ${subscription_count}"
echo "Prisma migrations: ${migration_count}"

if [[ "${user_count}" -lt 1 ]]; then
  echo "DRILL FAIL: expected at least 1 user row" >&2
  exit 1
fi

if [[ "${migration_count}" -lt 1 ]]; then
  echo "DRILL FAIL: expected prisma migrations" >&2
  exit 1
fi

echo "=== DRILL PASS ==="