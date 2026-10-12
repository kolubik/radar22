# RadarTG PowerShell Starter
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "               RadarTG Local Server" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

if (-not (Test-Path "node_modules")) {
    Write-Host "[1/2] Installing dependencies (npm install)..." -ForegroundColor Yellow
    npm install
}

Write-Host "[2/2] Starting server at http://localhost:3000 ..." -ForegroundColor Green
Start-Process "http://localhost:3000"

npx --yes tsx server.ts
