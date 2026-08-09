'use client';

import type { ReceiptSettings } from '@/lib/receipt-settings';
import { receiptWidthPx } from '@/lib/receipt-settings';

export interface ReceiptItem {
  name: string;
  barcode?: string | null;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export interface ReceiptData {
  saleNumber: string;
  date: string;
  driverName?: string | null;
  loadNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  items: ReceiptItem[];
  totalAmount: number;
  paymentLabel: string;
  /** Хосолсон төлбөрийн задаргаа. */
  combinedPayments?: { label: string; amount: number }[];
}

const money = (n: number) => `${Math.round(n).toLocaleString('en-US')}₮`;

/**
 * Хэвлэгдэх борлуулалтын баримт.
 *
 * Тохиргооны хуудасны урьдчилан харах болон POS-ийн бодит хэвлэлт хоёулаа
 * үүнийг ашигладаг тул харагдсан загвар яг тэр хэвээрээ хэвлэгдэнэ.
 */
export function SaleReceipt({
  settings: s,
  data,
  copyLabel,
}: {
  settings: ReceiptSettings;
  data: ReceiptData;
  copyLabel: string;
}) {
  const fs = s.fontSize;

  return (
    <div
      className="bg-white mx-auto p-3 font-mono text-[#1A1D26]"
      style={{ width: receiptWidthPx(s.paperWidth), fontSize: fs * 0.55 }}
    >
      <div className="text-center font-black" style={{ fontSize: fs * 0.7 }}>
        {s.companyName}
      </div>
      <div className="text-center font-bold" style={{ fontSize: fs * 0.6 }}>
        {s.subtitle}
      </div>
      <div className="text-center font-semibold" style={{ fontSize: fs * 0.5 }}>
        {copyLabel}
      </div>
      {s.phone && <div className="text-center" style={{ fontSize: fs * 0.45 }}>Утас: {s.phone}</div>}
      {s.address && <div className="text-center" style={{ fontSize: fs * 0.45 }}>{s.address}</div>}

      <div className="border-t-2 border-black my-2" />

      <div>Баримт №: {data.saleNumber}</div>
      <div>Огноо: {data.date}</div>
      {s.showLoadNumber && data.loadNumber && <div>Ачилт №: {data.loadNumber}</div>}
      {s.showSaleDriver && data.driverName && <div>Жолооч: {data.driverName}</div>}

      {s.showCustomer && (
        <>
          <div className="border-t border-black my-1.5" />
          <div>Харилцагч:</div>
          <div className="font-bold">{data.customerName || '-'}</div>
          {s.showPhone && data.customerPhone && <div>Утас: {data.customerPhone}</div>}
        </>
      )}

      <div className="border-t-2 border-black my-2" />

      {data.items.map((item, i) => (
        <div key={i} className={i > 0 ? 'mt-1' : ''}>
          <div className="font-bold">
            {s.showItemNumber ? `${i + 1}. ` : ''}
            {item.name}
          </div>
          {s.showBarcode && item.barcode && (
            <div style={{ fontSize: fs * 0.4 }}>Баркод: {item.barcode}</div>
          )}
          <div className="flex justify-between">
            <span style={{ fontSize: fs * 0.45 }}>
              {item.quantity} x {money(item.unitPrice)}
            </span>
            <span className="font-bold">{money(item.lineTotal)}</span>
          </div>
        </div>
      ))}

      <div className="border-t-2 border-black my-2" />

      <div className="flex justify-between font-black" style={{ fontSize: fs * 0.7 }}>
        <span>НИЙТ ДҮН</span>
        <span>{money(data.totalAmount)}</span>
      </div>
      <div>Төлбөр: {data.paymentLabel}</div>
      {data.combinedPayments?.map((p, i) => (
        <div key={i} className="flex justify-between" style={{ fontSize: fs * 0.45 }}>
          <span>{p.label}</span>
          <span>{money(p.amount)}</span>
        </div>
      ))}

      {s.showSignatures && (
        <>
          <div className="border-t-2 border-black my-2" />
          <div className="mt-1" style={{ fontSize: fs * 0.45 }}>Хүлээлгэн өгсөн:</div>
          <div style={{ fontSize: fs * 0.45 }}>__________________</div>
          <div className="mt-1" style={{ fontSize: fs * 0.45 }}>Хүлээн авсан:</div>
          <div style={{ fontSize: fs * 0.45 }}>__________________</div>
        </>
      )}

      {s.showFooter && (
        <>
          <div className="border-t-2 border-black my-2" />
          <div className="text-center font-bold">{s.footerMessage}</div>
        </>
      )}

      {s.feedbackPhone && (
        <div className="text-center font-bold mt-1" style={{ fontSize: fs * 0.45 }}>
          Санал хүсэлт: {s.feedbackPhone}
        </div>
      )}
    </div>
  );
}

/** Тохиргоог урьдчилан харахад ашиглах жишээ өгөгдөл. */
export const SAMPLE_RECEIPT: ReceiptData = {
  saleNumber: '123',
  date: '2026.04.08 14:30',
  loadNumber: '7',
  driverName: 'Болд Баяр',
  customerName: 'Жишээ дэлгүүр',
  customerPhone: '99119911',
  items: [
    { name: 'Классик зайрмаг', barcode: '4820123456789', quantity: 2, unitPrice: 3000, lineTotal: 6000 },
    { name: 'Мангон сорбет', barcode: '4820987654321', quantity: 1, unitPrice: 5000, lineTotal: 5000 },
  ],
  totalAmount: 11000,
  paymentLabel: 'Бэлэн',
};
