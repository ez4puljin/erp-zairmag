@echo off
title Zairmag ERP - Install (git pull + Backend + Admin + Mobile)
cd /d "%~dp0"

powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
set "RC=%ERRORLEVEL%"

echo.
if not "%RC%"=="0" (
    echo  Install did not finish cleanly (exit code %RC%).
    echo  Scroll up to find the first ERROR line.
)
pause
