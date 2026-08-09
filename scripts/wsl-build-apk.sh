#!/bin/bash
# Zairmag ERP — release APK build inside WSL2 / Ubuntu.
#
# Windows дээр ninja нь 260 тэмдэгтийн замын хязгаарт тулдаг тул
# (React Native-ийн шинэ архитектурын C++ codegen зам 390 тэмдэгт болдог)
# build-ийг Linux дотор хийнэ. Linux-д тийм хязгаар байхгүй.
#
# Windows талаас build-apk-wsl.bat дуудна.

set -e

WIN_PROJECT="/mnt/c/Users/pulji/Desktop/Ice Cream Distribution"
SRC="$WIN_PROJECT/mobile"
DST=/build/erp/mobile

export ANDROID_HOME=/opt/android-sdk
export ANDROID_SDK_ROOT=/opt/android-sdk
export JAVA_HOME=/usr/lib/jvm/java-17-openjdk-amd64
export GRADLE_USER_HOME=/build/gradle-home

echo "==> Эх кодыг Linux файл систем рүү хуулж байна"
# /mnt/c дээр шууд build хийвэл 9p файл системээс болж маш удаан.
# node_modules болон android/ хоёрыг хуулахгүй — доор шинээр үүсгэнэ.
mkdir -p "$DST"
cd "$SRC"
tar -cf - \
  --exclude=node_modules \
  --exclude=android \
  --exclude=ios \
  --exclude=.expo \
  --exclude=.git \
  . | (cd "$DST" && tar -xf -)

if [ ! -f "$DST/credentials/keystore.properties" ]; then
  echo "ERROR: credentials/keystore.properties олдсонгүй."
  echo "       Гарын үсгийн түлхүүргүйгээр release APK гаргах боломжгүй."
  exit 1
fi

echo "==> npm install"
cd "$DST"
npm install --silent

echo "==> expo prebuild"
npx expo prebuild --platform android --clean --no-install

echo "==> Gradle assembleRelease"
cd "$DST/android"
chmod +x gradlew
./gradlew assembleRelease --no-daemon

APK="$DST/android/app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK" ]; then
  echo "ERROR: APK үүсээгүй байна."
  exit 1
fi

echo "==> Гарын үсгийг шалгаж байна"
BT=$(ls -d "$ANDROID_HOME"/build-tools/* | sort -V | tail -1)
"$BT/apksigner" verify --print-certs "$APK" | grep -E "certificate DN" || true

cp "$APK" "$WIN_PROJECT/zairmag-erp.apk"
echo "==> Бэлэн: zairmag-erp.apk ($(du -h "$APK" | cut -f1))"
