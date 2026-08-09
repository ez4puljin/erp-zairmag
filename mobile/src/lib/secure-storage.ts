import { Platform } from 'react-native';
import * as SecureStore from 'expo-secure-store';

/**
 * SecureStore-ийн нимгэн бүрхүүл.
 *
 * `expo-secure-store` нь зөвхөн iOS/Android дээр хэрэгждэг. Хөтөч дээр
 * дуудахад `setValueWithKeyAsync is not a function` гэж унадаг тул
 * вэб дээр `localStorage` руу шилжинэ.
 *
 * Энэ нь ЗӨВХӨН хөгжүүлэлтийн үед хөтчөөр урьдчилан харахад зориулагдсан —
 * бодит апп (APK) нь өмнөх шигээ SecureStore-ийн шифрлэгдсэн хадгалалтыг
 * ашиглах тул аюулгүй байдал сулраагүй.
 */

const isWeb = Platform.OS === 'web';

function webStorage(): Storage | null {
  try {
    return typeof window !== 'undefined' ? window.localStorage : null;
  } catch {
    return null;
  }
}

export async function getItemAsync(key: string): Promise<string | null> {
  if (isWeb) {
    return webStorage()?.getItem(key) ?? null;
  }
  return SecureStore.getItemAsync(key);
}

export async function setItemAsync(key: string, value: string): Promise<void> {
  if (isWeb) {
    webStorage()?.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

export async function deleteItemAsync(key: string): Promise<void> {
  if (isWeb) {
    webStorage()?.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}
