# FitTrack — One-Command Public & LAN Deployment Launcher
$ErrorActionPreference = "Continue"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$pgBin = "C:\Program Files\PostgreSQL\18\bin"
$pgData = Join-Path $root "backend\.pgdata"

Write-Host "==========================================================" -ForegroundColor Green
Write-Host " Starting FitTrack Full-Stack Server & Public Tunnel..." -ForegroundColor Green
Write-Host "==========================================================" -ForegroundColor Green

# 1. Start PostgreSQL 18 on port 5433 if not already running
& "$pgBin\pg_ctl.exe" -D $pgData status | Out-Null
if ($LASTEXITCODE -ne 0) {
    & "$pgBin\pg_ctl.exe" -D $pgData -l (Join-Path $root "backend\postgres.log") -o "-p 5433" start
}

# 2. Build frontend if dist doesn't exist
if (-not (Test-Path (Join-Path $root "frontend\dist\index.html"))) {
    Push-Location (Join-Path $root "frontend")
    npm run build
    Pop-Location
}

# 3. Start FastAPI unified server in background job
Start-Process -FilePath "python" -ArgumentList "-m uvicorn app.main:app --host 0.0.0.0 --port 8000" -WorkingDirectory (Join-Path $root "backend") -WindowStyle Minimized

Start-Sleep -Seconds 2
Write-Host "Local Link:  http://localhost:8000" -ForegroundColor Cyan
Write-Host "Starting Cloudflare Public HTTPS Tunnel..." -ForegroundColor Yellow

# 4. Run Cloudflare Tunnel in foreground so public link is displayed
& "C:\Program Files (x86)\cloudflared\cloudflared.exe" tunnel --url http://127.0.0.1:8000 --no-autoupdate
