# GeoLeap Production Deployment Script
# Deploys to Azure VM at 20.172.233.20

param(
    [string]$VMHost = "20.172.233.20",
    [string]$VMUser = "azureuser",
    [string]$RemoteAppPath = "~/geoleap",
    [string]$RemoteEnvFile = ".env.production",
    [string]$GitRef = "main",
    [switch]$BackendOnly,
    [switch]$FrontendOnly,
    [switch]$HealthCheckOnly
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GeoLeap Production Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Check for SSH
if (-not (Get-Command ssh -ErrorAction SilentlyContinue)) {
    Write-Error "SSH is not available. Please install OpenSSH or use Git Bash."
    exit 1
}

$SSHTarget = "$VMUser@$VMHost"
$ComposeCommand = "docker compose --env-file $RemoteEnvFile -f docker-compose.prod.yml"
$RequiredProductionEnv = @(
    "ASPNETCORE_ENVIRONMENT",
    "JWT__Secret",
    "ConnectionStrings__DefaultConnection",
    "ConnectionStrings__Redis",
    "POSTGRES_PASSWORD",
    "REDIS_PASSWORD",
    "Stripe__SecretKey",
    "Stripe__PublishableKey",
    "Stripe__WebhookSecret",
    "Apple__SharedSecret",
    "Google__PlayStore__ServiceAccountJson",
    "NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY"
)

function Assert-SafeRemoteValue {
    param(
        [Parameter(Mandatory = $true)][string]$Name,
        [Parameter(Mandatory = $true)][string]$Value
    )

    if ($Value -notmatch '^[A-Za-z0-9._~/@:-]+$') {
        Write-Error "$Name contains unsupported characters for remote shell execution."
        exit 1
    }
}

Assert-SafeRemoteValue "VMHost" $VMHost
Assert-SafeRemoteValue "VMUser" $VMUser
Assert-SafeRemoteValue "RemoteAppPath" $RemoteAppPath
Assert-SafeRemoteValue "RemoteEnvFile" $RemoteEnvFile
Assert-SafeRemoteValue "GitRef" $GitRef

function Invoke-Remote {
    param([Parameter(Mandatory = $true)][string]$Command)

    ssh $SSHTarget "cd $RemoteAppPath && $Command"
}

function Assert-RemoteReachable {
    Write-Host "Checking SSH connectivity..." -ForegroundColor Yellow

    ssh -o ConnectTimeout=10 $SSHTarget "cd $RemoteAppPath && pwd" | Out-Null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Unable to reach $SSHTarget over SSH or access $RemoteAppPath. Deployment/live verification cannot continue."
        exit 1
    }

    Write-Host "SSH connectivity verified." -ForegroundColor Green
    Write-Host ""
}

function Assert-ProductionEnvironment {
    Write-Host "Validating production environment..." -ForegroundColor Yellow

    $validationScript = @"
set -eu
test -f '$RemoteEnvFile'
for key in $($RequiredProductionEnv -join ' '); do
  grep -Eq "^`$key=.+" '$RemoteEnvFile'
done
grep -Eq '^ASPNETCORE_ENVIRONMENT=Production$' '$RemoteEnvFile'
! grep -Eq '^SKIP_DB_MIGRATIONS=true$' '$RemoteEnvFile'
"@

    Invoke-Remote $validationScript
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Production deployment requires $RemoteEnvFile on the VM with ASPNETCORE_ENVIRONMENT=Production, SKIP_DB_MIGRATIONS not set to true, and externally supplied JWT, database, Redis, Stripe, Apple, and Google Play secrets."
        exit 1
    }

    Write-Host "Production environment validated." -ForegroundColor Green
    Write-Host ""
}

Assert-RemoteReachable

# Health check only mode
if ($HealthCheckOnly) {
    Write-Host "Running health checks..." -ForegroundColor Yellow
    Write-Host ""

    Assert-ProductionEnvironment

    Write-Host "[Backend Health]" -ForegroundColor Cyan
    ssh $SSHTarget "curl -s http://localhost:8020/health/live"
    Write-Host ""

    Write-Host "[Frontend Health]" -ForegroundColor Cyan
    ssh $SSHTarget "curl -s http://localhost:3020/api/health 2>/dev/null || echo 'Frontend health endpoint not available'"
    Write-Host ""

    Write-Host "[Container Status]" -ForegroundColor Cyan
    Invoke-Remote "$ComposeCommand ps"
    exit 0
}

Write-Host "Target: $SSHTarget" -ForegroundColor Green
Write-Host ""

Assert-ProductionEnvironment

# Step 1: Pull latest code
Write-Host "[1/4] Pulling latest code from git ref $GitRef..." -ForegroundColor Yellow
Invoke-Remote "git fetch origin $GitRef && git checkout $GitRef && git pull --ff-only origin $GitRef"
if ($LASTEXITCODE -ne 0) {
    Write-Error "Failed to pull latest code"
    exit 1
}
Write-Host "Done!" -ForegroundColor Green
Write-Host ""

# Step 2: Build and deploy
if (-not $FrontendOnly) {
    Write-Host "[2/4] Building and deploying backend..." -ForegroundColor Yellow
    Invoke-Remote "$ComposeCommand up -d --build backend"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to deploy backend"
        exit 1
    }
    Write-Host "Backend deployed!" -ForegroundColor Green
    Write-Host ""
}

if (-not $BackendOnly) {
    Write-Host "[3/4] Building and deploying frontend..." -ForegroundColor Yellow
    Invoke-Remote "$ComposeCommand up -d --build frontend"
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Failed to deploy frontend"
        exit 1
    }
    Write-Host "Frontend deployed!" -ForegroundColor Green
    Write-Host ""
}

# Step 3: Health checks
Write-Host "[4/4] Running health checks..." -ForegroundColor Yellow
Start-Sleep -Seconds 10  # Wait for services to start

Write-Host ""
Write-Host "Backend Health:" -ForegroundColor Cyan
ssh $SSHTarget "curl -s http://localhost:8020/health/live"
Write-Host ""

Write-Host "Container Status:" -ForegroundColor Cyan
Invoke-Remote "$ComposeCommand ps"
Write-Host ""

# Done
Write-Host "========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Production URLs:" -ForegroundColor Cyan
Write-Host "  Frontend: https://geoleap.app" -ForegroundColor White
Write-Host "  Backend:  https://api.geoleap.app" -ForegroundColor White
Write-Host ""
Write-Host "To verify fixes:" -ForegroundColor Yellow
Write-Host "  1. Visit https://geoleap.app/about (should load About page)" -ForegroundColor White
Write-Host "  2. Visit https://geoleap.app/help (should load Help page)" -ForegroundColor White
Write-Host "  3. Visit https://geoleap.app/support (should require admin role)" -ForegroundColor White
Write-Host ""
