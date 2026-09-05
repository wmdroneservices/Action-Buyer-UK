$ErrorActionPreference = 'Stop'

# GearCashOut Research PC launcher.
# The launcher starts the persistent supervisor, not the disposable research
# worker directly. The supervisor remains online after STOP so the dashboard can
# START the worker again remotely.

$defaultAgentDir = 'C:\\gearcashout\\Action-Buyer-UK-main\\tools\\gear-ai-local-agent'
$agentDir = if ($env:GEARCASHOUT_AGENT_DIR) { $env:GEARCASHOUT_AGENT_DIR } else { $defaultAgentDir }

function Write-GearLog([string]$Message) {
    Write-Host "$(Get-Date -Format 'dd/MM/yyyy HH:mm:ss') $Message"
}

Write-GearLog "Starting GearCashOut Research PC supervisor..."
Write-GearLog "Configuration folder: $PSScriptRoot"
Write-GearLog "Agent folder: $agentDir"

$supervisor = Join-Path $agentDir 'supervisor.mjs'
$packageJson = Join-Path $agentDir 'package.json'
if (-not (Test-Path $supervisor)) {
    Write-GearLog "ERROR: supervisor.mjs was not found at $supervisor"
    Read-Host "Press Enter to close"
    exit 1
}
if (-not (Test-Path $packageJson)) {
    Write-GearLog "ERROR: package.json was not found at $packageJson"
    Read-Host "Press Enter to close"
    exit 1
}

Set-Location $agentDir

if (-not (Test-Path ".\\node_modules\\@supabase\\supabase-js")) {
    Write-GearLog "Dependencies missing. Running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-GearLog "ERROR: npm install failed with exit code $LASTEXITCODE"
        Read-Host "Press Enter to close"
        exit $LASTEXITCODE
    }
}

while ($true) {
    Write-GearLog "Launching persistent Research PC supervisor from $agentDir..."
    node .\\supervisor.mjs
    $exitCode = $LASTEXITCODE
    Write-GearLog "Research PC supervisor stopped or crashed (exit code $exitCode). Restarting automatically in 10 seconds..."
    Start-Sleep -Seconds 10
}
