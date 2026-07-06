#!/usr/bin/env bash
# Create an encrypted PostgreSQL backup and upload it to Cloudflare R2.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

SKIP_UPLOAD="${SKIP_UPLOAD:-0}"
SKIP_RETENTION="${SKIP_RETENTION:-0}"
PG_DUMP="${PG_DUMP:-pg_dump}"

if [[ ! -x "${PG_DUMP}" ]] && ! command -v "${PG_DUMP}" >/dev/null 2>&1; then
  echo "error: pg_dump not found: ${PG_DUMP}" >&2
  exit 1
fi

require_cmd age
require_cmd aws
verify_backup_env

echo "using pg_dump: ${PG_DUMP}"
"${PG_DUMP}" --version

basename="$(backup_basename)"
dump_file="${basename}.dump"
encrypted_file="${dump_file}.age"
work_dir="$(mktemp -d)"
trap 'rm -rf "${work_dir}"' EXIT

dump_path="${work_dir}/${dump_file}"
encrypted_path="${work_dir}/${encrypted_file}"

echo "starting backup: ${basename}"
echo "running pg_dump (custom format, compressed)"

"${PG_DUMP}" "${BACKUP_DATABASE_URL}" \
  --format=custom \
  --no-owner \
  --no-acl \
  --file="${dump_path}"

echo "encrypting with age"
age -r "${BACKUP_AGE_PUBLIC_KEY}" -o "${encrypted_path}" "${dump_path}"
rm -f "${dump_path}"

checksum="$(write_checksum_sidecar "${encrypted_path}")"
echo "sha256: ${checksum}"

if [[ "${SKIP_UPLOAD}" != "1" ]]; then
  setup_r2_aws_env
  endpoint="$(r2_endpoint)"
  s3_uri="$(r2_s3_uri_for_file "${encrypted_file}")"
  checksum_uri="${s3_uri}.sha256"

  echo "uploading ${s3_uri}"
  aws s3 cp "${encrypted_path}" "${s3_uri}" --endpoint-url "${endpoint}"
  aws s3 cp "${encrypted_path}.sha256" "${checksum_uri}" --endpoint-url "${endpoint}"

  if [[ "${SKIP_RETENTION}" != "1" ]]; then
    prune_old_r2_backups "${BACKUP_RETENTION_DAYS}"
  fi
else
  cp "${encrypted_path}" "./${encrypted_file}"
  cp "${encrypted_path}.sha256" "./${encrypted_file}.sha256"
  echo "skip upload enabled; files written to ./${encrypted_file}"
fi

echo "backup completed: ${basename}"