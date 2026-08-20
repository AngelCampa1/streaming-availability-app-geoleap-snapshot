$ErrorActionPreference = 'Stop'

$repoRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')

function Read-RepoFile {
    param([Parameter(Mandatory = $true)][string]$RelativePath)
    return Get-Content -Raw -Path (Join-Path $repoRoot $RelativePath)
}

function Assert-True {
    param(
        [Parameter(Mandatory = $true)][bool]$Condition,
        [Parameter(Mandatory = $true)][string]$Message
    )

    if (-not $Condition) {
        throw $Message
    }
}

$deploy = Read-RepoFile 'infrastructure/deploy-production.ps1'
$appsettings = Read-RepoFile 'backend/GeoLeap.Api/appsettings.json'
$compose = Read-RepoFile 'docker-compose.yml'
$prodComposePath = Join-Path $repoRoot 'docker-compose.prod.yml'

Assert-True ($deploy -match 'ASPNETCORE_ENVIRONMENT\s*=\s*["'']?Production') `
    'Production deploy must explicitly require ASPNETCORE_ENVIRONMENT=Production.'
Assert-True ($deploy -match 'JWT__Secret' -and $deploy -match 'ConnectionStrings__DefaultConnection' -and $deploy -match 'ConnectionStrings__Redis') `
    'Production deploy must require externally supplied JWT, database, and Redis secrets.'
Assert-True ($deploy -match 'Stripe__SecretKey' -and $deploy -match 'Stripe__WebhookSecret' -and $deploy -match 'Apple__SharedSecret' -and $deploy -match 'Google__PlayStore__ServiceAccountJson') `
    'Production deploy must require externally supplied payment and mobile receipt verification secrets.'
Assert-True ($deploy -match 'SKIP_DB_MIGRATIONS=true' -and $deploy -match '!\s+grep') `
    'Production deploy must reject SKIP_DB_MIGRATIONS=true so security migrations are not skipped.'
Assert-True ($deploy -notmatch 'docker-compose\s+up' -and $deploy -notmatch 'docker compose\s+up(?![^\r\n]*docker-compose\.prod\.yml)') `
    'Production deploy must not invoke the shared development compose stack.'
Assert-True ($deploy -notmatch 'development-jwt-secret-key-for-local-testing-only') `
    'Production deploy must not contain or invoke a static development JWT secret.'
$program = Read-RepoFile 'backend/GeoLeap.Api/Program.cs'
Assert-True ($program -match 'Database migration failed at startup' -and $program -match 'throw;' -and $program -notmatch 'app will start without migrations') `
    'Production app startup must fail closed when database migrations fail.'

$committedSecretPattern = '(GOCSPX-[A-Za-z0-9_-]+|sk_(?:test|live)_[A-Za-z0-9]+|whsec_[A-Za-z0-9]+)'
Assert-True ($appsettings -notmatch $committedSecretPattern) `
    'appsettings.json must not contain committed Google, Stripe, or webhook secrets.'

$program = Read-RepoFile 'backend/GeoLeap.Api/Program.cs'
Assert-True ($program -match 'AssertRequiredProductionIndexesAsync' -and $program -match 'IX_MobileSubscriptions_TransactionId' -and $program -match 'IX_MobileSubscriptions_OriginalTransactionId' -and $program -match 'IX_MobileSubscriptions_PurchaseToken') `
    'Production startup must verify mobile subscription replay-prevention indexes after migrations.'
Assert-True ($program -match 'Log\.Fatal\(ex,\s*"Database migration failed at startup"\)' -and $program -match 'throw;') `
    'Production startup must fail closed when database migrations fail.'

Assert-True ($compose -notmatch 'ASPNETCORE_ENVIRONMENT=Production') `
    'Shared compose file must not be used as the production stack.'
Assert-True ($compose -notmatch 'JWT__Secret=.*development-jwt-secret-key-for-local-testing-only') `
    'Shared compose file must not define a static JWT secret that production can inherit.'

Assert-True (Test-Path $prodComposePath) `
    'Production deployment must use a dedicated docker-compose.prod.yml override.'
$prodCompose = Get-Content -Raw -Path $prodComposePath
foreach ($service in @('postgres', 'redis')) {
    $servicePattern = '(?ms)^\s{2}' + [regex]::Escape($service) + '\s*:\s*$(.*?)(?=^\s{2}[A-Za-z0-9_-]+\s*:|\z)'
    $serviceBlockMatch = [regex]::Match($prodCompose, $servicePattern)
    Assert-True $serviceBlockMatch.Success "Production compose must define the $service service."
    Assert-True ($serviceBlockMatch.Groups[1].Value -notmatch '(?m)^\s{4}ports\s*:') `
        "Production compose must not publish $service ports."
}
Assert-True ($prodCompose -match 'REDIS_PASSWORD' -and $prodCompose -match '--requirepass') `
    'Production Redis must require authentication when configured.'
Assert-True ($prodCompose -match 'dockerfile:\s+Dockerfile\.prod') `
    'Production frontend compose must build the existing frontend/Dockerfile.prod image.'
Assert-True ($prodCompose -match 'Stripe__SecretKey' -and $prodCompose -match 'Stripe__WebhookSecret' -and $prodCompose -match 'Apple__SharedSecret' -and $prodCompose -match 'Google__PlayStore__ServiceAccountJson') `
    'Production backend compose must inject payment and mobile receipt verification secrets.'

Write-Host 'Infrastructure production security static checks passed.'
