# Zairmag ERP - Full install (git pull + Backend + Admin + Mobile)
# Compatible with Windows PowerShell 5.1 and PowerShell 7+
# ASCII-only, no && operators

$ErrorActionPreference = 'Stop'
try { [Console]::OutputEncoding = [System.Text.Encoding]::UTF8 } catch {}

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $root

$TOTAL = 7

function Write-Header($msg) {
    Write-Host ""
    Write-Host "============================================================" -ForegroundColor Cyan
    Write-Host "  $msg" -ForegroundColor Cyan
    Write-Host "============================================================" -ForegroundColor Cyan
}

function Write-Step($num, $msg) {
    Write-Host ""
    Write-Host "[$num/$TOTAL] $msg" -ForegroundColor Yellow
    Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray
}

function Write-Ok($msg)   { Write-Host "  OK    $msg" -ForegroundColor Green }
function Write-Warn($msg) { Write-Host "  WARN  $msg" -ForegroundColor Yellow }
function Write-Err($msg)  { Write-Host "  ERROR $msg" -ForegroundColor Red }
function Write-Info($msg) { Write-Host "        $msg" -ForegroundColor Gray }

function Exec($cmd) {
    Write-Host "  >> $cmd" -ForegroundColor DarkGray
    & cmd /c $cmd
    return $LASTEXITCODE
}

function Ask-YesNo($question) {
    $a = Read-Host "  $question (y/N)"
    return ($a -eq 'y' -or $a -eq 'Y')
}

Write-Header "Zairmag ERP - Full install"
Write-Host ""
Write-Host "  Steps:" -ForegroundColor Gray
Write-Host "    1. Prerequisite check (Node, npm, git, PostgreSQL, disk space)"
Write-Host "    2. Pull the latest code from GitHub"
Write-Host "    3. Environment files (.env)"
Write-Host "    4. Backend  (npm install + prisma generate + migrate)"
Write-Host "    5. Admin    (npm install + production build)"
Write-Host "    6. Mobile   (npm install)"
Write-Host "    7. Initial admin user"
Write-Host ""
Write-Host "  Estimated time: 10-20 minutes" -ForegroundColor Gray
Write-Host ""
$null = Read-Host "  Press ENTER to start (Ctrl+C to cancel)"

# ============================================================
# STEP 1: Prerequisites
# ============================================================
Write-Step 1 "Prerequisite check"

# --- Node.js (20+) ---
$node = Get-Command node -ErrorAction SilentlyContinue
if (-not $node) {
    Write-Err "Node.js not found. Install the LTS build from https://nodejs.org/"
    exit 1
}
$nodeVer = (& node -v)
$nodeMajor = 0
try { $nodeMajor = [int](($nodeVer -replace '^v','').Split('.')[0]) } catch {}
if ($nodeMajor -lt 20) {
    Write-Err "Node.js $nodeVer is too old - version 20 or newer is required."
    exit 1
}
Write-Ok "Node.js $nodeVer"

# --- npm ---
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $npm) { Write-Err "npm not found."; exit 1 }
Write-Ok "npm $(& npm -v)"

# --- git ---
$git = Get-Command git -ErrorAction SilentlyContinue
if ($git) { Write-Ok "git present" }
else { Write-Warn "git not found - step 2 will be skipped." }

# --- PostgreSQL ---
$psql = Get-Command psql -ErrorAction SilentlyContinue
if (-not $psql) {
    Write-Warn "PostgreSQL (psql) not found in PATH."
    Write-Info "Install: winget install -e --id PostgreSQL.PostgreSQL.16"
    Write-Info "Database migration will fail without it."
    if (-not (Ask-YesNo "Continue anyway?")) { exit 1 }
} else {
    Write-Ok "$(& psql --version)"
}

# --- Disk space ---
# A full install (node_modules + Gradle caches + builds) needs roughly 15 GB.
try {
    $driveLetter = (Get-Item $root).PSDrive.Name
    $vol = Get-Volume -DriveLetter $driveLetter -ErrorAction Stop
    $freeGB = [math]::Round($vol.SizeRemaining / 1GB, 1)
    if ($freeGB -lt 10) {
        Write-Warn "Only $freeGB GB free on drive ${driveLetter}: - at least 10 GB is recommended."
        Write-Info "Free up space with: npm cache clean --force"
        if (-not (Ask-YesNo "Continue anyway?")) { exit 1 }
    } else {
        Write-Ok "Disk space: $freeGB GB free on ${driveLetter}:"
    }
} catch {
    Write-Warn "Could not check free disk space."
}

# ============================================================
# STEP 2: Pull latest code
# ============================================================
Write-Step 2 "Pull the latest code"

if (-not (Test-Path (Join-Path $root ".git"))) {
    Write-Warn "Not a git repository - skipping."
} elseif (-not $git) {
    Write-Warn "git not installed - skipping."
} else {
    $dirty = & git status --porcelain
    if ($dirty) {
        Write-Warn "You have local changes that are not committed:"
        foreach ($line in ($dirty | Select-Object -First 10)) { Write-Info $line }
        Write-Info "Skipping git pull so nothing gets overwritten."
        Write-Info "Commit or discard those changes, then run this script again."
    } else {
        $branch = (& git rev-parse --abbrev-ref HEAD)
        Write-Host "  Current branch: $branch" -ForegroundColor Cyan
        $code = Exec "git pull --ff-only"
        if ($code -ne 0) {
            Write-Warn "git pull failed (exit $code) - continuing with the local copy."
        } else {
            Write-Ok "Code is up to date"
        }
    }
}

# ============================================================
# STEP 3: Environment files
# ============================================================
Write-Step 3 "Environment files"

$backendEnv = Join-Path $root "backend\.env"
$adminEnv   = Join-Path $root "admin\.env.local"
$mobileEnv  = Join-Path $root "mobile\.env"

# backend/.env holds database credentials and JWT secrets - it must be filled
# in by a human, so send them to the interactive helper instead of guessing.
if (-not (Test-Path $backendEnv)) {
    Write-Err "backend\.env is missing."
    Write-Info "It holds the database URL and JWT secrets, so it cannot be generated blindly."
    Write-Info "Run setup-env.bat first - it creates all three files interactively."
    exit 1
}
Write-Ok "backend\.env"

# The other two only contain a server URL, so a sensible default is fine.
foreach ($pair in @(@($adminEnv, "admin\.env.example"), @($mobileEnv, "mobile\.env.example"))) {
    $target = $pair[0]
    $sample = Join-Path $root $pair[1]
    $name = Split-Path $target -Leaf
    $folder = Split-Path (Split-Path $target -Parent) -Leaf
    if (Test-Path $target) {
        Write-Ok "$folder\$name"
    } elseif (Test-Path $sample) {
        Copy-Item $sample $target
        Write-Ok "Created $name from the example file"
        Write-Info "Edit it if the API address is not the default."
    } else {
        Write-Warn "$name is missing and no example file was found."
    }
}

# ============================================================
# STEP 4: Backend
# ============================================================
Write-Step 4 "Backend - install, generate, migrate"

Push-Location (Join-Path $root "backend")
try {
    $code = Exec "npm install"
    if ($code -ne 0) { Write-Err "Backend npm install failed (exit $code)"; exit 1 }
    Write-Ok "Backend dependencies installed"

    $code = Exec "npx prisma generate"
    if ($code -ne 0) { Write-Warn "prisma generate failed (exit $code)" }
    else { Write-Ok "Prisma client generated" }

    $code = Exec "npx prisma migrate deploy"
    if ($code -ne 0) {
        Write-Warn "Database migration failed (exit $code)"
        Write-Info "Check DATABASE_URL in backend\.env"
        Write-Info "Make sure the PostgreSQL service is running"
        Write-Info "Create the database if it does not exist:  createdb -U postgres icecream_erp"
        if (-not (Ask-YesNo "Continue to the Admin install?")) { exit 1 }
        $script:migrationOk = $false
    } else {
        Write-Ok "Database migrations applied"
        $script:migrationOk = $true
    }

    $code = Exec "npm run build"
    if ($code -ne 0) { Write-Warn "Backend build failed (exit $code) - dev mode still works." }
    else { Write-Ok "Backend compiled to dist\" }
} finally {
    Pop-Location
}

# ============================================================
# STEP 5: Admin
# ============================================================
Write-Step 5 "Admin - install and build"

Push-Location (Join-Path $root "admin")
try {
    $code = Exec "npm install"
    if ($code -ne 0) { Write-Err "Admin npm install failed (exit $code)"; exit 1 }
    Write-Ok "Admin dependencies installed"

    Write-Host "  Building (this takes a few minutes)..." -ForegroundColor Cyan
    $code = Exec "npm run build"
    if ($code -ne 0) {
        Write-Warn "Admin build failed (exit $code)"
        Write-Info "Dev mode (npm run dev) will still work."
    } else {
        Write-Ok "Admin production build created"
    }
} finally {
    Pop-Location
}

# ============================================================
# STEP 6: Mobile
# ============================================================
Write-Step 6 "Mobile - install"

Push-Location (Join-Path $root "mobile")
try {
    $code = Exec "npm install"
    if ($code -ne 0) { Write-Err "Mobile npm install failed (exit $code)"; exit 1 }
    Write-Ok "Mobile dependencies installed"
} finally {
    Pop-Location
}

# ============================================================
# STEP 7: Initial admin user
# ============================================================
Write-Step 7 "Initial admin user"

if ($script:migrationOk -eq $false) {
    Write-Warn "Skipped - the database is not ready."
} else {
    Push-Location (Join-Path $root "backend")
    try {
        # The script is idempotent: it skips if the user already exists.
        $code = Exec "npx ts-node scripts/create-admin.ts"
        if ($code -ne 0) {
            Write-Warn "Could not create the admin user (exit $code)"
            Write-Info "Run it manually: cd backend && npx ts-node scripts/create-admin.ts"
        } else {
            Write-Ok "Admin user ready"
        }
    } finally {
        Pop-Location
    }
}

# ============================================================
# Optional: Android build toolchain
# ============================================================
Write-Host ""
Write-Host "Optional - Android APK build toolchain" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------" -ForegroundColor DarkGray

$jdk = "C:\Program Files\Android\Android Studio\jbr\bin\java.exe"
$sdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"
$keystoreProps = Join-Path $root "mobile\credentials\keystore.properties"

if (Test-Path $jdk) { Write-Ok "JDK (Android Studio)" }
else { Write-Warn "Android Studio JDK not found - build-apk.bat will not work." }

if (Test-Path $sdk) { Write-Ok "Android SDK" }
else { Write-Warn "Android SDK not found - install it from Android Studio." }

if (Test-Path $keystoreProps) {
    Write-Ok "Signing keystore present"
} else {
    Write-Warn "mobile\credentials\ is missing (it is not stored in git)."
    Write-Info "Restore it from your backup, otherwise release APKs will be"
    Write-Info "signed with the debug key and cannot update existing installs."
}

# ============================================================
# Summary
# ============================================================
Write-Header "INSTALL COMPLETE"
Write-Host ""
Write-Host "  Login:" -ForegroundColor Cyan
Write-Host "    admin@icecream.mn / password123   (change it after first login)"
Write-Host ""
Write-Host "  Start the system:" -ForegroundColor Cyan
Write-Host "    start.bat                 backend (3000) + admin (3001)"
Write-Host ""
Write-Host "  Publish over Tailscale (phones, HTTPS):" -ForegroundColor Cyan
Write-Host "    tailscale-serve.bat       see TAILSCALE.md"
Write-Host ""
Write-Host "  Build the Android app:" -ForegroundColor Cyan
Write-Host "    build-apk.bat             output: zairmag-erp.apk"
Write-Host ""

# Show Tailscale address if available
try {
    $tsExe = "C:\Program Files\Tailscale\tailscale.exe"
    if (Test-Path $tsExe) {
        $json = & $tsExe status --json 2>$null | Out-String
        if ($json) {
            $st = $json | ConvertFrom-Json
            $dns = $st.Self.DNSName
            if ($dns) {
                $dns = $dns.TrimEnd('.')
                Write-Host "  Tailscale address: https://$dns" -ForegroundColor Cyan
                Write-Host ""
            }
        }
    }
} catch {}
