@echo off
title Zairmag ERP - Install (Backend + Admin + Mobile)
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0install.ps1"
echo.
pause
