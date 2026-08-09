#!/bin/bash
# Zairmag ERP — WSL2 / Ubuntu дотор Android build хийх орчныг бэлдэнэ.
#
# Нэг удаа ажиллуулна. Дараа нь build-apk-wsl.bat-аар APK гаргана.
#
# Урьдчилсан нөхцөл (Windows тал):
#   1. BIOS дээр процессорын виртуалчлал (Intel VT-x / AMD SVM) асаалттай
#   2. Администратор PowerShell дээр:  wsl --install --no-distribution
#   3. Компьютер дахин асаасан байх
#   4. wsl --install Ubuntu --location D:\wsl\Ubuntu --no-launch
#
# Дараа нь:  wsl -d Ubuntu -u root -- bash /path/to/wsl-setup.sh

set -e

export DEBIAN_FRONTEND=noninteractive
SDK=/opt/android-sdk

# Windows дээр суусантай ижил хувилбарууд.
NDK_VERSION="27.1.12297006"
CMAKE_VERSION="3.22.1"
PLATFORM="android-36"
BUILD_TOOLS="36.0.0"

echo "==> Үндсэн багцууд"
apt-get update -qq
apt-get install -y -qq openjdk-17-jdk-headless unzip curl git ca-certificates python3

echo "==> Node.js 22"
if ! command -v node > /dev/null; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash - > /dev/null
  apt-get install -y -qq nodejs
fi
echo "    node $(node -v), npm $(npm -v)"

echo "==> Android command line tools"
if [ ! -x "$SDK/cmdline-tools/latest/bin/sdkmanager" ]; then
  mkdir -p "$SDK/cmdline-tools"
  cd /tmp
  curl -fsSL -o cmdline-tools.zip \
    https://dl.google.com/android/repository/commandlinetools-linux-11076708_latest.zip
  rm -rf /tmp/cmdline-extract "$SDK/cmdline-tools/latest"
  unzip -q -o cmdline-tools.zip -d /tmp/cmdline-extract
  mv /tmp/cmdline-extract/cmdline-tools "$SDK/cmdline-tools/latest"
fi

export ANDROID_HOME="$SDK"
export ANDROID_SDK_ROOT="$SDK"
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
SDKM="$SDK/cmdline-tools/latest/bin/sdkmanager"

echo "==> SDK лиценз"
yes | "$SDKM" --licenses > /dev/null 2>&1 || true

echo "==> SDK бүрэлдэхүүн (~2 GB, хэдэн минут)"
"$SDKM" --install \
  "platform-tools" \
  "platforms;$PLATFORM" \
  "build-tools;$BUILD_TOOLS" \
  "ndk;$NDK_VERSION" \
  "cmake;$CMAKE_VERSION" > /dev/null

echo ""
echo "Бэлэн. Суусан бүрэлдэхүүн:"
ls "$SDK"
echo ""
echo "Дараагийн алхам: Windows талаас build-apk-wsl.bat ажиллуулна."
