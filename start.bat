@echo off
title Ice Cream ERP - Startup
color 0B
echo.
echo  ========================================
echo    Ice Cream Distribution ERP System
echo    Starting all services...
echo  ========================================
echo.

:: ----------------------------------------
:: 1. Kill existing processes on ports
:: ----------------------------------------
echo [1/5] Stopping existing services...

:: Kill process on port 3000 (NestJS Backend)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000 " ^| findstr "LISTENING"') do (
    echo   Stopping PID %%a on port 3000...
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill process on port 3001 (Next.js Admin)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3001 " ^| findstr "LISTENING"') do (
    echo   Stopping PID %%a on port 3001...
    taskkill /PID %%a /F >nul 2>&1
)

:: Kill process on port 8081 (Expo Metro)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":8081 " ^| findstr "LISTENING"') do (
    echo   Stopping PID %%a on port 8081...
    taskkill /PID %%a /F >nul 2>&1
)

echo   Done.
echo.

:: ----------------------------------------
:: 2. Check PostgreSQL (auto-detect version)
:: ----------------------------------------
echo [2/5] Checking PostgreSQL...

set PG_RUNNING=0
for %%V in (17 16 15 14 13) do (
    sc query postgresql-x64-%%V >nul 2>&1
    if not errorlevel 1 (
        sc query postgresql-x64-%%V | findstr "RUNNING" >nul 2>&1
        if not errorlevel 1 (
            echo   PostgreSQL %%V is running.
            set PG_RUNNING=1
            goto :pg_done
        ) else (
            echo   Starting PostgreSQL %%V service...
            net start postgresql-x64-%%V >nul 2>&1
            if not errorlevel 1 (
                echo   PostgreSQL %%V started.
                set PG_RUNNING=1
                timeout /t 2 /nobreak >nul
                goto :pg_done
            )
        )
    )
)

:pg_done
if %PG_RUNNING%==0 (
    echo   WARNING: PostgreSQL service not found. Make sure PostgreSQL is installed and running.
    echo   Trying to continue anyway...
)
echo.

:: ----------------------------------------
:: 3. Start NestJS Backend (port 3000)
:: ----------------------------------------
echo [3/5] Starting Backend (NestJS) on port 3000...
cd /d "%~dp0backend"
start "ICE-CREAM-BACKEND" /min cmd /c "title ICE-CREAM-BACKEND && node node_modules\@nestjs\cli\bin\nest.js start --watch"
cd /d "%~dp0"
echo   Backend starting...
echo.

:: ----------------------------------------
:: 4. Start Next.js Admin (port 3001)
:: ----------------------------------------
echo [4/5] Starting Admin Dashboard (Next.js) on port 3001...
cd /d "%~dp0admin"
:: Production build ashiglana. "next dev" bol bundle-g hüsèlt bür deer
:: compile hiideg tul Tailscale/LAN-aar hol PC-ees hanhad mash udaan
:: achaalagddag. Build ni increment tul 2 dahi udaagaas hoish hurdan.
echo   Building admin (first run takes ~30s)...
call npx next build
start "ICE-CREAM-ADMIN" /min cmd /c "title ICE-CREAM-ADMIN && npx next start -p 3001 -H 0.0.0.0"
cd /d "%~dp0"
echo   Admin Dashboard starting...
echo.

:: ----------------------------------------
:: 5. Start Expo Mobile App (port 8081)
:: ----------------------------------------
echo [5/5] Starting Mobile App (Expo) on port 8081...
cd /d "%~dp0mobile"
start "ICE-CREAM-MOBILE" /min cmd /c "title ICE-CREAM-MOBILE && npx expo start"
cd /d "%~dp0"
echo   Mobile App starting...
echo.

:: ----------------------------------------
:: Done
:: ----------------------------------------
echo  ========================================
echo    All services started!
echo  ========================================
echo.
echo    Backend:    http://localhost:3000
echo    Admin:      http://localhost:3001
echo    Mobile:     Expo QR code (port 8081)
echo.
echo    Admin Login:
echo      Email:    admin@icecream.mn
echo      Pass:     password123
echo.
echo    Customer Login:
echo      Email:    store1@customer.mn
echo      Pass:     password123
echo.
echo  ========================================
echo.
echo  Press any key to open Admin Dashboard...
pause >nul
start http://localhost:3001
