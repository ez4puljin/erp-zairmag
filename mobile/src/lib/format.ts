// Mongolian formatting helpers

export function formatCurrency(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return '₮0';
  return `₮${n.toLocaleString('mn-MN')}`;
}

export function formatNumber(value: number | string | null | undefined): string {
  const n = Number(value ?? 0);
  if (isNaN(n)) return '0';
  return n.toLocaleString('mn-MN');
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return `${formatDate(d)} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function formatRelative(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 1000;
  if (diff < 60) return 'Яг одоо';
  if (diff < 3600) return `${Math.floor(diff / 60)} мин өмнө`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} цаг өмнө`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} өдөр өмнө`;
  return formatDate(d);
}

export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return '';
  const digits = phone.replace(/\D/g, '');
  if (digits.length === 8) return `${digits.slice(0, 4)} ${digits.slice(4)}`;
  if (digits.length === 11 && digits.startsWith('976')) return `+976 ${digits.slice(3, 7)} ${digits.slice(7)}`;
  return phone;
}

export function parseCurrency(text: string): number {
  return Number(text.replace(/[^\d.-]/g, '')) || 0;
}

export const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Бэлэн',
  BANK_TRANSFER: 'Шилжүүлэг',
  MOBILE_MONEY: 'Мобайл мөнгө',
  CARD: 'Карт',
  CHECK: 'Чек',
  CREDIT: 'Зээл',
  COMBINED: 'Хосолсон',
};

export const PAYMENT_COLORS: Record<string, string> = {
  CASH: '#34C759',
  BANK_TRANSFER: '#007AFF',
  MOBILE_MONEY: '#5856D6',
  CARD: '#AF52DE',
  CHECK: '#8E8E93',
  CREDIT: '#FF9500',
  COMBINED: '#FF3B30',
};

export const ORDER_STATUS_LABELS: Record<string, string> = {
  PENDING: 'Хүлээгдэж буй',
  APPROVED: 'Зөвшөөрсөн',
  SHIPPING: 'Хүргэлтэнд',
  DELIVERED: 'Хүргэгдсэн',
  CANCELLATION_REQUESTED: 'Цуцлах хүсэлт',
  CANCELLED: 'Цуцлагдсан',
};

export const ORDER_STATUS_COLORS: Record<string, string> = {
  PENDING: '#FF9500',
  APPROVED: '#007AFF',
  SHIPPING: '#AF52DE',
  DELIVERED: '#34C759',
  CANCELLATION_REQUESTED: '#FF3B30',
  CANCELLED: '#8E8E93',
};

export const PRICING_TIER_LABELS: Record<string, string> = {
  STANDARD: 'Стандарт',
  SILVER: 'Мөнгөн',
  GOLD: 'Алтан',
  PLATINUM: 'Платинум',
  VIP: 'VIP',
};

export function paymentLabel(method: string): string {
  return PAYMENT_LABELS[method] || method;
}

export function orderStatusLabel(status: string): string {
  return ORDER_STATUS_LABELS[status] || status;
}

/**
 * Жинг уншихад тохиромжтой хэлбэрээр харуулна.
 *
 * Барааны жин граммаар хадгалагддаг (нэг ширхэгт). Ачилтын нийт жин
 * хэдэн зуун килограмм болдог тул 1 кг-аас дээш бол кг-аар харуулна.
 */
export function formatWeight(grams: number): string {
  if (!grams || grams <= 0) return '—';
  if (grams < 1000) return `${Math.round(grams)} гр`;
  const kg = grams / 1000;
  return `${kg.toLocaleString('en-US', { minimumFractionDigits: kg < 10 ? 2 : 1, maximumFractionDigits: kg < 10 ? 2 : 1 })} кг`;
}

/**
 * Тоо хэмжээг хайрцаг + ширхгээр харуулна.
 *
 * Агуулах, түгээлтэд бараа хайрцгаар яригддаг тул "90ш" гэхээс
 * "2 хайрцаг 10ш" гэсэн нь шууд ойлгомжтой.
 *
 *   formatQty(90, 40) -> "2 хайрцаг 10ш"
 *   formatQty(80, 40) -> "2 хайрцаг"
 *   formatQty(30, 40) -> "30ш"
 *   formatQty(90, 1)  -> "90ш"
 */
export function formatQty(quantity: number, unitsPerBox?: number | null): string {
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  const per = Math.max(1, Math.round(Number(unitsPerBox) || 1));
  if (per <= 1 || qty < per) return `${qty}ш`;
  const boxes = Math.floor(qty / per);
  const rest = qty % per;
  return rest > 0 ? `${boxes} хайрцаг ${rest}ш` : `${boxes} хайрцаг`;
}

/** Хайрцаг/ширхэг + хаалтанд нийт ширхэг. Дэлгэрэнгүй харагдацад. */
export function formatQtyFull(quantity: number, unitsPerBox?: number | null): string {
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  const per = Math.max(1, Math.round(Number(unitsPerBox) || 1));
  const short = formatQty(qty, per);
  return per > 1 && qty >= per ? `${short} · ${qty}ш` : short;
}
