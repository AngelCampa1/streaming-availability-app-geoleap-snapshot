# GeoLeap Development Startup Script for Windows
# This script helps you start the development environment on Windows

param(
    [switch]$WithRedis,
    [switch]$WithDocker,
    [switch]$SkipFrontend,
    [switch]$SkipBackend
)

Write-Host "🚀 Starting GeoLeap Development Environment (Windows)" -ForegroundColor Cyan
Write-Host ""

# Check prerequisites
Write-Host "📋 Checking prerequisites..." -ForegroundColor Yellow

# Check .NET
$dotnetVersion = dotnet --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ .NET SDK installed: $dotnetVersion" -ForegroundColor Green
} else {
    Write-Host "❌ .NET SDK not found. Please install from: https://dotnet.microsoft.com/download" -ForegroundColor Red
    exit 1
}

# Check Node.js
$nodeVersion = node --version 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ Node.js installed: $nodeVersion" -ForegroundColor Green
} else {
    Write-Host "❌ Node.js not found. Please install from: https://nodejs.org/" -ForegroundColor Red
    exit 1
}

# Check SQL Server
Write-Host "🔍 Checking SQL Server..." -ForegroundColor Yellow
$sqlService = Get-Service | Where-Object {$_.Name -like "*SQL*" -and $_.Name -like "*EXPRESS*"} | Select-Object -First 1
if ($sqlService) {
    if ($sqlService.Status -eq 'Running') {
        Write-Host "✅ SQL Server is running: $($sqlService.Name)" -ForegroundColor Green
    } else {
        Write-Host "⚠️  SQL Server found but not running: $($sqlService.Name)" -ForegroundColor Yellow
        Write-Host "   Attempting to start..." -ForegroundColor Yellow
        Start-Service $sqlService.Name
        Write-Host "✅ SQL Server started" -ForegroundColor Green
    }
} else {
    Write-Host "❌ SQL Server not found. Please ensure SQL Server Express is installed." -ForegroundColor Red
    exit 1
}

# Test SQL Server connection
Write-Host "🔍 Testing SQL Server connection..." -ForegroundColor Yellow
$sqlTest = sqlcmd -S "localhost\SQLEXPRESS01" -E -Q "SELECT @@VERSION" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ SQL Server connection successful" -ForegroundColor Green
} else {
    Write-Host "❌ Cannot connect to SQL Server at localhost\SQLEXPRESS01" -ForegroundColor Red
    Write-Host "   Please verify the instance name with: sqlcmd -L" -ForegroundColor Yellow
    exit 1
}

# Start Redis if requested
if ($WithRedis -or $WithDocker) {
    Write-Host ""
    Write-Host "🐳 Starting Redis with Docker..." -ForegroundColor Yellow
    
    # Check if Docker is available
    $dockerVersion = docker --version 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Docker not found. Install Docker Desktop or run without -WithRedis flag" -ForegroundColor Red
        exit 1
    }
    
    docker-compose -f docker-compose.dev.yml up redis -d
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Redis started successfully" -ForegroundColor Green
    } else {
        Write-Host "❌ Failed to start Redis. Continuing without Redis (will use in-memory cache)..." -ForegroundColor Yellow
    }
} else {
    Write-Host ""
    Write-Host "ℹ️  Redis not requested. Backend will use in-memory cache." -ForegroundColor Cyan
    Write-Host "   Use -WithRedis flag to start Redis in Docker." -ForegroundColor Cyan
}

Write-Host ""
Write-Host "=" -repeat 60 -ForegroundColor Cyan

# Create .env.local for frontend if it doesn't exist
if (-not (Test-Path "frontend\.env.local")) {
    Write-Host ""
    Write-Host "📝 Creating frontend/.env.local..." -ForegroundColor Yellow
    @"
# GeoLeap Frontend Environment Variables
# Port 3020 is assigned to GeoLeap to avoid conflicts with other projects
NEXT_PUBLIC_API_URL=http://localhost:8020
PORT=3020
"@ | Out-File -FilePath "frontend\.env.local" -Encoding utf8
    Write-Host "✅ Created frontend/.env.local" -ForegroundColor Green
}

# Start Backend
if (-not $SkipBackend) {
    Write-Host ""
    Write-Host "🔧 Starting Backend..." -ForegroundColor Yellow
    Write-Host "   URL: http://localhost:8020" -ForegroundColor Cyan
    Write-Host ""
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
        Write-Host '🔧 Backend Server' -ForegroundColor Green
        Write-Host '=================' -ForegroundColor Green
        Write-Host ''
        cd backend\GeoLeap.Api
        dotnet watch run
"@
    
    Write-Host "✅ Backend started in new window" -ForegroundColor Green
    Start-Sleep -Seconds 2
}

# Start Frontend
if (-not $SkipFrontend) {
Write-Host ""
Write-Host "🎨 Starting Frontend..." -ForegroundColor Yellow
Write-Host "   URL: http://localhost:3020" -ForegroundColor Cyan
Write-Host ""
    
    Start-Process powershell -ArgumentList "-NoExit", "-Command", @"
        Write-Host '🎨 Frontend Server' -ForegroundColor Green
        Write-Host '==================' -ForegroundColor Green
        Write-Host ''
        cd frontend
        npm run dev
"@
    
    Write-Host "✅ Frontend started in new window" -ForegroundColor Green
}

Write-Host ""
Write-Host "=" -repeat 60 -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Development environment started successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "📍 Services:" -ForegroundColor Cyan
Write-Host "   • Backend:  http://localhost:8020" -ForegroundColor White
Write-Host "   • Frontend: http://localhost:3020" -ForegroundColor White
Write-Host "   • Mobile:   http://localhost:5070 (Metro bundler)" -ForegroundColor White
Write-Host "   • Database: localhost\SQLEXPRESS01" -ForegroundColor White
if ($WithRedis -or $WithDocker) {
    Write-Host "   • Redis:    localhost:6379" -ForegroundColor White
} else {
    Write-Host "   • Cache:    In-Memory" -ForegroundColor White
}
Write-Host ""
Write-Host "📚 Documentation: WINDOWS_SETUP_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "To stop services:" -ForegroundColor Yellow
Write-Host "   1. Press Ctrl+C in each window" -ForegroundColor White
if ($WithRedis -or $WithDocker) {
    Write-Host "   2. Run: docker-compose -f docker-compose.dev.yml down" -ForegroundColor White
}
Write-Host ""

