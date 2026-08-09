@echo off
title Zairmag ERP - APK build (WSL2 / Ubuntu)
cd /d "%~dp0"

echo.
echo ============================================================
echo   Zairmag ERP - Android APK build (WSL2)
echo ============================================================
echo.
echo  Windows deer ninja ni 260 temdegtiin zamiin hyzgaartai tul
echo  release APK-g Linux (WSL2) dotor build hiine.
echo.
echo  Ustgamjtai hugatsaa: 25-30 minut (ehnii udaa illuu udna)
echo.

wsl.exe -d Ubuntu -u root -- test -d /opt/android-sdk
if errorlevel 1 (
    echo  ERROR: Ubuntu dotor Android SDK oldsongui.
    echo         wsl-setup.sh-g negent ajilluulna uu.
    pause
    exit /b 1
)

wsl.exe -d Ubuntu -u root -- bash /root/wsl-build-apk.sh
if errorlevel 1 (
    echo.
    echo  BUILD AMJILTGUI. Deerh aldaag shalgana uu.
    pause
    exit /b 1
)

echo.
echo  Garalt: zairmag-erp.apk
echo.
pause
