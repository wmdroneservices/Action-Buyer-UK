$ErrorActionPreference = 'Stop'

# GearCashOut Research PC launcher.
#
# This script may live outside the repository at:
#   C:\GearCashOut-Config\Start-GearCashOut-AI.ps1
#
# Therefore NEVER assume the script's own folder is the Node project folder.
# The repository/agent location is resolved explicitly.

$defaultAgentDir = 'C:\gearcashout\Action-Buyer-UK-main\tools\gear-ai-local-agent'
$agentDir = if ($env:GEARCASHOUT_AGENT_DIR) { $env:GEARCASHOUT_AGENT_DIR } else { $defaultAgentDir }

function Write-GearLog([string]$Message) {
    Write-Host "$(Get-Date -Format 'dd/MM/yyyy HH:mm:ss') $Message"
}

Write-GearLog "Starting GearCashOut AI Worker launcher..."
Write-GearLog "Configuration folder: $PSScriptRoot"
Write-GearLog "Agent folder: $agentDir"

$packageJson = Join-Path $agentDir 'package.json'
if (-not (Test-Path $packageJson)) {
    Write-GearLog "ERROR: package.json was not found at $packageJson"
    Write-GearLog "The launcher will not run npm from the configuration folder."
    Write-GearLog "Expected extracted repository folder: $defaultAgentDir"
    Write-GearLog "Set GEARCASHOUT_AGENT_DIR if the repository was moved."
    Read-Host "Press Enter to close"
    exit 1
}

Set-Location $agentDir

if (-not (Test-Path ".\node_modules\@supabase\supabase-js")) {
    Write-GearLog "Dependencies missing. Running npm install..."
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-GearLog "ERROR: npm install failed with exit code $LASTEXITCODE"
        Read-Host "Press Enter to close"
        exit $LASTEXITCODE
    }
}

while ($true) {
    Write-GearLog "Launching GearCashOut AI worker from $agentDir..."
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
