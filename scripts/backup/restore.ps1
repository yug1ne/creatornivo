# Download, verify, decrypt, and restore a Creatornivo database backup.

[CmdletBinding()]
param(
    [string]$R2Key,
    [switch]$Latest,
    [string]$LocalEncryptedFile,
    [Parameter(Mandatory = $true)]
    [string]$AgeKeyFile,
    [string]$TargetDatabaseUrl = $env:RESTORE_DATABASE_URL,
    [string]$OutputDir = "./restore-work",
    [switch]$DecryptOnly,
    [string]$R2AccountId = $env:R2_ACCOUNT_ID,
    [string]$R2AccessKeyId = $env:R2_ACCESS_KEY_ID,
    [string]$R2SecretAccessKey = $env:R2_SECRET_ACCESS_KEY,
    [string]$R2BucketName = $env:R2_BUCKET_NAME
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/common.ps1"

Require-Command "age"
if (-not (Test-Path $AgeKeyFile)) {
    throw "Age key file not found: $AgeKeyFile"
}

New-Item -ItemType Directory -Path $OutputDir -Force | Out-Null

if ($LocalEncryptedFile) {
    $encryptedPath = $LocalEncryptedFile
}
elseif ($Latest -or $R2Key) {
    Require-Command "aws"
    if ([string]::IsNullOrWhiteSpace($R2AccountId)) { throw "R2_ACCOUNT_ID is required" }
    if ([string]::IsNullOrWhiteSpace($R2AccessKeyId)) { throw "R2_ACCESS_KEY_ID is required" }
    if ([string]::IsNullOrWhiteSpace($R2SecretAccessKey)) { throw "R2_SECRET_ACCESS_KEY is required" }
    if ([string]::IsNullOrWhiteSpace($R2BucketName)) { throw "R2_BUCKET_NAME is required" }

    Set-R2AwsEnv -AccessKeyId $R2AccessKeyId -SecretAccessKey $R2SecretAccessKey
    $endpoint = Get-R2Endpoint -AccountId $R2AccountId

    if ($Latest) {
        $R2Key = Get-LatestR2BackupKey -BucketName $R2BucketName -AccountId $R2AccountId
        if ([string]::IsNullOrWhiteSpace($R2Key)) {
            throw "No backups found in R2"
        }
    }

    $encryptedName = Split-Path $R2Key -Leaf
    $encryptedPath = Join-Path $OutputDir $encryptedName
    $checksumPath = "$encryptedPath.sha256"

    Write-Host "Downloading s3://$R2BucketName/$R2Key"
    aws s3 cp "s3://$R2BucketName/$R2Key" $encryptedPath --endpoint-url $endpoint | Out-Null
    aws s3 cp "s3://$R2BucketName/$R2Key.sha256" $checksumPath --endpoint-url $endpoint 2>$null | Out-Null

    if (Test-Path $checksumPath) {
        Write-Host "Verifying checksum"
        $expected = (Get-Content $checksumPath -TotalCount 1).Split(" ")[0]
        $actual = (Get-FileHash -Path $encryptedPath -Algorithm SHA256).Hash.ToLowerInvariant()
        if ($expected -ne $actual) {
            throw "Checksum mismatch"
        }
    }
}
else {
    throw "Specify -Latest, -R2Key, or -LocalEncryptedFile"
}

$dumpPath = Join-Path $OutputDir "restore.dump"

Write-Host "Decrypting $encryptedPath"
age -d -i $AgeKeyFile -o $dumpPath $encryptedPath

if ($DecryptOnly) {
    Write-Host "Decrypt-only complete: $dumpPath"
    return
}

if ([string]::IsNullOrWhiteSpace($TargetDatabaseUrl)) {
    throw "TargetDatabaseUrl (or RESTORE_DATABASE_URL) is required for restore"
}

Require-Command "pg_restore"
Write-Host "Restoring to target database"
pg_restore `
    --dbname=$TargetDatabaseUrl `
    --no-owner `
    --no-acl `
    --verbose `
    $dumpPath

Write-Host "Restore completed"