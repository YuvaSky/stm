@echo off
title SecurePrint - Windows Hardware Print Agent
cls
echo ========================================================
echo   SECURE PRINT SHOP - WINDOWS HARDWARE PRINT AGENT
echo ========================================================
echo.
echo Connecting to Windows Print Spooler and Print Server...
echo.
cd /d "%~dp0"

if not exist "print-agent\node_modules" (
  echo [Info] Installing print-agent dependencies...
  cd print-agent
  npm install
  cd ..
)

node print-agent/agent.js
pause
