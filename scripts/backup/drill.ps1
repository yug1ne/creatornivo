# Mandatory restore drill for Windows: download latest encrypted backup,
# restore to local Docker PostgreSQL, and verify core table counts.

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$AgeKeyFile,
    [string]$OutputDir = "./restore-work",
    [string]$ContainerName = "creatornivo-restore-test",
    [int]$HostPort = 5433,
    [string]$DbPassword = "restore-test-password",
    [string]$R2AccountId = $env:R2_ACCOUNT_ID,
    [string]$R2AccessKeyId = $env:R2_ACCESS_KEY_ID,
    [string]$R2SecretAccessKey = $env:R2_SECRET_ACCESS_KEY,
    [string]$R2BucketName = $env:R2_BUCKET_NAME
)

$ErrorActionPreference = "Stop"
. "$PSScriptRoot/lib/common.ps1"

Require-Command "docker"
Require-Command "psql"
Require-Command "pg_restore"

function Remove-DrillContainer {
    docker rm -f $ContainerName 2>$null | Out-Null
}

try {
    Write-Host "=== Creatornivo restore drill ==="

    & "$PSScriptRoot/restore.ps1" `
        -Latest `
        -AgeKeyFile $AgeKeyFile `
        -OutputDir $OutputDir `
        -DecryptOnly `
        -R2AccountId $R2AccountId `
        -R2AccessKeyId $R2AccessKeyId `
        -R2SecretAccessKey $R2SecretAccessKey `
        -R2BucketName $R2BucketName

    $dumpPath = Join-Path $OutputDir "restore.dump"
    if (-not (Test-Path $dumpPath)) {
        throw "Decrypted dump not found at $dumpPath"
    }

    Write-Host "Starting temporary postgres container on port $HostPort"
    Remove-DrillContainer
    docker run -d `
        --name $ContainerName `
        -e "POSTGRES_PASSWORD=$DbPassword" `
        -p "${HostPort}:5432" `
        postgres:17 | Out-Null

    Write-Host "Waiting for postgres to become ready"
    $ready = $false
    for ($i = 0; $i -lt 30; $i++) {
        docker exec $ContainerName pg_isready -U postgres 2>$null | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $ready = $true
            break
        }
        Start-Sleep -Seconds 1
    }
    if (-not $ready) {
        throw "Postgres container did not become ready in time"
    }

    $targetUrl = "postgresql://postgres:$DbPassword@127.0.0.1:$HostPort/postgres"

    Write-Host "Restoring decrypted dump into drill database"
    pg_restore `
        --dbname=$targetUrl `
        --no-owner `
        --no-acl `
        $dumpPath

    Write-Host "Running verification queries"
    $userCount = psql $targetUrl -Atqc 'SELECT count(*) FROM "User";'
    $generationCount = psql $targetUrl -Atqc 'SELECT count(*) FROM "Generation";'
    $subscriptionCount = psql $targetUrl -Atqc 'SELECT count(*) FROM "Subscription";'
    $migrationCount = psql $targetUrl -Atqc 'SELECT count(*) FROM "_prisma_migrations";'

    Write-Host "User count: $userCount"
    Write-Host "Generation count: $generationCount"
    Write-Host "Subscription count: $subscriptionCount"
    Write-Host "Prisma migrations: $migrationCount"

    if ([int]$userCount -lt 1) {
        throw "DRILL FAIL: expected at least 1 user row"
    }
    if ([int]$migrationCount -lt 1) {
        throw "DRILL FAIL: expected prisma migrations"
    }

    Write-Host "=== DRILL PASS ==="
}
finally {
    Remove-DrillContainer
}