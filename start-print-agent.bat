@echo off
title SecurePrint - Windows Hardware Print Agent (USB / Wi-Fi / Bluetooth)
cls
echo ====================================================================
echo   SECURE PRINT SHOP - SMART HARDWARE PRINT AGENT
echo   Auto-Scans: USB Printers ^| Wi-Fi (LAN) ^| Bluetooth (Thermal/POS)
echo ====================================================================
echo.
cd /d "%~dp0"

if not exist "print-agent\node_modules" (
  echo [Info] Installing print-agent dependencies...
  cd print-agent
  call npm install
  cd ..
  echo.
)

set CURRENT_SERVER=http://localhost:5000
if exist "print-agent\.env" (
  for /f "tokens=1,* delims==" %%A in (print-agent\.env) do (
    if "%%A"=="SERVER_URL" set CURRENT_SERVER=%%B
  )
)

echo Current Target Server: %CURRENT_SERVER%
echo.
echo Press [ENTER] to connect to current server, OR
set /p USER_SERVER="Type your deployed Cloud Backend URL (or press ENTER): "

if not "%USER_SERVER%"=="" (
  echo Updating SERVER_URL in print-agent\.env...
  powershell -Command "(Get-Content print-agent\.env) -replace 'SERVER_URL=.*', 'SERVER_URL=%USER_SERVER%' | Set-Content print-agent\.env"
  set CURRENT_SERVER=%USER_SERVER%
)

echo.
echo Starting Smart Hardware Print Agent on: %CURRENT_SERVER% ...
echo ====================================================================
echo.
node print-agent/agent.js
pause
