@echo off
title SecurePrint - Silent Auto-Print Browser (No Agent, No Ctrl+P)
cls
echo ====================================================================
echo   SECURE PRINT SHOP - 100%% ZERO-CLICK SILENT AUTO-PRINT
echo   No Local Agent Needed ^| No Terminal Needed ^| No Ctrl+P Needed
echo ====================================================================
echo.

set TARGET_URL=http://localhost:3001/shopkeeper

if exist "print-agent\.env" (
  for /f "tokens=1,* delims==" %%A in (print-agent\.env) do (
    if "%%A"=="SERVER_URL" set TARGET_URL=%%B/shopkeeper
  )
)

echo Current Shopkeeper Portal URL: %TARGET_URL%
echo.
echo Press [ENTER] to launch, or type your deployed frontend URL:
set /p USER_URL="URL: "

if not "%USER_URL%"=="" (
  set TARGET_URL=%USER_URL%
)

echo.
echo Launching Browser in Silent Kiosk Auto-Print Mode...
echo (In this mode, all prints roll out of your printer automatically!)
echo ====================================================================
echo.

:: Try Google Chrome first, fallback to Microsoft Edge
start "" "chrome.exe" --kiosk-printing "%TARGET_URL%" 2>nul
if %ERRORLEVEL% NEQ 0 (
  start "" "msedge.exe" --kiosk-printing "%TARGET_URL%"
)

timeout /t 3
exit
