$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentDir = $scriptRoot

Write-Host "$(Get-Date -Format 'dd/MM/yyyy HH:mm:ss') Starting GearCashOut AI Worker..."
Set-Location $agentDir

if (-not (Test-Path ".\node_modules\@supabase\supabase-js")) {
    Write-Host "Dependencies missing. Running npm install..."
    npm install
}

npm start
