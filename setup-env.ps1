# Zairmag ERP - Interactive .env файл үүсгэгч
# Шинэ PC дээр ажиллуулж backend, admin, mobile-ийн .env файлуудыг зэрэг үүсгэнэ.

$ErrorActionPreference = 'Stop'
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8
$OutputEncoding = [System.Text.Encoding]::UTF8

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
function Ask($prompt, $default) {
    if ($default) {
        $v = Read-Host "  $prompt [$default]"
        if ([string]::IsNullOrWhiteSpace($v)) { return $default }
        return $v
    }
    while ($true) {
        $v = Read-Host "  $prompt"
        if (-not [string]::IsNullOrWhiteSpace($v)) { return $v }
        Write-Host "  Заавал бөглөнө үү!" -ForegroundColor Red
    }
}
function AskSecret($prompt) {
    while ($true) {
        $sec = Read-Host "  $prompt" -AsSecureString
        $plain = [Runtime.InteropServices.Marshal]::PtrToStringAuto([Runtime.InteropServices.Marshal]::SecureStringToBSTR($sec))
        if (-not [string]::IsNullOrWhiteSpace($plain)) { return $plain }
        Write-Host "  Заавал бөглөнө үү!" -ForegroundColor Red
    }
}
function Confirm-Overwrite($file) {
    if (Test-Path $file) {
        Write-Host ""
        Write-Host "  [АНХААР] $file аль хэдийн байна." -ForegroundColor Yellow
        $yn = Read-Host "  Дарж бичих үү? (y/N)"
        return ($yn -eq 'y' -or $yn -eq 'Y')
    }
    return $true
}
function New-RandomSecret {
    return ([guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N'))
}

Write-Header "Zairmag ERP — .env файлуудыг үүсгэх"
Write-Host ""
Write-Host "  Энэ скрипт нь 3 .env файлыг асууж үүсгэнэ:" -ForegroundColor Gray
Write-Host "    1. backend\.env         (database, JWT)"
Write-Host "    2. admin\.env.local     (API URL)"
Write-Host "    3. mobile\.env          (API URL — Expo Go-д)"
Write-Host ""
Write-Host "  ENTER дарж default утгыг хүлээж авах, эсвэл шинэ утгаа бичнэ." -ForegroundColor Gray
Write-Host ""
$null = Read-Host "  Үргэлжлүүлэхэд ENTER дарна уу"

# ─────────────────────────────────────────────────────────────
# BACKEND .env
# ─────────────────────────────────────────────────────────────
Write-Section "1. BACKEND .env"

$backendEnv = Join-Path $root "backend\.env"
if (-not (Confirm-Overwrite $backendEnv)) {
    Write-Host "  Backend .env алгаслаа" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "  PostgreSQL холболтын мэдээлэл:" -ForegroundColor Cyan

    $pgUser = Ask "Username" "postgres"
    $pgPass = AskSecret "Password"
    $pgHost = Ask "Host" "localhost"
    $pgPort = Ask "Port" "5432"
    $pgDb   = Ask "Database name" "icecream_erp"

    Write-Host ""
    Write-Host "  JWT түлхүүрүүд:" -ForegroundColor Cyan
    $useAutoJwt = Ask "JWT secrets автомат үүсгэх үү? (Y/n)" "Y"
    if ($useAutoJwt -eq 'Y' -or $useAutoJwt -eq 'y') {
        $jwtSecret = New-RandomSecret
        $jwtRefresh = New-RandomSecret
        Write-Host "  OK - Санамсаргүй JWT secrets үүсгэлээ" -ForegroundColor Green
    } else {
        $jwtSecret = AskSecret "JWT_SECRET"
        $jwtRefresh = AskSecret "JWT_REFRESH_SECRET"
    }

    Write-Host ""
    $port = Ask "Backend port" "3000"
    $nodeEnv = Ask "NODE_ENV (development / production)" "production"

    $backendContent = @"
# Database
DATABASE_URL="postgresql://${pgUser}:${pgPass}@${pgHost}:${pgPort}/${pgDb}?schema=public"

# JWT
JWT_SECRET="$jwtSecret"
JWT_REFRESH_SECRET="$jwtRefresh"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"

# App
PORT=$port
NODE_ENV="$nodeEnv"
"@

    New-Item -Path (Split-Path $backendEnv -Parent) -ItemType Directory -Force | Out-Null
    Set-Content -Path $backendEnv -Value $backendContent -Encoding UTF8
    Write-Host ""
    Write-Host "  ✓ backend\.env үүсгэлээ" -ForegroundColor Green
}

# ─────────────────────────────────────────────────────────────
# ADMIN .env.local
# ─────────────────────────────────────────────────────────────
Write-Section "2. ADMIN .env.local"

$adminEnv = Join-Path $root "admin\.env.local"
if (-not (Confirm-Overwrite $adminEnv)) {
    Write-Host "  Admin .env.local алгаслаа" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "  Admin web нь ямар URL-ээр backend руу хандах вэ?" -ForegroundColor Cyan
    Write-Host "  (Ижил компьютер дээр ажиллуулах тул ихэвчлэн localhost)" -ForegroundColor Gray
    $adminApi = Ask "NEXT_PUBLIC_API_URL" "http://localhost:3000"

    New-Item -Path (Split-Path $adminEnv -Parent) -ItemType Directory -Force | Out-Null
    Set-Content -Path $adminEnv -Value "NEXT_PUBLIC_API_URL=$adminApi" -Encoding UTF8
    Write-Host ""
    Write-Host "  ✓ admin\.env.local үүсгэлээ" -ForegroundColor Green
}

# ─────────────────────────────────────────────────────────────
# MOBILE .env
# ─────────────────────────────────────────────────────────────
Write-Section "3. MOBILE .env (Expo Go)"

$mobileEnv = Join-Path $root "mobile\.env"
if (-not (Confirm-Overwrite $mobileEnv)) {
    Write-Host "  Mobile .env алгаслаа" -ForegroundColor Gray
} else {
    Write-Host ""
    Write-Host "  Гар утасны апп нь ямар URL-ээр backend руу хандах вэ?" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "  Сонголтууд:" -ForegroundColor Gray
    Write-Host "    localhost      - зөвхөн PC-ээс эмулятор дээр" -ForegroundColor Gray
    Write-Host "    LAN IP         - same Wi-Fi (жишээ: 192.168.1.65)" -ForegroundColor Gray
    Write-Host "    Tailscale IP   - алсын байршил (жишээ: 100.96.x.x)" -ForegroundColor Gray
    Write-Host ""

    # PC-ийн боломжтой IP хаягуудыг жагсаах
    Write-Host "  Энэ PC-ийн боломжтой IP хаягууд:" -ForegroundColor Gray
    try {
        $addrs = Get-NetIPAddress -AddressFamily IPv4 -ErrorAction SilentlyContinue |
            Where-Object {
                $_.IPAddress -notlike '127.*' -and
                $_.IPAddress -notlike '169.254.*' -and
                $_.PrefixOrigin -ne 'WellKnown'
            }
        foreach ($a in $addrs) {
            $isTs = $a.IPAddress -match '^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.'
            $tag = if ($isTs) { " [TAILSCALE]" } else { "" }
            Write-Host "    $($a.IPAddress)  ($($a.InterfaceAlias))$tag" -ForegroundColor Cyan
        }
    } catch {}
    Write-Host ""

    $mobileApi = Ask "EXPO_PUBLIC_API_URL" "http://localhost:3000"

    New-Item -Path (Split-Path $mobileEnv -Parent) -ItemType Directory -Force | Out-Null
    Set-Content -Path $mobileEnv -Value "EXPO_PUBLIC_API_URL=$mobileApi" -Encoding UTF8
    Write-Host ""
    Write-Host "  ✓ mobile\.env үүсгэлээ" -ForegroundColor Green
}

# ─────────────────────────────────────────────────────────────
# Дүгнэлт
# ─────────────────────────────────────────────────────────────
Write-Header "АМЖИЛТТАЙ"
Write-Host ""
Write-Host "  .env файлууд үүсгэгдсэн:" -ForegroundColor Green
if (Test-Path $backendEnv) { Write-Host "    ✓ backend\.env" -ForegroundColor Green }
if (Test-Path $adminEnv)   { Write-Host "    ✓ admin\.env.local" -ForegroundColor Green }
if (Test-Path $mobileEnv)  { Write-Host "    ✓ mobile\.env" -ForegroundColor Green }
Write-Host ""

# Аюулгүй байдлын анхааруулга
Write-Host "  АЮУЛГҮЙ БАЙДЛЫН СЭРЭМЖЛҮҮЛЭГ:" -ForegroundColor Yellow
Write-Host "  ──────────────────────────────" -ForegroundColor Yellow
Write-Host "  • Эдгээр файлд нууц үг, JWT түлхүүр бичигдсэн." -ForegroundColor Yellow
Write-Host "  • GitHub-д push ХИЙГДЭХГҮЙ (.gitignore-д хасагдсан)." -ForegroundColor Yellow
Write-Host "  • Хэн нэгэнд илгээх, screenshot авахгүй байгаарай." -ForegroundColor Yellow
Write-Host ""

Write-Host "  Дараагийн алхам:" -ForegroundColor Cyan
Write-Host "    cd backend && npm install --legacy-peer-deps && npx prisma migrate deploy"
Write-Host "    cd admin && npm install --legacy-peer-deps && npm run build"
Write-Host "    cd mobile && npm install --legacy-peer-deps   (Expo Go-д)"
Write-Host ""

# Өөрөө устгах сонголт
Write-Host "  Энэ setup-env скриптийг одоо устгах уу?" -ForegroundColor Cyan
Write-Host "  (.env үүсгэгдсэн тул дахин ажиллуулах шаардлагагүй)" -ForegroundColor Gray
$delYn = Read-Host "  Устгах? (y/N)"
if ($delYn -eq 'y' -or $delYn -eq 'Y') {
    $batPath = Join-Path $root "setup-env.bat"
    $ps1Path = Join-Path $root "setup-env.ps1"
    # PS1-ийг өөрийгөө устгах тул delay-тэй cmd-оор
    $selfDelete = @"
@echo off
timeout /t 2 >nul
del "$batPath" 2>nul
del "$ps1Path" 2>nul
del "%~f0"
"@
    $tmpBat = Join-Path $env:TEMP "zairmag-self-delete-$(Get-Random).bat"
    Set-Content -Path $tmpBat -Value $selfDelete -Encoding ASCII
    Write-Host ""
    Write-Host "  setup-env.bat / setup-env.ps1 устгагдана..." -ForegroundColor Yellow
    Start-Process -FilePath $tmpBat -WindowStyle Hidden
}
