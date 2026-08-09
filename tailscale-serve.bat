@echo off
title Zairmag ERP - Tailscale Serve
color 0B
echo.
echo  ========================================
echo    Tailscale Serve setup
echo  ========================================
echo.

set TS="C:\Program Files\Tailscale\tailscale.exe"

if not exist %TS% (
    echo  ERROR: Tailscale not found.
    echo  Install from https://tailscale.com/download/windows
    pause
    exit /b 1
)

echo  [1/2] Clearing old serve config...
%TS% serve reset >nul 2>&1

echo  [2/2] Publishing admin + API over HTTPS...
:: Everything is served from a single origin, so no CORS setup is needed:
::   /          -> admin        (port 3001)
::   /api/*     -> backend API  (port 3000)
::   /uploads/* -> product images
::   /health    -> health check
%TS% serve --bg --https=443 3001
%TS% serve --bg --https=443 --set-path=/api http://localhost:3000/api
%TS% serve --bg --https=443 --set-path=/uploads http://localhost:3000/uploads
%TS% serve --bg --https=443 --set-path=/health http://localhost:3000/health

echo.
echo  ========================================
%TS% serve status
echo  ========================================
echo.

:: Hostname is assigned by Tailscale and differs per machine and per
:: account, so read it instead of hard-coding it.
set "TSHOST="
for /f "usebackq delims=" %%i in (`powershell -NoProfile -Command "try { ((& %TS% status --json ^| ConvertFrom-Json).Self.DNSName).TrimEnd('.') } catch { '' }"`) do set "TSHOST=%%i"

if defined TSHOST (
    echo   URL: https://%TSHOST%
    echo.
    echo   Enter this in the app under "Server settings" - no port needed.
) else (
    echo   Could not read the Tailscale hostname.
    echo   Find it with:  tailscale status --json
    echo   or at:         https://login.tailscale.com/admin/machines
)
echo.
echo   NOTES:
echo   - backend (3000) and admin (3001) must be running - see start.bat
echo   - devices must be signed in to the same Tailscale account
echo   - this config survives reboots, no need to run it again
echo   - use the hostname, NOT the 100.x.x.x IP (Tailscale routes by Host header)
echo.
pause
