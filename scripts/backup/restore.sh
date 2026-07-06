#!/usr/bin/env bash
# Download, verify, decrypt, and restore a Creatornivo database backup.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# shellcheck source=lib/common.sh
source "${SCRIPT_DIR}/lib/common.sh"

usage() {
  cat <<'EOF'
Usage:
  restore.sh --latest --age-key-file PATH --target-database-url URL
  restore.sh --r2-key daily/YYYY/MM/DD/file.dump.age --age-key-file PATH --target-database-url URL
  restore.sh --local-encrypted-file PATH --age-key-file PATH --target-database-url URL
EOF
}

R2_KEY=""
USE_LATEST=0
LOCAL_ENCRYPTED_FILE=""
AGE_KEY_FILE=""
TARGET_DATABASE_URL=""
OUTPUT_DIR="${OUTPUT_DIR:-./restore-work}"
DECRYPT_ONLY=0

while [[ $# -gt 0 ]]; do
  case "$1" in
    --latest) USE_LATEST=1; shift ;;
    --r2-key) R2_KEY="$2"; shift 2 ;;
    --local-encrypted-file) LOCAL_ENCRYPTED_FILE="$2"; shift 2 ;;
    --age-key-file) AGE_KEY_FILE="$2"; shift 2 ;;
    --target-database-url) TARGET_DATABASE_URL="$2"; shift 2 ;;
    --output-dir) OUTPUT_DIR="$2"; shift 2 ;;
    --decrypt-only) DECRYPT_ONLY=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "unknown argument: $1" >&2; usage; exit 1 ;;
  esac
done

require_cmd age
[[ -n "${AGE_KEY_FILE}" ]] || { echo "error: --age-key-file is required" >&2; exit 1; }
[[ -f "${AGE_KEY_FILE}" ]] || { echo "error: age key file not found: ${AGE_KEY_FILE}" >&2; exit 1; }

mkdir -p "${OUTPUT_DIR}"

if [[ -n "${LOCAL_ENCRYPTED_FILE}" ]]; then
  encrypted_path="${LOCAL_ENCRYPTED_FILE}"
elif [[ "${USE_LATEST}" == "1" || -n "${R2_KEY}" ]]; then
  require_cmd aws
  verify_restore_env
  setup_r2_aws_env
  endpoint="$(r2_endpoint)"

  if [[ "${USE_LATEST}" == "1" ]]; then
    R2_KEY="$(find_latest_r2_backup_key)"
    [[ -n "${R2_KEY}" ]] || { echo "error: no backups found in R2" >&2; exit 1; }
  fi

  encrypted_name="$(basename "${R2_KEY}")"
  encrypted_path="${OUTPUT_DIR}/${encrypted_name}"
  checksum_path="${encrypted_path}.sha256"

  echo "downloading s3://${R2_BUCKET_NAME}/${R2_KEY}"
  aws s3 cp "s3://${R2_BUCKET_NAME}/${R2_KEY}" "${encrypted_path}" --endpoint-url "${endpoint}"
  aws s3 cp "s3://${R2_BUCKET_NAME}/${R2_KEY}.sha256" "${checksum_path}" --endpoint-url "${endpoint}" 2>/dev/null || true

  if [[ -f "${checksum_path}" ]]; then
    echo "verifying checksum"
    expected="$(awk '{print $1}' "${checksum_path}")"
    actual="$(sha256_file "${encrypted_path}")"
    [[ "${expected}" == "${actual}" ]] || { echo "error: checksum mismatch" >&2; exit 1; }
  fi
else
  echo "error: specify --latest, --r2-key, or --local-encrypted-file" >&2
  usage
  exit 1
fi

dump_path="${OUTPUT_DIR}/restore.dump"

echo "decrypting ${encrypted_path}"
age -d -i "${AGE_KEY_FILE}" -o "${dump_path}" "${encrypted_path}"

if [[ "${DECRYPT_ONLY}" == "1" ]]; then
  echo "decrypt-only complete: ${dump_path}"
  exit 0
fi

[[ -n "${TARGET_DATABASE_URL}" ]] || { echo "error: --target-database-url is required for restore" >&2; exit 1; }
require_cmd pg_restore

echo "restoring to target database"
pg_restore \
  --dbname="${TARGET_DATABASE_URL}" \
  --no-owner \
  --no-acl \
  --verbose \
  "${dump_path}"

echo "restore completed"