$ErrorActionPreference = 'Stop'

$scriptRoot = Split-Path -Parent $MyInvocation.MyCommand.Path
$agentDir = $scriptRoot

function Write-GearLog([string]$Message) {
    Write-Host "$(Get-Date -Format 'dd/MM/yyyy HH:mm:ss') $Message"
}

Write-GearLog "Starting GearCashOut AI Worker..."
Set-Location $agentDir

if (-not (Test-Path ".\node_modules\@supabase\supabase-js")) {
    Write-GearLog "Dependencies missing. Running npm install..."
    npm install
}

while ($true) {
    Write-GearLog "Launching GearCashOut AI worker..."
    try {
        npm start
        $exitCode = $LASTEXITCODE
    }
    catch {
        Write-GearLog "Worker launcher error: $($_.Exception.Message)"
        $exitCode = 1
    }

    Write-GearLog "Worker stopped or crashed (exit code $exitCode). Restarting automatically in 10 seconds..."
    Start-Sleep -Seconds 10
}
