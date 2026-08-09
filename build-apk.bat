@echo off
setlocal
title Zairmag ERP - Build APK (local)
color 0B
echo.
echo  ========================================
echo    Building Android APK on this PC
echo  ========================================
echo.

cd /d "%~dp0mobile"

:: ----------------------------------------
:: Toolchain
:: ----------------------------------------
if not defined JAVA_HOME set "JAVA_HOME=C:\Program Files\Android\Android Studio\jbr"
if not defined ANDROID_HOME set "ANDROID_HOME=%LOCALAPPDATA%\Android\Sdk"

:: Gradle caches and build temp files need several GB. Drive C: is nearly
:: full, so keep them on D: instead.
if not defined GRADLE_USER_HOME (
    if exist "D:\" (
        set "GRADLE_USER_HOME=D:\gradle-home"
    )
)

if not exist "%JAVA_HOME%\bin\java.exe" (
    echo  ERROR: JDK not found at %JAVA_HOME%
    echo  Install Android Studio, or set JAVA_HOME manually.
    pause
    exit /b 1
)
if not exist "%ANDROID_HOME%\platform-tools" (
    echo  ERROR: Android SDK not found at %ANDROID_HOME%
    echo  Open Android Studio - SDK Manager and install the SDK.
    pause
    exit /b 1
)

echo  JAVA_HOME         = %JAVA_HOME%
echo  ANDROID_HOME      = %ANDROID_HOME%
echo  GRADLE_USER_HOME  = %GRADLE_USER_HOME%
echo.

if not exist "credentials\keystore.properties" (
    echo  WARNING: credentials\keystore.properties not found.
    echo  The APK will be signed with the debug key and cannot be
    echo  installed over a properly signed build.
    echo.
)

:: ----------------------------------------
:: 1. Generate the native android/ project
:: ----------------------------------------
echo  [1/3] Generating native project (expo prebuild)...
call npx expo prebuild --platform android --clean --no-install
if errorlevel 1 (
    echo  ERROR: prebuild failed.
    pause
    exit /b 1
)
echo.

:: ----------------------------------------
:: 2. Gradle release build
:: ----------------------------------------
echo  [2/3] Compiling release APK (this takes a few minutes)...
cd android
call gradlew.bat assembleRelease --no-daemon
if errorlevel 1 (
    echo  ERROR: gradle build failed. See the output above.
    cd ..
    pause
    exit /b 1
)
cd ..
echo.

:: ----------------------------------------
:: 3. Copy the result next to this script
:: ----------------------------------------
echo  [3/3] Copying APK...
set "SRC=android\app\build\outputs\apk\release\app-release.apk"
if not exist "%SRC%" (
    echo  ERROR: APK not found at %SRC%
    pause
    exit /b 1
)
copy /y "%SRC%" "%~dp0zairmag-erp.apk" >nul

echo.
echo  ========================================
echo    DONE
echo  ========================================
echo.
echo   APK: %~dp0zairmag-erp.apk
echo.
echo   Copy it to the driver phones and install.
echo   Server URL is baked in from mobile\.env (EXPO_PUBLIC_API_URL).
echo.
pause
