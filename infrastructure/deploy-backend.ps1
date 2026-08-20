# GeoLeap Backend Deployment Script
# Deploys the .NET backend to Azure App Service

param(
    [string]$ResourceGroup = "geoleap-prod",
    [string]$Location = "eastus",
    [string]$AppServicePlan = "geoleap-api-plan",
    [string]$WebAppName = "geoleap-api",
    [string]$SqlServerName = "geoleap-sql",
    [string]$SqlDbName = "GeoLeap",
    [string]$RedisCacheName = "geoleap-redis",
    [string]$Environment = "Production"
)

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "GeoLeap Backend Deployment" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

# Check if Azure CLI is installed
if (-not (Get-Command az -ErrorAction SilentlyContinue)) {
    Write-Error "Azure CLI is not installed. Please install from https://docs.microsoft.com/en-us/cli/azure/install-azure-cli"
    exit 1
}

# Login check
$account = az account show 2>$null | ConvertFrom-Json
if (-not $account) {
    Write-Host "Please login to Azure..." -ForegroundColor Yellow
    az login
}

Write-Host "`nUsing subscription: $($account.name)" -ForegroundColor Green

# Create Resource Group
Write-Host "`n[1/7] Creating Resource Group..." -ForegroundColor Yellow
az group create --name $ResourceGroup --location $Location

# Create App Service Plan
Write-Host "`n[2/7] Creating App Service Plan (B2 tier)..." -ForegroundColor Yellow
az appservice plan create `
    --name $AppServicePlan `
    --resource-group $ResourceGroup `
    --sku B2 `
    --is-linux

# Create Web App
Write-Host "`n[3/7] Creating Web App..." -ForegroundColor Yellow
az webapp create `
    --name $WebAppName `
    --resource-group $ResourceGroup `
    --plan $AppServicePlan `
    --runtime "DOTNETCORE:9.0"

# Create SQL Server
Write-Host "`n[4/7] Creating SQL Server..." -ForegroundColor Yellow
$sqlPassword = [System.Web.Security.Membership]::GeneratePassword(16, 4)
az sql server create `
    --name $SqlServerName `
    --resource-group $ResourceGroup `
    --location $Location `
    --admin-user "geoleapadmin" `
    --admin-password $sqlPassword

# Create SQL Database
Write-Host "`n[5/7] Creating SQL Database..." -ForegroundColor Yellow
az sql db create `
    --name $SqlDbName `
    --resource-group $ResourceGroup `
    --server $SqlServerName `
    --service-objective S0

# Allow Azure services to access SQL Server
az sql server firewall-rule create `
    --name "AllowAzureServices" `
    --resource-group $ResourceGroup `
    --server $SqlServerName `
    --start-ip-address 0.0.0.0 `
    --end-ip-address 0.0.0.0

# Create Redis Cache
Write-Host "`n[6/7] Creating Redis Cache (this may take 15-20 minutes)..." -ForegroundColor Yellow
az redis create `
    --name $RedisCacheName `
    --resource-group $ResourceGroup `
    --location $Location `
    --sku Basic `
    --vm-size C0

# Get connection strings
Write-Host "`n[7/7] Configuring App Settings..." -ForegroundColor Yellow
$sqlFqdn = az sql server show --name $SqlServerName --resource-group $ResourceGroup --query fullyQualifiedDomainName -o tsv
$redisKeys = az redis list-keys --name $RedisCacheName --resource-group $ResourceGroup | ConvertFrom-Json
$redisHost = az redis show --name $RedisCacheName --resource-group $ResourceGroup --query hostName -o tsv

$connectionString = "Server=tcp:$sqlFqdn,1433;Initial Catalog=$SqlDbName;Persist Security Info=False;User ID=geoleapadmin;Password=$sqlPassword;MultipleActiveResultSets=False;Encrypt=True;TrustServerCertificate=False;Connection Timeout=30;"
$redisConnection = "$redisHost`:6380,password=$($redisKeys.primaryKey),ssl=True,abortConnect=False"

# Configure app settings
az webapp config appsettings set `
    --name $WebAppName `
    --resource-group $ResourceGroup `
    --settings `
        ASPNETCORE_ENVIRONMENT=$Environment `
        ConnectionStrings__DefaultConnection=$connectionString `
        ConnectionStrings__Redis=$redisConnection `
        JWT__Secret="$(New-Guid)-$(New-Guid)" `
        JWT__Issuer="GeoLeap.Api" `
        JWT__Audience="GeoLeap.Client"

# Enable HTTPS only
az webapp update `
    --name $WebAppName `
    --resource-group $ResourceGroup `
    --https-only true

# Build and deploy the backend
Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "Building and Deploying Backend..." -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan

Push-Location "$PSScriptRoot\..\backend\GeoLeap.Api"

# Publish the app
dotnet publish -c Release -o ./publish

# Create deployment package
Compress-Archive -Path ./publish/* -DestinationPath ./deploy.zip -Force

# Deploy to Azure
az webapp deploy `
    --name $WebAppName `
    --resource-group $ResourceGroup `
    --src-path ./deploy.zip `
    --type zip

# Cleanup
Remove-Item -Path ./publish -Recurse -Force
Remove-Item -Path ./deploy.zip -Force

Pop-Location

# Output results
Write-Host "`n========================================" -ForegroundColor Green
Write-Host "Deployment Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""
Write-Host "Backend URL: https://$WebAppName.azurewebsites.net" -ForegroundColor Cyan
Write-Host ""
Write-Host "IMPORTANT: Update frontend environment variables:" -ForegroundColor Yellow
Write-Host "  NEXT_PUBLIC_API_URL=https://$WebAppName.azurewebsites.net" -ForegroundColor White
Write-Host "  INTERNAL_API_URL=https://$WebAppName.azurewebsites.net" -ForegroundColor White
Write-Host ""
Write-Host "SQL Password (save this securely): $sqlPassword" -ForegroundColor Red
Write-Host ""
