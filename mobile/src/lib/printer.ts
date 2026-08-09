import { Alert, Platform, PermissionsAndroid } from 'react-native';
import * as SecureStore from './secure-storage';

const PRINTER_KEY = 'bluetooth_printer_address';
const PRINTER_NAME_KEY = 'bluetooth_printer_name';

let ThermalPrinter: any = null;

// Lazy load to avoid crash if not available
function getPrinterModule() {
  if (!ThermalPrinter) {
    try {
      ThermalPrinter = require('react-native-thermal-receipt-printer-image-qr');
    } catch {
      console.warn('Thermal printer module not available');
    }
  }
  return ThermalPrinter;
}

/**
 * Request runtime Bluetooth permissions on Android.
 * - Android 12+ (API 31+): BLUETOOTH_SCAN + BLUETOOTH_CONNECT
 * - Android 11 and below: ACCESS_FINE_LOCATION (legacy BLE scan requirement)
 *
 * Returns true if all required permissions were granted.
 */
export async function ensureBluetoothPermissions(): Promise<boolean> {
  if (Platform.OS !== 'android') return true;

  try {
    const apiLevel = typeof Platform.Version === 'number' ? Platform.Version : parseInt(String(Platform.Version), 10);

    let permissions: any[] = [];
    if (apiLevel >= 31) {
      permissions = [
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_SCAN,
        PermissionsAndroid.PERMISSIONS.BLUETOOTH_CONNECT,
      ];
    } else {
      permissions = [PermissionsAndroid.PERMISSIONS.ACCESS_FINE_LOCATION];
    }

    const result = await PermissionsAndroid.requestMultiple(permissions);
    const allGranted = permissions.every(
      p => result[p] === PermissionsAndroid.RESULTS.GRANTED,
    );

    if (!allGranted) {
      Alert.alert(
        'Bluetooth зөвшөөрөл шаардлагатай',
        'Принтер ашиглахын тулд "Nearby devices" (Ойролцоох төхөөрөмж) зөвшөөрөл олгох хэрэгтэй. Settings → Apps → Зайрмаг ERP → Permissions хэсэгт олгоно уу.',
      );
      return false;
    }
    return true;
  } catch (e: any) {
    console.warn('Permission request failed:', e?.message);
    Alert.alert('Зөвшөөрөл алдаа', e?.message ?? 'Bluetooth зөвшөөрөл авч чадсангүй');
    return false;
  }
}

export async function getSavedPrinter(): Promise<{ address: string; name: string } | null> {
  const address = await SecureStore.getItemAsync(PRINTER_KEY);
  const name = await SecureStore.getItemAsync(PRINTER_NAME_KEY);
  if (address) return { address, name: name ?? 'Printer' };
  return null;
}

export async function savePrinter(address: string, name: string) {
  await SecureStore.setItemAsync(PRINTER_KEY, address);
  await SecureStore.setItemAsync(PRINTER_NAME_KEY, name);
}

export async function clearPrinter() {
  await SecureStore.deleteItemAsync(PRINTER_KEY);
  await SecureStore.deleteItemAsync(PRINTER_NAME_KEY);
}

export async function scanBluetoothDevices(): Promise<{ address: string; name: string }[]> {
  const mod = getPrinterModule();
  if (!mod?.BLEPrinter) {
    Alert.alert(
      'Принтер модуль олдсонгүй',
      'Bluetooth принтер модуль ачаалагдсангүй. Аппыг дахин эхлүүлнэ үү.',
    );
    return [];
  }
  // Request runtime permissions before any Bluetooth API call
  const granted = await ensureBluetoothPermissions();
  if (!granted) return [];

  try {
    await mod.BLEPrinter.init();
    const devices = await mod.BLEPrinter.getDeviceList();
    return (devices ?? []).map((d: any) => ({
      address: d.inner_mac_address ?? d.device_name ?? '',
      name: d.device_name ?? 'Unknown',
    }));
  } catch (e: any) {
    Alert.alert('Bluetooth алдаа', e?.message ?? 'Төхөөрөмж хайхад алдаа гарлаа');
    return [];
  }
}

export async function connectPrinter(address: string): Promise<boolean> {
  const mod = getPrinterModule();
  if (!mod?.BLEPrinter) return false;

  const granted = await ensureBluetoothPermissions();
  if (!granted) return false;

  try {
    await mod.BLEPrinter.init();
    await mod.BLEPrinter.connectPrinter(address);
    return true;
  } catch (e: any) {
    Alert.alert('Холболт амжилтгүй', e?.message ?? 'Принтерт холбогдож чадсангүй');
    return false;
  }
}

export async function printText(text: string): Promise<boolean> {
  const mod = getPrinterModule();
  if (!mod?.BLEPrinter) {
    Alert.alert('Алдаа', 'Принтер холбогдоогүй байна');
    return false;
  }

  const granted = await ensureBluetoothPermissions();
  if (!granted) return false;

  try {
    const saved = await getSavedPrinter();
    if (saved) {
      await mod.BLEPrinter.init();
      await mod.BLEPrinter.connectPrinter(saved.address);
    }
    await mod.BLEPrinter.printText(text, { encoding: 'UTF8' });
    return true;
  } catch (e: any) {
    Alert.alert('Хэвлэх алдаа', e?.message ?? 'Баримт хэвлэхэд алдаа гарлаа');
    return false;
  }
}

/**
 * Print a base64 encoded PNG image. Used to render Mongolian text as graphics
 * because most thermal printers do not support Cyrillic code pages.
 *
 * @param base64 PNG image as base64 string (without the data: prefix)
 * @param width  Width in pixels (default 576 for 80mm @ 203dpi)
 */
export async function printImageBase64(base64: string, width: number = 576, printerWidthMm: number = 80): Promise<boolean> {
  const mod = getPrinterModule();
  if (!mod?.BLEPrinter) {
    Alert.alert('Алдаа', 'Принтер холбогдоогүй байна');
    return false;
  }

  const granted = await ensureBluetoothPermissions();
  if (!granted) return false;

  try {
    const saved = await getSavedPrinter();
    if (saved) {
      await mod.BLEPrinter.init();
      await mod.BLEPrinter.connectPrinter(saved.address);
    }
    // Strip data URL prefix if present
    const cleanBase64 = base64.replace(/^data:image\/\w+;base64,/, '');
    if (typeof mod.BLEPrinter.printImageBase64 === 'function') {
      await mod.BLEPrinter.printImageBase64(cleanBase64, {
        imageWidth: width,
        printerWidthType: printerWidthMm >= 80 ? 80 : 58,
        paddingX: 0,
      });
    } else {
      Alert.alert('Алдаа', 'Принтер зураг хэвлэхийг дэмжихгүй');
      return false;
    }
    return true;
  } catch (e: any) {
    Alert.alert('Хэвлэх алдаа', e.message ?? 'Баримт хэвлэхэд алдаа гарлаа');
    return false;
  }
}

/**
 * Print an image from a file URI. Used as a fallback when base64 is not preferred.
 */
export async function printImageUri(uri: string): Promise<boolean> {
  const mod = getPrinterModule();
  if (!mod?.BLEPrinter) {
    Alert.alert('Алдаа', 'Принтер холбогдоогүй байна');
    return false;
  }

  const granted = await ensureBluetoothPermissions();
  if (!granted) return false;

  try {
    const saved = await getSavedPrinter();
    if (saved) {
      await mod.BLEPrinter.init();
      await mod.BLEPrinter.connectPrinter(saved.address);
    }
    if (typeof mod.BLEPrinter.printImage === 'function') {
      await mod.BLEPrinter.printImage(uri, { imageWidth: 576 });
    } else {
      Alert.alert('Алдаа', 'Принтер зураг хэвлэхийг дэмжихгүй');
      return false;
    }
    return true;
  } catch (e: any) {
    Alert.alert('Хэвлэх алдаа', e.message ?? 'Баримт хэвлэхэд алдаа гарлаа');
    return false;
  }
}

/**
 * Send a line feed to advance the paper.
 */
export async function feedLines(lines: number = 3): Promise<void> {
  const mod = getPrinterModule();
  if (!mod?.BLEPrinter) return;
  try {
    await mod.BLEPrinter.printText('\n'.repeat(lines), {});
  } catch {}
}

export async function disconnectPrinter() {
  const mod = getPrinterModule();
  if (mod?.BLEPrinter) {
    try { await mod.BLEPrinter.closeConn(); } catch {}
  }
}
