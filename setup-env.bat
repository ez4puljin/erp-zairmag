@echo off
title Zairmag ERP - .env файлуудыг үүсгэх
cd /d "%~dp0"
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0setup-env.ps1"
echo.
pause
