const { withAppBuildGradle } = require('@expo/config-plugins');

/**
 * Release APK-г өөрийн keystore-оор гарын үсэг зурдаг болгоно.
 *
 * Expo-гийн үүсгэдэг android/app/build.gradle нь release build-ыг debug
 * keystore-оор гарын үсэг зурдаг (нууц үг нь бүх төсөлд ижил "android").
 * `expo prebuild` ажиллах бүрд android/ хавтас дахин үүсдэг тул энэ
 * тохиргоог гараар засах утгагүй — plugin хэлбэрээр оруулж байна.
 *
 * Түлхүүр болон нууц үг нь mobile/credentials/ дотор, git-д ороогүй.
 * Хэрэв тэр файл байхгүй бол debug гарын үсэг рүү буцна — ингэснээр
 * түлхүүргүй компьютер дээр ч build унахгүй.
 */

const RELEASE_SIGNING_CONFIG = `
        release {
            def zairmagProps = new Properties()
            def zairmagPropsFile = rootProject.file('../credentials/keystore.properties')
            if (zairmagPropsFile.exists()) {
                zairmagProps.load(new FileInputStream(zairmagPropsFile))
                storeFile rootProject.file('../credentials/' + zairmagProps['ZAIRMAG_STORE_FILE'])
                storePassword zairmagProps['ZAIRMAG_STORE_PASSWORD']
                keyAlias zairmagProps['ZAIRMAG_KEY_ALIAS']
                keyPassword zairmagProps['ZAIRMAG_KEY_PASSWORD']
            } else {
                println 'WARNING: credentials/keystore.properties not found - signing release with the debug key'
                storeFile file('debug.keystore')
                storePassword 'android'
                keyAlias 'androiddebugkey'
                keyPassword 'android'
            }
        }
`;

module.exports = function withReleaseSigning(config) {
  return withAppBuildGradle(config, (cfg) => {
    let contents = cfg.modResults.contents;

    // Хоёр удаа ажиллуулсан ч давхардуулахгүй.
    if (contents.includes('signingConfigs.release')) {
      return cfg;
    }

    // 1) release гарын үсгийн тохиргоог нэмнэ.
    const before = contents;
    contents = contents.replace(
      /signingConfigs\s*\{/,
      (match) => `${match}${RELEASE_SIGNING_CONFIG}`
    );
    if (contents === before) {
      throw new Error(
        'with-release-signing: signingConfigs блок олдсонгүй — build.gradle загвар өөрчлөгдсөн байна.'
      );
    }

    // 2) buildTypes.release-ийг debug түлхүүрээс салгана.
    //    debug блокийн доторх ижил мөрийг хөндөхгүйн тулд release-ийн
    //    дараах эхний тохиолдлыг л сольж байна.
    const swapped = contents.replace(
      /(buildTypes\s*\{[\s\S]*?release\s*\{[\s\S]*?)signingConfig\s+signingConfigs\.debug/,
      '$1signingConfig signingConfigs.release'
    );
    if (swapped === contents) {
      throw new Error(
        'with-release-signing: buildTypes.release доторх signingConfig олдсонгүй.'
      );
    }

    cfg.modResults.contents = swapped;
    return cfg;
  });
};
