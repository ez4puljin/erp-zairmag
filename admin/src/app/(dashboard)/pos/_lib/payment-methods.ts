import { Banknote, Building2, CreditCard, Clock, Blend, type LucideIcon } from 'lucide-react';

export interface PaymentMethodDef {
  value: string;
  label: string;
  icon: LucideIcon;
  color: string;
}

/** POS дээр сонгох боломжтой төлбөрийн хэлбэрүүд. */
export const PAYMENT_METHODS: PaymentMethodDef[] = [
  { value: 'CASH', label: 'Бэлэн', icon: Banknote, color: '#34C759' },
  { value: 'BANK_TRANSFER', label: 'Шилжүүлэг', icon: Building2, color: '#007AFF' },
  { value: 'CARD', label: 'Карт', icon: CreditCard, color: '#AF52DE' },
  { value: 'CREDIT', label: 'Дараа тооцоо', icon: Clock, color: '#FF9500' },
  { value: 'COMBINED', label: 'Хосолсон', icon: Blend, color: '#FF3B30' },
];

/** Хосолсон төлбөрийн задаргаанд сонгох хэлбэрүүд (COMBINED өөрөө орохгүй). */
export const COMBINED_METHODS = PAYMENT_METHODS.filter((m) => m.value !== 'COMBINED').map(
  ({ value, label }) => ({ value, label })
);

export function getPaymentMethodLabel(method: string): string {
  return PAYMENT_METHODS.find((m) => m.value === method)?.label ?? method;
}

/** Богино хүрэлцэх мэдрэмж — гар утсан дээр товч дарсныг батламжилна. */
export function tapFeedback(pattern: number | number[] = 8) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
}
