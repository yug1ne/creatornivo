# Shared helpers for Creatornivo database backup scripts (PowerShell).

$ErrorActionPreference = "Stop"

$script:BackupRetentionDays = if ($env:BACKUP_RETENTION_DAYS) { [int]$env:BACKUP_RETENTION_DAYS } else { 30 }
$script:R2Prefix = if ($env:R2_PREFIX) { $env:R2_PREFIX } else { "daily" }

function Require-Command {
    param([Parameter(Mandatory = $true)][string]$Name)

    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        throw "Required command not found: $Name"
    }
}

function Remove-DockerContainer {
    param(
        [Parameter(Mandatory = $true)]
        [string]$Name
    )

    $prevErrorAction = $ErrorActionPreference
    $nativePreferenceRestored = $false
    if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
        $prevNative = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
        $nativePreferenceRestored = $true
    }

    try {
        $ErrorActionPreference = 'Continue'
        docker rm -f $Name 2>$null | Out-Null
        # Exit code 1 = container not found (acceptable during cleanup)
        if ($LASTEXITCODE -gt 1) {
            throw "docker rm -f $Name failed with exit code $LASTEXITCODE"
        }
    }
    finally {
        $ErrorActionPreference = $prevErrorAction
        if ($nativePreferenceRestored) {
            $PSNativeCommandUseErrorActionPreference = $prevNative
        }
    }
}

function Test-DrillPgRestoreLineIgnorable {
    param([Parameter(Mandatory = $true)][string]$Line)

    return $Line -match 'supabase_vault'
}

function Invoke-DrillPgRestore {
    param(
        [Parameter(Mandatory = $true)][string]$ContainerName,
        [Parameter(Mandatory = $true)][string]$DumpPath,
        [string]$DbUser = "postgres",
        [string]$DbName = "postgres"
    )

    $prevErrorAction = $ErrorActionPreference
    $nativePreferenceRestored = $false
    if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
        $prevNative = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
        $nativePreferenceRestored = $true
    }

    try {
        $ErrorActionPreference = 'Continue'
        $output = docker exec $ContainerName pg_restore `
            -U $DbUser `
            -d $DbName `
            --no-owner `
            --no-acl `
            $DumpPath 2>&1
        $exitCode = $LASTEXITCODE

        $lines = @($output | ForEach-Object { "$_" })
        foreach ($line in $lines) {
            if ([string]::IsNullOrWhiteSpace($line)) {
                continue
            }
            if (Test-DrillPgRestoreLineIgnorable -Line $line) {
                Write-Warning "pg_restore (ignored): $line"
                continue
            }
            Write-Host $line
        }

        # 0 = clean; 1 = completed with warnings (expected for local drill restores)
        if ($exitCode -gt 1) {
            throw "pg_restore failed with exit code $exitCode"
        }
        if ($exitCode -eq 1) {
            Write-Warning "pg_restore completed with warnings (exit code 1)"
        }

        return $exitCode
    }
    finally {
        $ErrorActionPreference = $prevErrorAction
        if ($nativePreferenceRestored) {
            $PSNativeCommandUseErrorActionPreference = $prevNative
        }
    }
}

function Get-DockerPsqlCount {
    param(
        [Parameter(Mandatory = $true)][string]$ContainerName,
        [Parameter(Mandatory = $true)][string]$TableName,
        [string]$DbUser = "postgres",
        [string]$DbName = "postgres"
    )

    $prevErrorAction = $ErrorActionPreference
    $nativePreferenceRestored = $false
    if (Test-Path variable:PSNativeCommandUseErrorActionPreference) {
        $prevNative = $PSNativeCommandUseErrorActionPreference
        $PSNativeCommandUseErrorActionPreference = $false
        $nativePreferenceRestored = $true
    }

    # Quote identifier for PostgreSQL; run via sh -c so docker exec on Windows preserves quotes.
    $query = "SELECT count(*) FROM ""$TableName"";"
    $shellCmd = "psql -U $DbUser -d $DbName -Atqc '$query'"

    try {
        $ErrorActionPreference = 'Continue'
        $result = docker exec $ContainerName sh -c $shellCmd 2>&1
        if ($LASTEXITCODE -ne 0) {
            $detail = @($result | ForEach-Object { "$_" }) -join '; '
            throw "psql count query failed for ""$TableName"" (exit $LASTEXITCODE): $detail"
        }

        $text = @($result | ForEach-Object { "$_" }) -join "`n"
        $text = $text.Trim()
        if ([string]::IsNullOrWhiteSpace($text)) {
            throw "psql count query returned no output for ""$TableName"""
        }

        return $text
    }
    finally {
        $ErrorActionPreference = $prevErrorAction
        if ($nativePreferenceRestored) {
            $PSNativeCommandUseErrorActionPreference = $prevNative
        }
    }
}

function Require-Env {
    param([Parameter(Mandatory = $true)][string]$Name)

    $value = [Environment]::GetEnvironmentVariable($Name)
    if ([string]::IsNullOrWhiteSpace($value)) {
        throw "Environment variable $Name is required"
    }
}

function Get-UtcTimestamp {
    return (Get-Date).ToUniversalTime().ToString("yyyy-MM-dd-HHmmss")
}

function Get-UtcDatePath {
    $now = (Get-Date).ToUniversalTime()
    return $now.ToString("yyyy/MM/dd")
}

function Get-BackupBasename {
    return "creatornivo-$(Get-UtcTimestamp)"
}

function Get-R2Endpoint {
    param([Parameter(Mandatory = $true)][string]$AccountId)
    return "https://$AccountId.r2.cloudflarestorage.com"
}

function Set-R2AwsEnv {
    param(
        [Parameter(Mandatory = $true)][string]$AccessKeyId,
        [Parameter(Mandatory = $true)][string]$SecretAccessKey
    )

    $env:AWS_ACCESS_KEY_ID = $AccessKeyId
    $env:AWS_SECRET_ACCESS_KEY = $SecretAccessKey
    if (-not $env:AWS_DEFAULT_REGION) {
        $env:AWS_DEFAULT_REGION = "auto"
    }
    $env:AWS_EC2_METADATA_DISABLED = "true"
}

function Get-R2S3UriForFile {
    param(
        [Parameter(Mandatory = $true)][string]$BucketName,
        [Parameter(Mandatory = $true)][string]$FileName
    )

    return "s3://$BucketName/$script:R2Prefix/$(Get-UtcDatePath)/$FileName"
}

function Write-ChecksumSidecar {
    param([Parameter(Mandatory = $true)][string]$FilePath)

    $hash = (Get-FileHash -Path $FilePath -Algorithm SHA256).Hash.ToLowerInvariant()
    $sidecar = "$FilePath.sha256"
    Set-Content -Path $sidecar -Value "$hash  $(Split-Path $FilePath -Leaf)" -NoNewline
    return $hash
}

function Test-BackupEnv {
    Require-Env "BACKUP_DATABASE_URL"
    Require-Env "BACKUP_AGE_PUBLIC_KEY"
    Require-Env "R2_ACCOUNT_ID"
    Require-Env "R2_ACCESS_KEY_ID"
    Require-Env "R2_SECRET_ACCESS_KEY"
    Require-Env "R2_BUCKET_NAME"
}

function Test-RestoreEnv {
    Require-Env "R2_ACCOUNT_ID"
    Require-Env "R2_ACCESS_KEY_ID"
    Require-Env "R2_SECRET_ACCESS_KEY"
    Require-Env "R2_BUCKET_NAME"
}

function Get-LatestR2BackupKey {
    param(
        [Parameter(Mandatory = $true)][string]$BucketName,
        [Parameter(Mandatory = $true)][string]$AccountId
    )

    $endpoint = Get-R2Endpoint -AccountId $AccountId
    $output = aws s3api list-objects-v2 `
        --bucket $BucketName `
        --prefix "$script:R2Prefix/" `
        --endpoint-url $endpoint `
        --output json

    if (-not $output) {
        return $null
    }

    $parsed = $output | ConvertFrom-Json
    $latest = $parsed.Contents |
        Where-Object { $_.Key -like "*.dump.age" } |
        Sort-Object LastModified |
        Select-Object -Last 1

    if (-not $latest) {
        return $null
    }

    return $latest.Key
}

function Remove-OldR2Backups {
    param(
        [Parameter(Mandatory = $true)][string]$BucketName,
        [Parameter(Mandatory = $true)][string]$AccountId,
        [int]$RetentionDays = $script:BackupRetentionDays
    )

    $endpoint = Get-R2Endpoint -AccountId $AccountId
    $cutoff = (Get-Date).ToUniversalTime().AddDays(-$RetentionDays)

    Write-Host "Pruning R2 backups older than $RetentionDays days under $script:R2Prefix/"

    $output = aws s3api list-objects-v2 `
        --bucket $BucketName `
        --prefix "$script:R2Prefix/" `
        --endpoint-url $endpoint `
        --output json

    if (-not $output) {
        return
    }

    $parsed = $output | ConvertFrom-Json
    $oldObjects = $parsed.Contents |
        Where-Object {
            $_.Key -like "*.dump.age" -and
            ([datetime]$_.LastModified).ToUniversalTime() -lt $cutoff
        }

    foreach ($obj in $oldObjects) {
        $key = $obj.Key
        Write-Host "Deleting s3://$BucketName/$key"
        aws s3 rm "s3://$BucketName/$key" --endpoint-url $endpoint | Out-Null
        aws s3 rm "s3://$BucketName/$key.sha256" --endpoint-url $endpoint 2>$null | Out-Null
    }
}