@echo off
cd /d "%~dp0"
if not exist node_modules (
  echo Installing local research agent dependencies...
  npm install
)
node agent.mjs
pause
