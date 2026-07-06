#!/usr/bin/env bash
# Shared helpers for Creatornivo database backup scripts.

set -euo pipefail

BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-30}"
R2_PREFIX="${R2_PREFIX:-daily}"

require_cmd() {
  local cmd="$1"
  if ! command -v "$cmd" >/dev/null 2>&1; then
    echo "error: required command not found: $cmd" >&2
    exit 1
  fi
}

require_env() {
  local name="$1"
  if [[ -z "${!name:-}" ]]; then
    echo "error: environment variable $name is required" >&2
    exit 1
  fi
}

utc_timestamp() {
  date -u +%Y-%m-%d-%H%M%S
}

utc_date_path() {
  date -u +%Y/%m/%d
}

backup_basename() {
  echo "creatornivo-$(utc_timestamp)"
}

r2_endpoint() {
  echo "https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com"
}

setup_r2_aws_env() {
  export AWS_ACCESS_KEY_ID="${R2_ACCESS_KEY_ID}"
  export AWS_SECRET_ACCESS_KEY="${R2_SECRET_ACCESS_KEY}"
  export AWS_DEFAULT_REGION="${AWS_DEFAULT_REGION:-auto}"
  export AWS_EC2_METADATA_DISABLED=true
}

r2_s3_uri_for_file() {
  local filename="$1"
  echo "s3://${R2_BUCKET_NAME}/${R2_PREFIX}/$(utc_date_path)/${filename}"
}

sha256_file() {
  local file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$file" | awk '{print $1}'
  else
    shasum -a 256 "$file" | awk '{print $1}'
  fi
}

write_checksum_sidecar() {
  local file="$1"
  local checksum
  checksum="$(sha256_file "$file")"
  echo "$checksum  $(basename "$file")" >"${file}.sha256"
  echo "$checksum"
}

verify_backup_env() {
  require_env BACKUP_DATABASE_URL
  require_env BACKUP_AGE_PUBLIC_KEY
  require_env R2_ACCOUNT_ID
  require_env R2_ACCESS_KEY_ID
  require_env R2_SECRET_ACCESS_KEY
  require_env R2_BUCKET_NAME
}

verify_restore_env() {
  require_env R2_ACCOUNT_ID
  require_env R2_ACCESS_KEY_ID
  require_env R2_SECRET_ACCESS_KEY
  require_env R2_BUCKET_NAME
}

# Fallback retention: delete *.dump.age (+ .sha256) older than retention_days under R2_PREFIX/.
# Primary retention should be an R2 Lifecycle rule on prefix daily/ (see roadmap.md §14).
prune_old_r2_backups() {
  local retention_days="$1"
  local cutoff_date
  cutoff_date="$(date -u -d "${retention_days} days ago" +%Y-%m-%d)"
  local endpoint
  endpoint="$(r2_endpoint)"

  echo "pruning R2 backups older than ${retention_days} days under ${R2_PREFIX}/"

  aws s3 ls "s3://${R2_BUCKET_NAME}/${R2_PREFIX}/" --recursive --endpoint-url "${endpoint}" |
    while read -r date _time _size key; do
      [[ -z "${key:-}" || "$key" != *.dump.age ]] && continue
      if [[ "$date" < "$cutoff_date" ]]; then
        echo "deleting s3://${R2_BUCKET_NAME}/${key}"
        aws s3 rm "s3://${R2_BUCKET_NAME}/${key}" --endpoint-url "${endpoint}"
        aws s3 rm "s3://${R2_BUCKET_NAME}/${key}.sha256" --endpoint-url "${endpoint}" 2>/dev/null || true
      fi
    done
}

find_latest_r2_backup_key() {
  local endpoint
  endpoint="$(r2_endpoint)"

  aws s3 ls "s3://${R2_BUCKET_NAME}/${R2_PREFIX}/" --recursive --endpoint-url "${endpoint}" |
    awk '/\.dump\.age$/ {print}' |
    sort |
    tail -1 |
    awk '{print $4}'
}