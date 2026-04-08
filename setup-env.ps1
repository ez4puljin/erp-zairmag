# Zairmag ERP - Interactive .env creator
# Compatible with Windows PowerShell 5.1 and PowerShell 7+
# ASCII-only to avoid encoding issues

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

function Write-Header($msg) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Write-Section($msg) {
    Write-Host ""
    Write-Host "--- $msg ---" -ForegroundColor Yellow
}

function Ask($prompt, $defaultValue) {
    if ($defaultValue) {
        $v = Read-Host "  $prompt [$defaultValue]"
        if ([string]::IsNullOrWhiteSpace($v)) { return $defaultValue }
        return $v
    }
    while ($true) {
        $v = Read-Host "  $prompt"
        if (-not [string]::IsNullOrWhiteSpace($v)) { return $v }
        Write-Host "  Required field!" -ForegroundColor Red
    }
}

function AskSecret($prompt) {
    while ($true) {
        $sec = Read-Host "  $prompt" -AsSecureString
        $bstr = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec)
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto($bstr)
        [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($bstr)
        if (-not [string]::IsNullOrWhiteSpace($plain)) { return $plain }
        Write-Host "  Required field!" -ForegroundColor Red
    }
}

function Confirm-Overwrite($file) {
    if (Test-Path $file) {
        Write-Host ""
        Write-Host "  [WARN] $file already exists." -ForegroundColor Yellow
        $yn = Read-Host "  Overwrite? (y/N)"
        return ($yn -eq 'y' -or $yn -eq 'Y')
    }
    return $true
}

function New-RandomSecret {
    return ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
}

Write-Header "Zairmag ERP - .env file creator"
Write-Host ""
Write-Host "  This script will create 3 .env files interactively:" -ForegroundColor Gray
Write-Host "    1. backend\.env         (database, JWT)"
Write-Host "    2. admin\.env.local     (API URL)"
Write-Host "    3. mobile\.env          (API URL for Expo Go)"
Write-Host ""
Write-Host "  Press ENTER to accept default values, or type a new value." -ForegroundColor Gray
Write-Host ""
$null = Read-Host "  Press ENTER to continue"

# ============================================================
# BACKEND .env
# ============================================================
Write-Section "1. BACKEND .env"

$backendEnv = Join-Path $root "backend\.env"
$backendDone = $false

if (-not (Confirm-Overwrite $backendEnv)) {
    Write-Host "  Backend .env skipped" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "  PostgreSQL connection:" -ForegroundColor Cyan

    $pgUser = Ask "Username" "postgres"
    $pgPass = AskSecret "Password"
    $pgHost = Ask "Host" "localhost"
    $pgPort = Ask "Port" "5432"
    $pgDb   = Ask "Database name" "icecream_erp"

    Write-Host ""
    Write-Host "  JWT secrets:" -ForegroundColor Cyan
    $useAutoJwt = Ask "Auto-generate JWT secrets? (Y/n)" "Y"
    if ($useAutoJwt -eq 'Y' -or $useAutoJwt -eq 'y') {
        $jwtSecret = New-RandomSecret
        $jwtRefresh = New-RandomSecret
        Write-Host "  OK - Random JWT secrets generated" -ForegroundColor Green
    } else {
        $jwtSecret = AskSecret "JWT_SECRET"
        $jwtRefresh = AskSecret "JWT_REFRESH_SECRET"
    }

    Write-Host ""
    $bePort = Ask "Backend port" "3000"
    $nodeEnv = Ask "NODE_ENV (development / production)" "production"

    # Build .env content line by line (avoid here-string parser quirks)
    $lines = @()
    $lines += "# Database"
    $lines += ('DATABASE_URL="postgresql://' + $pgUser + ':' + $pgPass + '@' + $pgHost + ':' + $pgPort + '/' + $pgDb + '?schema=public"')
    $lines += ""
    $lines += "# JWT"
    $lines += ('JWT_SECRET="' + $jwtSecret + '"')
    $lines += ('JWT_REFRESH_SECRET="' + $jwtRefresh + '"')
    $lines += 'JWT_EXPIRATION="15m"'
    $lines += 'JWT_REFRESH_EXPIRATION="7d"'
    $lines += ""
    $lines += "# App"
    $lines += ('PORT=' + $bePort)
    $lines += ('NODE_ENV="' + $nodeEnv + '"')

    New-Item -Path (Split-Path $backendEnv -Parent) -ItemType Directory -Force | Out-Null
    $lines -join "`r`n" | Set-Content -Path $backendEnv -Encoding ASCII
    Write-Host ""
    Write-Host "  OK - backend\.env created" -ForegroundColor Green
    $backendDone = $true
}

# ============================================================
# ADMIN .env.local
# ============================================================
Write-Section "2. ADMIN .env.local"

$adminEnv = Join-Path $root "admin\.env.local"

if (-not (Confirm-Overwrite $adminEnv)) {
    Write-Host "  Admin .env.local skipped" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "  Admin web connects to backend via which URL?" -ForegroundColor Cyan
    Write-Host "  (Usually localhost since they run on the same PC)" -ForegroundColor Gray
    $adminApi = Ask "NEXT_PUBLIC_API_URL" "http://localhost:3000"

    New-Item -Path (Split-Path $adminEnv -Parent) -ItemType Directory -Force | Out-Null
    Set-Content -Path $adminEnv -Value ("NEXT_PUBLIC_API_URL=" + $adminApi) -Encoding ASCII
    Write-Host ""
    Write-Host "  OK - admin\.env.local created" -ForegroundColor Green
}

# ============================================================
# MOBILE .env
# ============================================================
Write-Section "3. MOBILE .env (for Expo Go)"

$mobileEnv = Join-Path $root "mobile\.env"

if (-not (Confirm-Overwrite $mobileEnv)) {
    Write-Host "  Mobile .env skipped" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "  Phone app connects to backend via which URL?" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Options:" -ForegroundColor Gray
    Write-Host "    localhost      - only PC emulator" -ForegroundColor Gray
    Write-Host "    LAN IP         - same Wi-Fi (example: 192.168.1.65)" -ForegroundColor Gray
    Write-Host "    Tailscale IP   - remote access (example: 100.96.x.x)" -ForegroundColor Gray
    Write-Host ""

    # List available IP addresses
    Write-Host "  Available IP addresses on this PC:" -ForegroundColor Gray
    try {
        $addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
            $_.IPAddress -notlike '127.*' -and
            $_.IPAddress -notlike '169.254.*' -and
            $_.PrefixOrigin -ne 'WellKnown'
        }
        foreach ($a in $addrs) {
            $ip = $a.IPAddress
            # Check if Tailscale range 100.64.0.0 - 100.127.255.255
            $parts = $ip.Split('.')
            $isTs = $false
            if ($parts.Length -eq 4 -and $parts[0] -eq '100') {
                $second = [int]$parts[1]
                if ($second -ge 64 -and $second -le 127) { $isTs = $true }
            }
            $tag = ""
            if ($isTs) { $tag = " [TAILSCALE]" }
            Write-Host ("    " + $ip + "  (" + $a.InterfaceAlias + ")" + $tag) -ForegroundColor Cyan
        }
    } catch {
        Write-Host "    (Could not enumerate IPs)" -ForegroundColor DarkGray
    }
    Write-Host ""

    $mobileApi = Ask "EXPO_PUBLIC_API_URL" "http://localhost:3000"

    New-Item -Path (Split-Path $mobileEnv -Parent) -ItemType Directory -Force | Out-Null
    Set-Content -Path $mobileEnv -Value ("EXPO_PUBLIC_API_URL=" + $mobileApi) -Encoding ASCII
    Write-Host ""
    Write-Host "  OK - mobile\.env created" -ForegroundColor Green
}

# ============================================================
# Summary
# ============================================================
Write-Header "SUCCESS"
Write-Host ""
Write-Host "  .env files created:" -ForegroundColor Green
if (Test-Path $backendEnv) { Write-Host "    OK  backend\.env" -ForegroundColor Green }
if (Test-Path $adminEnv)   { Write-Host "    OK  admin\.env.local" -ForegroundColor Green }
if (Test-Path $mobileEnv)  { Write-Host "    OK  mobile\.env" -ForegroundColor Green }
Write-Host ""

Write-Host "  SECURITY WARNING:" -ForegroundColor Yellow
Write-Host "  -----------------" -ForegroundColor Yellow
Write-Host "  * These files contain passwords and JWT secrets." -ForegroundColor Yellow
Write-Host "  * They are NOT pushed to GitHub (listed in .gitignore)." -ForegroundColor Yellow
Write-Host "  * Do not share or screenshot them." -ForegroundColor Yellow
Write-Host ""

Write-Host "  Next steps:" -ForegroundColor Cyan
Write-Host "    cd backend"
Write-Host "    npm install --legacy-peer-deps"
Write-Host "    npx prisma generate"
Write-Host "    npx prisma migrate deploy"
Write-Host ""
Write-Host "    cd ..\admin"
Write-Host "    npm install --legacy-peer-deps"
Write-Host "    npm run build"
Write-Host ""
Write-Host "    cd ..\mobile"
Write-Host "    npm install --legacy-peer-deps"
Write-Host ""

# ============================================================
# Self-delete option
# ============================================================
Write-Host "  Delete this setup-env script now?" -ForegroundColor Cyan
Write-Host "  (.env files are created, no need to run again)" -ForegroundColor Gray
$delYn = Read-Host "  Delete? (y/N)"

if ($delYn -eq 'y' -or $delYn -eq 'Y') {
    $batPath = Join-Path $root "setup-env.bat"
    $ps1Path = Join-Path $root "setup-env.ps1"

    # Schedule self-delete via a temp batch (run after this script exits)
    $tmpBat = Join-Path $env:TEMP ("zairmag-self-delete-" + [guid]::NewGuid().ToString('N') + ".bat")

    $delLines = @()
    $delLines += '@echo off'
    $delLines += 'timeout /t 2 /nobreak >nul'
    $delLines += ('del /f /q "' + $batPath + '" 2>nul')
    $delLines += ('del /f /q "' + $ps1Path + '" 2>nul')
    $delLines += 'del /f /q "%~f0"'
    $delLines -join "`r`n" | Set-Content -Path $tmpBat -Encoding ASCII

    Write-Host ""
    Write-Host "  setup-env.bat / setup-env.ps1 will be deleted in 2 seconds..." -ForegroundColor Yellow
    Start-Process -FilePath "cmd.exe" -ArgumentList "/c", $tmpBat -WindowStyle Hidden
} else {
    Write-Host "  Scripts kept. You can delete them manually later." -ForegroundColor Gray
}

Write-Host ""
