@echo off
title Ice Cream ERP - Shutdown
color 0C
echo.
echo  ========================================
echo    Ice Cream Distribution ERP System
echo    Stopping all services...
echo  ========================================
echo.

:: Kill process on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo   Stopping Backend (PID %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill process on port 3001
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    echo   Stopping Admin (PID %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill process on port 8081
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081 " ^| findstr "LISTENING"') do (
    echo   Stopping Mobile Expo (PID %%a)...
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill named windows
taskkill /FI "WINDOWTITLE eq ICE-CREAM-BACKEND" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ICE-CREAM-ADMIN" /F >nul 2>&1
taskkill /FI "WINDOWTITLE eq ICE-CREAM-MOBILE" /F >nul 2>&1

echo.
echo   All services stopped.
echo.
pause
