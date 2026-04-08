# Zairmag ERP - Full install (Backend + Admin + Mobile)
# Compatible with Windows PowerShell 5.1 and PowerShell 7+
# ASCII-only, no && operators

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

function Write-Step($num, $total, $msg) {
    Write-Host ""
    Write-Host "[$num/$total] $msg" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
}

function Write-Ok($msg)   { Write-Host "  OK    $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  WARN  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  ERROR $msg" -ForegroundColor Red }

function Exec($cmd) {
    Write-Host "  >> $cmd" -ForegroundColor DarkGray
    & cmd /c $cmd
    return $LASTEXITCODE
}

Write-Header "Zairmag ERP - Full install (Backend + Admin + Mobile)"
Write-Host ""
Write-Host "  This script will install and build:" -ForegroundColor Gray
Write-Host "    1. Prerequisite check (Node.js, npm, PostgreSQL)"
Write-Host "    2. Backend   (npm install + prisma generate + prisma migrate)"
Write-Host "    3. Admin     (npm install + next build)"
Write-Host "    4. Mobile    (npm install for Expo Go)"
Write-Host ""
Write-Host "  Estimated time: 10-20 minutes (depending on PC and internet)" -ForegroundColor Gray
Write-Host ""
$null = Read-Host "  Press ENTER to start (Ctrl+C to cancel)"

# ============================================================
# STEP 1: Prerequisite check
# ============================================================
Write-Step 1 4 "Prerequisite check"

# Node.js
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Err "Node.js not found. Install from https://nodejs.org/"
    exit 1
}
$nodeVer = (& node -v)
Write-Ok "Node.js $nodeVer"

# npm
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) {
    Write-Err "npm not found."
    exit 1
}
$npmVer = (& npm -v)
Write-Ok "npm $npmVer"

# PostgreSQL
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Warn "PostgreSQL (psql) not found in PATH."
    Write-Host "         Backend migration may fail." -ForegroundColor Yellow
    Write-Host "         Install: winget install -e --id PostgreSQL.PostgreSQL.16" -ForegroundColor Yellow
    $cont = Read-Host "  Continue anyway? (y/N)"
    if ($cont -ne 'y' -and $cont -ne 'Y') { exit 1 }
} else {
    $pgVer = (& psql --version)
    Write-Ok "$pgVer"
}

# Check .env files exist
Write-Host ""
Write-Host "  Checking .env files:" -ForegroundColor Cyan

$backendEnvPath = Join-Path $root "backend\.env"
$adminEnvPath = Join-Path $root "admin\.env.local"
$mobileEnvPath = Join-Path $root "mobile\.env"

$missing = @()
if (-not (Test-Path $backendEnvPath)) { $missing += "backend\.env" }
if (-not (Test-Path $adminEnvPath))   { $missing += "admin\.env.local" }
if (-not (Test-Path $mobileEnvPath))  { $missing += "mobile\.env" }

if ($missing.Count -gt 0) {
    Write-Err "Missing .env files:"
    foreach ($m in $missing) { Write-Host "    - $m" -ForegroundColor Red }
    Write-Host ""
    Write-Host "  Run setup-env.bat first to create them interactively." -ForegroundColor Yellow
    exit 1
}

Write-Ok "backend\.env"
Write-Ok "admin\.env.local"
Write-Ok "mobile\.env"

# ============================================================
# STEP 2: Backend
# ============================================================
Write-Step 2 4 "Backend install + Prisma migration"

Push-Location (Join-Path $root "backend")
try {
    Write-Host "  Running npm install..." -ForegroundColor Cyan
    $code = Exec "npm install --legacy-peer-deps"
    if ($code -ne 0) {
        Write-Err "Backend npm install failed (exit $code)"
        exit 1
    }
    Write-Ok "Backend dependencies installed"

    Write-Host ""
    Write-Host "  Running prisma generate..." -ForegroundColor Cyan
    $code = Exec "npx prisma generate"
    if ($code -ne 0) {
        Write-Warn "prisma generate failed (exit $code)"
    } else {
        Write-Ok "Prisma client generated"
    }

    Write-Host ""
    Write-Host "  Running prisma migrate deploy..." -ForegroundColor Cyan
    $code = Exec "npx prisma migrate deploy"
    if ($code -ne 0) {
        Write-Warn "Prisma migrate failed (exit $code)"
        Write-Host "         Check your DATABASE_URL in backend\.env" -ForegroundColor Yellow
        Write-Host "         Make sure PostgreSQL service is running" -ForegroundColor Yellow
        Write-Host "         Make sure the database exists (createdb icecream_erp)" -ForegroundColor Yellow
        $cont = Read-Host "  Continue to Admin install? (y/N)"
        if ($cont -ne 'y' -and $cont -ne 'Y') { exit 1 }
    } else {
        Write-Ok "Database migrations applied"
    }
} finally {
    Pop-Location
}

# ============================================================
# STEP 3: Admin
# ============================================================
Write-Step 3 4 "Admin install + build"

Push-Location (Join-Path $root "admin")
try {
    Write-Host "  Running npm install..." -ForegroundColor Cyan
    $code = Exec "npm install --legacy-peer-deps"
    if ($code -ne 0) {
        Write-Err "Admin npm install failed (exit $code)"
        exit 1
    }
    Write-Ok "Admin dependencies installed"

    Write-Host ""
    Write-Host "  Running next build (5-10 minutes)..." -ForegroundColor Cyan
    $code = Exec "npm run build"
    if ($code -ne 0) {
        Write-Warn "Admin build failed (exit $code)"
        Write-Host "         Dev mode (npm run dev) will still work." -ForegroundColor Yellow
    } else {
        Write-Ok "Admin production build created"
    }
} finally {
    Pop-Location
}

# ============================================================
# STEP 4: Mobile
# ============================================================
Write-Step 4 4 "Mobile install (for Expo Go)"

Push-Location (Join-Path $root "mobile")
try {
    Write-Host "  Running npm install..." -ForegroundColor Cyan
    $code = Exec "npm install --legacy-peer-deps"
    if ($code -ne 0) {
        Write-Err "Mobile npm install failed (exit $code)"
        exit 1
    }
    Write-Ok "Mobile dependencies installed"
} finally {
    Pop-Location
}

# ============================================================
# Summary
# ============================================================
Write-Header "INSTALL COMPLETE"
Write-Host ""
Write-Host "  All three projects are ready:" -ForegroundColor Green
Write-Host "    OK  backend  - NestJS API (port 3000)"
Write-Host "    OK  admin    - Next.js web (port 3001)"
Write-Host "    OK  mobile   - React Native / Expo Go"
Write-Host ""

Write-Host "  To run the system:" -ForegroundColor Cyan
Write-Host ""
Write-Host "    Backend:" -ForegroundColor White
Write-Host "      cd backend"
Write-Host "      npm run start"
Write-Host ""
Write-Host "    Admin (in another terminal):" -ForegroundColor White
Write-Host "      cd admin"
Write-Host "      npm run start -- -H 0.0.0.0 -p 3001"
Write-Host ""
Write-Host "    Mobile Expo Go (in another terminal):" -ForegroundColor White
Write-Host "      cd mobile"
Write-Host "      npx expo start --lan"
Write-Host ""

Write-Host "  Or use run.bat to start backend + admin automatically." -ForegroundColor Cyan
Write-Host ""

# Show Tailscale IP if available
try {
    $addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue | Where-Object {
        $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown'
    }
    $tsIp = $null
    foreach ($a in $addrs) {
        $parts = $a.IPAddress.Split('.')
        if ($parts.Length -eq 4 -and $parts[0] -eq '100') {
            $second = [int]$parts[1]
            if ($second -ge 64 -and $second -le 127) {
                $tsIp = $a.IPAddress
                break
            }
        }
    }
    if ($tsIp) {
        Write-Host "  Tailscale IP: $tsIp" -ForegroundColor Cyan
        Write-Host "  Phone can connect via: http://${tsIp}:3000" -ForegroundColor Cyan
        Write-Host ""
    }
} catch {}
