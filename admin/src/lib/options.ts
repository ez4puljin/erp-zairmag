import type { SelectOption } from '@/components/shared/searchable-select';

/**
 * Хэд хэдэн хуудсанд давхардаж бичигддэг байсан сонголтын жагсаалтууд.
 * Нэг эх сурвалжтай байснаар нэр, дараалал хоорондоо зөрөхгүй.
 */

/** Харилцагчийн үнийн зэрэглэл. */
export const PRICING_TIERS: SelectOption[] = [
  { value: 'STANDARD', label: 'Standard' },
  { value: 'SILVER', label: 'Silver' },
  { value: 'GOLD', label: 'Gold' },
  { value: 'PLATINUM', label: 'Platinum' },
  { value: 'VIP', label: 'VIP' },
];

/** Төлбөрийн хэлбэр. */
export const PAYMENT_METHODS: SelectOption[] = [
  { value: 'CASH', label: 'Бэлэн мөнгө' },
  { value: 'BANK_TRANSFER', label: 'Банкны шилжүүлэг' },
  { value: 'MOBILE_MONEY', label: 'Мобайл төлбөр' },
  { value: 'CHECK', label: 'Чек' },
];

/**
 * Зардлын төлбөрийн хэлбэр. Харилцагчийн төлбөрөөс өөр жагсаалттай —
 * зардалд карт ордог бол харилцагчийн төлбөрт мобайл, чек ордог.
 */
export const EXPENSE_PAYMENT_METHODS: SelectOption[] = [
  { value: 'CASH', label: 'Бэлэн' },
  { value: 'BANK_TRANSFER', label: 'Шилжүүлэг' },
  { value: 'CARD', label: 'Карт' },
];

/** Нийлүүлэгчид төлөх төлбөрийн хэлбэр. */
export const SUPPLIER_PAYMENT_METHODS: SelectOption[] = [
  { value: 'CASH', label: 'Бэлэн' },
  { value: 'BANK_TRANSFER', label: 'Банк шилжүүлэг' },
  { value: 'MOBILE_MONEY', label: 'Мобайл' },
  { value: 'CHECK', label: 'Чек' },
];

/** Нийлүүлэгчийн гүйлгээний төрөл. */
export const SUPPLIER_TXN_TYPES: SelectOption[] = [
  { value: 'PAYMENT', label: 'Төлбөр' },
  { value: 'RETURN', label: 'Буцаалт' },
  { value: 'ADJUSTMENT', label: 'Тохируулга' },
];

/** Барааны хэмжих нэгж. */
export const PRODUCT_UNITS: SelectOption[] = [
  { value: 'PIECE', label: 'Ширхэг' },
  { value: 'BOX', label: 'Хайрцаг' },
  { value: 'KG', label: 'Килограмм' },
  { value: 'LITER', label: 'Литр' },
  { value: 'PACK', label: 'Баглаа' },
];

/** Банкны дансны валют. */
export const CURRENCIES: SelectOption[] = [
  { value: 'MNT', label: 'MNT' },
  { value: 'USD', label: 'USD' },
  { value: 'CNY', label: 'CNY' },
  { value: 'EUR', label: 'EUR' },
];

/** Баримт хэвлэх цаасны өргөн. */
export const PAPER_WIDTHS: SelectOption[] = [
  { value: '58', label: '58мм (стандарт)' },
  { value: '80', label: '80мм (өргөн)' },
];

/** Бүс нутгийн төрөл. */
export const CUSTOMER_CATEGORY_TYPES: SelectOption[] = [
  { value: 'KHOROO', label: 'Хороо' },
  { value: 'SUM', label: 'Сум' },
];
