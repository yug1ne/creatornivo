# Create an encrypted PostgreSQL backup and upload it to Cloudflare R2.
#
# Usage:
#   .\backup.ps1                         # full backup + upload + retention prune
#   .\backup.ps1 -PruneOnly              # delete R2 objects older than RetentionDays (fallback to Lifecycle rule)
#   .\backup.ps1 -SkipUpload             # local encrypted dump only (no R2 upload)
#
# See roadmap.md §14 for R2 Lifecycle rule and restore drill.

[CmdletBinding()]
param(
    [string]$DatabaseUrl = $env:BACKUP_DATABASE_URL,
    [string]$AgePublicKey = $env:BACKUP_AGE_PUBLIC_KEY,
    [string]$R2AccountId = $env:R2_ACCOUNT_ID,
    [string]$R2AccessKeyId = $env:R2_ACCESS_KEY_ID,
    [string]$R2SecretAccessKey = $env:R2_SECRET_ACCESS_KEY,
    [string]$R2BucketName = $env:R2_BUCKET_NAME,
    [int]$RetentionDays = $(if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 30 }),
    [switch]$SkipUpload,
    [switch]$SkipRetention,
    [switch]$PruneOnly
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/common.ps1"

Require-Command "aws"

if ($PruneOnly) {
    if ([string]::IsNullOrWhiteSpace($R2AccountId)) { throw "R2_ACCOUNT_ID is required" }
    if ([string]::IsNullOrWhiteSpace($R2AccessKeyId)) { throw "R2_ACCESS_KEY_ID is required" }
    if ([string]::IsNullOrWhiteSpace($R2SecretAccessKey)) { throw "R2_SECRET_ACCESS_KEY is required" }
    if ([string]::IsNullOrWhiteSpace($R2BucketName)) { throw "R2_BUCKET_NAME is required" }

    Remove-OldR2Backups -BucketName $R2BucketName -AccountId $R2AccountId -RetentionDays $RetentionDays
    Write-Host "Prune completed"
    return
}

Require-Command "pg_dump"
Require-Command "age"

if ([string]::IsNullOrWhiteSpace($DatabaseUrl)) { throw "BACKUP_DATABASE_URL is required" }
if ([string]::IsNullOrWhiteSpace($AgePublicKey)) { throw "BACKUP_AGE_PUBLIC_KEY is required" }
if (-not $SkipUpload) {
    if ([string]::IsNullOrWhiteSpace($R2AccountId)) { throw "R2_ACCOUNT_ID is required" }
    if ([string]::IsNullOrWhiteSpace($R2AccessKeyId)) { throw "R2_ACCESS_KEY_ID is required" }
    if ([string]::IsNullOrWhiteSpace($R2SecretAccessKey)) { throw "R2_SECRET_ACCESS_KEY is required" }
    if ([string]::IsNullOrWhiteSpace($R2BucketName)) { throw "R2_BUCKET_NAME is required" }
}

$basename = Get-BackupBasename
$dumpFile = "$basename.dump"
$encryptedFile = "$dumpFile.age"
$workDir = Join-Path $env:TEMP "creatornivo-backup-$basename"
New-Item -ItemType Directory -Path $workDir -Force | Out-Null

try {
    $dumpPath = Join-Path $workDir $dumpFile
    $encryptedPath = Join-Path $workDir $encryptedFile

    Write-Host "Starting backup: $basename"
    Write-Host "Running pg_dump (custom format, compressed)"

    & pg_dump `
        --dbname=$DatabaseUrl `
        --format=custom `
        --no-owner `
        --no-acl `
        --file=$dumpPath

    Write-Host "Encrypting with age"
    & age -r $AgePublicKey -o $encryptedPath $dumpPath
    Remove-Item $dumpPath -Force

    $checksum = Write-ChecksumSidecar -FilePath $encryptedPath
    Write-Host "sha256: $checksum"

    if (-not $SkipUpload) {
        Set-R2AwsEnv -AccessKeyId $R2AccessKeyId -SecretAccessKey $R2SecretAccessKey
        $endpoint = Get-R2Endpoint -AccountId $R2AccountId
        $s3Uri = Get-R2S3UriForFile -BucketName $R2BucketName -FileName $encryptedFile
        $checksumUri = "$s3Uri.sha256"

        Write-Host "Uploading $s3Uri"
        aws s3 cp $encryptedPath $s3Uri --endpoint-url $endpoint | Out-Null
        aws s3 cp "$encryptedPath.sha256" $checksumUri --endpoint-url $endpoint | Out-Null

        # Fallback retention prune (primary: R2 Lifecycle rule on prefix daily/ — see roadmap.md §14)
        if (-not $SkipRetention) {
            Remove-OldR2Backups -BucketName $R2BucketName -AccountId $R2AccountId -RetentionDays $RetentionDays
        }
    }
    else {
        Copy-Item $encryptedPath -Destination (Join-Path (Get-Location) $encryptedFile) -Force
        Copy-Item "$encryptedPath.sha256" -Destination (Join-Path (Get-Location) "$encryptedFile.sha256") -Force
        Write-Host "SkipUpload enabled; files written to ./$encryptedFile"
    }

    Write-Host "Backup completed: $basename"
}
finally {
    if (Test-Path $workDir) {
        Remove-Item $workDir -Recurse -Force
    }
}