import api from './api';
import * as SecureStore from './secure-storage';

const CACHE_KEY = 'receipt_settings_cache';

export interface ReceiptSettings {
  companyName: string;
  subtitle: string;
  phone: string | null;
  address: string | null;
  footerMessage: string;
  paperWidth: number; // 58 or 80
  fontSize: number;
  showCustomer: boolean;
  showPhone: boolean;
  showSignatures: boolean;
  showFooter: boolean;
  showDriver: boolean;
  showBarcode: boolean;
  showItemNumber: boolean;
  showSaleDriver: boolean;
  feedbackPhone: string | null;
  printTwoCopies: boolean;
  showVat: boolean;
  vatRate: number;
  cityTaxRate: number;
}

export const DEFAULT_SETTINGS: ReceiptSettings = {
  companyName: 'ЗАЙРМАГ ТҮГЭЭЛТ',
  subtitle: 'БОРЛУУЛАЛТЫН БАРИМТ',
  phone: null,
  address: null,
  footerMessage: 'Баярлалаа!',
  paperWidth: 58,
  fontSize: 12,
  showCustomer: true,
  showPhone: true,
  showSignatures: true,
  showFooter: true,
  showDriver: true,
  showBarcode: true,
  showItemNumber: true,
  showSaleDriver: true,
  feedbackPhone: '90940123',
  printTwoCopies: true,
  showVat: false,
  vatRate: 10,
  cityTaxRate: 1,
};

let cached: ReceiptSettings | null = null;

export async function loadCachedSettings(): Promise<ReceiptSettings> {
  if (cached) return cached;
  try {
    const raw = await SecureStore.getItemAsync(CACHE_KEY);
    if (raw) {
      cached = { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      return cached!;
    }
  } catch {}
  return DEFAULT_SETTINGS;
}

export async function fetchReceiptSettings(): Promise<ReceiptSettings> {
  try {
    const { data } = await api.get('/api/receipt-settings');
    const merged: ReceiptSettings = { ...DEFAULT_SETTINGS, ...data };
    cached = merged;
    try {
      await SecureStore.setItemAsync(CACHE_KEY, JSON.stringify(merged));
    } catch {}
    return merged;
  } catch {
    return loadCachedSettings();
  }
}
