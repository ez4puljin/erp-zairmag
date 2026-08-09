import api from './api';

export const PAYMENT_METHOD_LABEL: Record<string, string> = {
  CASH: 'Бэлэн',
  BANK_TRANSFER: 'Данс',
  MOBILE_MONEY: 'Мобайл',
  CARD: 'Карт',
  CHECK: 'Чек',
  CREDIT: 'Зээл',
  COMBINED: 'Холимог',
  UNKNOWN: 'Бусад',
};

export const PAYMENT_METHODS = ['CASH', 'BANK_TRANSFER', 'MOBILE_MONEY', 'CARD', 'CHECK', 'CREDIT', 'COMBINED'];

function qs(params: Record<string, unknown>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null && v !== '') sp.set(k, String(v));
  }
  const s = sp.toString();
  return s ? `?${s}` : '';
}

// ── Sales register ──
export interface SalesRegisterLine {
  productId: string;
  productName: string;
  barcode: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}
export interface SalesRegisterRow {
  id: string;
  channel: 'ORDER' | 'TRUCK';
  number: string;
  date: string;
  customerId: string | null;
  customerName: string;
  sellerName: string;
  paymentMethod: string | null;
  itemCount: number;
  subtotal: number;
  total: number;
  lines: SalesRegisterLine[];
}
export interface SalesRegister {
  from: string;
  to: string;
  truncated: boolean;
  totals: { count: number; revenue: number; itemCount: number; byMethod: Record<string, { count: number; amount: number }> };
  byProduct: { productId: string; name: string; barcode: string | null; qty: number; revenue: number }[];
  byCustomer: { customerId: string; storeName: string; count: number; amount: number }[];
  items: SalesRegisterRow[];
}

export interface SalesRegisterFilters {
  from: string;
  to: string;
  customerId?: string;
  productId?: string;
  paymentMethod?: string;
  channel?: 'ALL' | 'ORDER' | 'TRUCK';
  driverId?: string;
}

export interface VatReport {
  from: string;
  to: string;
  vatRate: number;
  vatInclusiveAssumed: boolean;
  salesCount: number;
  orderSales: number;
  truckSales: number;
  totalSales: number;
  taxableBase: number;
  outputVat: number;
  recordedOrderTax: number;
}

// ── AR ledger (existing /api/receivables/:id) ──
export interface LedgerEntry {
  id: string;
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
  paymentMethod: string | null;
  paymentRef: string | null;
}
export interface CustomerLedger {
  customer: { id: string; storeName: string; contactName: string | null; phone: string | null; outstandingDebt: number; creditLimit: number } | null;
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: LedgerEntry[];
}

export const reportsApi = {
  salesRegister: (f: SalesRegisterFilters) =>
    api
      .get<SalesRegister>(
        `/api/reports/sales-register${qs({
          from: f.from,
          to: f.to,
          customerId: f.customerId,
          productId: f.productId,
          paymentMethod: f.paymentMethod,
          channel: f.channel,
          driverId: f.driverId,
        })}`,
      )
      .then((r) => r.data),
  vat: (from: string, to: string) => api.get<VatReport>(`/api/reports/vat${qs({ from, to })}`).then((r) => r.data),
  customerLedger: (customerId: string, dateFrom: string, dateTo: string) =>
    api.get<CustomerLedger>(`/api/receivables/${customerId}${qs({ dateFrom, dateTo })}`).then((r) => r.data),
};
