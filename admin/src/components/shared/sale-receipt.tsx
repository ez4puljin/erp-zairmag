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
  driverPhone?: string | null;
  loadNumber?: string | null;
  customerName?: string | null;
  customerPhone?: string | null;
  customerAddress?: string | null;
  items: ReceiptItem[];
  totalAmount: number;
  paymentLabel: string;
  /** Хосолсон төлбөрийн задаргаа. */
  combinedPayments?: { label: string; amount: number }[];
  /** Бэлэн / бэлэн бус хуваарилалт. Заагаагүй бол paymentLabel-аас тооцно. */
  cashAmount?: number;
  nonCashAmount?: number;
}

const num = (n: number) => Math.round(n).toLocaleString('en-US');
const money = (n: number) => `${num(n)}₮`;

/**
 * Хэвлэгдэх борлуулалтын баримт.
 *
 * Утасны хэвлэлт (mobile/src/components/PrintableReceipt.tsx) яг энэ бүтцээр
 * гардаг — багана, фонтын харьцаа, гарын үсгийн мөр хүртэл нийцүүлсэн.
 * Аль нэгийг өөрчлөх бол нөгөөг нь дагуулж засна, эс бөгөөс тохиргооны
 * хуудсанд харагдсан зүйл хэвлэгдэхээсээ ялгаатай болно.
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
  const fs = s.fontSize || 12;
  // Утасны 384px-ийн зотон вэб дээр 240px-ээр харагддаг тул фонтыг мөн
  // тэр харьцаагаар багасгаж, урьдчилан харах нь бодит хэмжээтэй таарна.
  const k = receiptWidthPx(s.paperWidth) / (s.paperWidth >= 80 ? 576 : 384);
  const px = (v: number) => `${(v * k).toFixed(2)}px`;

  // Байршлын утгууд тохиргооноос ирнэ — APK/вэб дахин барих шаардлагагүй.
  const mX = s.marginX ?? 4;
  const mY = s.marginY ?? 4;
  const line = s.lineSpacing ?? 2;
  const sect = s.sectionSpacing ?? 2;
  const sign = s.signatureSpacing ?? 6;
  const boost = s.itemFontBoost ?? 2;

  const total = data.totalAmount;
  const cash = data.cashAmount ?? (data.paymentLabel === 'Бэлэн' ? total : 0);
  const nonCash = data.nonCashAmount ?? total - cash;

  return (
    <div
      className="bg-white mx-auto text-black"
      style={{
        width: receiptWidthPx(s.paperWidth),
        paddingBlock: px(mY),
        paddingInline: px(mX),
        fontSize: px(fs),
        lineHeight: 1.25,
      }}
    >
      <div className="text-center font-black" style={{ fontSize: px(fs + 6) }}>
        {s.companyName || 'Борлуулалт'}
      </div>
      <div className="text-center font-bold" style={{ fontSize: px(fs - 1), marginTop: px(1) }}>
        {s.subtitle}
      </div>
      <div className="text-center font-bold" style={{ fontSize: px(fs - 3), marginTop: px(1) }}>
        {copyLabel}
      </div>

      <div style={{ borderTop: `1.5px dashed #000`, marginBlock: px(sect) }} />

      {s.showCustomer && (
        <div className="flex items-center justify-between" style={{ paddingBlock: px(1), marginBottom: px(1) }}>
          <span className="font-bold truncate" style={{ fontSize: px(fs - 1) }}>
            👤 {data.customerName || '-'}
          </span>
          {s.showPhone && data.customerPhone && (
            <span className="font-semibold shrink-0" style={{ fontSize: px(fs - 2) }}>
              📞 {data.customerPhone}
            </span>
          )}
        </div>
      )}

      <MetaRow label="Талон №" value={data.saleNumber} fs={fs} px={px} />
      {data.customerAddress && <MetaRow label="Хаяг" value={data.customerAddress} fs={fs} px={px} />}
      {s.showLoadNumber && data.loadNumber && <MetaRow label="Ачилт №" value={data.loadNumber} fs={fs} px={px} />}
      {s.showSaleDriver && data.driverName && (
        <MetaRow
          label="Жолооч"
          value={`${data.driverName}${data.driverPhone ? ` (${data.driverPhone})` : ''}`}
          fs={fs}
          px={px}
        />
      )}
      <MetaRow label="Огноо" value={data.date} fs={fs} px={px} />

      <div style={{ borderTop: '1.5px solid #000', marginBlock: px(sect) }} />

      {/* Барааны хүснэгт */}
      <div className="flex" style={{ paddingBlock: px(1), fontSize: px(fs - 1), fontWeight: 700 }}>
        <span style={{ flex: 2.8 }}>Бараа</span>
        <span style={{ flex: 0.6, textAlign: 'right' }}>Т/Ш</span>
        <span style={{ flex: 1.3, textAlign: 'right' }}>Үнэ</span>
        <span style={{ flex: 1.5, textAlign: 'right' }}>Нийт</span>
      </div>
      <div style={{ borderTop: '1px dashed #000', marginBlock: px(sect) }} />

      {data.items.map((item, i) => (
        <div key={i} className="flex items-start" style={{ paddingBlock: px(line) }}>
          <div style={{ flex: 2.8 }}>
            <div style={{ fontSize: px(fs + boost), fontWeight: 900, lineHeight: 1.1 }}>
              {s.showItemNumber ? `${i + 1}. ` : ''}
              {item.name}
            </div>
            {s.showBarcode && item.barcode && (
              <div style={{ fontSize: px(fs), fontWeight: 800, letterSpacing: '0.5px', marginTop: 0 }}>
                ▎{item.barcode}
              </div>
            )}
          </div>
          <span style={{ flex: 0.6, textAlign: 'right', fontSize: px(fs + Math.max(0, boost - 1)), fontWeight: 800 }}>
            {item.quantity}
          </span>
          <span style={{ flex: 1.3, textAlign: 'right', fontSize: px(fs + Math.max(0, boost - 1)), fontWeight: 800 }}>
            {num(item.unitPrice)}₮
          </span>
          <span style={{ flex: 1.5, textAlign: 'right', fontSize: px(fs + Math.max(0, boost - 1)), fontWeight: 800 }}>
            {num(item.lineTotal)}₮
          </span>
        </div>
      ))}

      <div style={{ borderTop: '1px dashed #000', marginBlock: px(sect) }} />

      <TotalRow label="Нийт дүн" value={money(total)} fs={fs} px={px} bold />

      <div style={{ borderTop: '1px dashed #000', marginBlock: px(sect) }} />

      <TotalRow label="Бэлэн" value={money(cash)} fs={fs} px={px} />
      <TotalRow label="Бэлэн бус" value={money(nonCash)} fs={fs} px={px} />
      <TotalRow label="Төлсөн" value={money(total)} fs={fs} px={px} bold />

      {data.combinedPayments && data.combinedPayments.length > 0 && (
        <div style={{ marginTop: px(4) }}>
          {data.combinedPayments.map((p, i) => (
            <TotalRow key={i} label={`  • ${p.label}`} value={money(p.amount)} fs={fs - 1} px={px} />
          ))}
        </div>
      )}

      {s.showSignatures && (
        <>
          <div style={{ borderTop: '1px dashed #000', marginBlock: px(sect) }} />
          <SignatureLine label="Хүлээлгэн өгсөн" fs={fs} px={px} gap={sign} />
          <SignatureLine label="Хүлээн авсан" fs={fs} px={px} gap={sign} />
        </>
      )}

      {s.showFooter && (
        <>
          <div style={{ borderTop: '1px dashed #000', marginBlock: px(sect) }} />
          <div className="text-center font-bold" style={{ fontSize: px(fs - 1), marginTop: px(2) }}>
            {s.footerMessage}
          </div>
        </>
      )}

      {s.feedbackPhone && (
        <div className="text-center font-bold" style={{ fontSize: px(fs - 3), marginTop: px(3) }}>
          Санал хүсэлт: {s.feedbackPhone}
        </div>
      )}
    </div>
  );
}

type Px = (v: number) => string;

function MetaRow({ label, value, fs, px }: { label: string; value: string; fs: number; px: Px }) {
  return (
    <div className="flex items-start" style={{ paddingBlock: 0 }}>
      <span style={{ width: px(65), fontSize: px(fs - 2), fontWeight: 500 }}>{label}:</span>
      <span style={{ flex: 1, fontSize: px(fs - 2), fontWeight: 600 }}>{value}</span>
    </div>
  );
}

function TotalRow({
  label, value, fs, px, bold,
}: { label: string; value: string; fs: number; px: Px; bold?: boolean }) {
  return (
    <div className="flex items-center justify-between" style={{ paddingBlock: 0 }}>
      <span style={{ fontSize: px(fs - 2), fontWeight: bold ? 900 : 600 }}>{label}</span>
      <span style={{ fontSize: px(fs - 2), fontWeight: bold ? 900 : 600 }}>{value}</span>
    </div>
  );
}

/** Шошго + цаасны баруун зах хүртэл сунах зураас. */
function SignatureLine({ label, fs, px, gap }: { label: string; fs: number; px: Px; gap: number }) {
  return (
    <div className="flex items-end" style={{ marginTop: px(gap) }}>
      <span style={{ fontSize: px(fs - 1), fontWeight: 600 }}>{label}:</span>
      <span style={{ flex: 1, borderBottom: '1px solid #000', marginLeft: px(4), marginBottom: px(2) }} />
    </div>
  );
}

/** Тохиргоог урьдчилан харахад ашиглах жишээ өгөгдөл. */
export const SAMPLE_RECEIPT: ReceiptData = {
  saleNumber: '15',
  date: '2026.08.10 10:15:43',
  loadNumber: '7',
  driverName: 'Ганболд Энхдорж',
  driverPhone: '90940123',
  customerName: 'Жишээ дэлгүүр',
  customerPhone: '99119911',
  customerAddress: 'Мөрөн',
  items: [
    { name: 'Гранд шоколад', barcode: '8656021315047', quantity: 50, unitPrice: 1350, lineTotal: 67500 },
    { name: 'Морозко цөцгий', barcode: '8656021315078', quantity: 20, unitPrice: 700, lineTotal: 14000 },
  ],
  totalAmount: 81500,
  paymentLabel: 'Зээл',
  cashAmount: 0,
  nonCashAmount: 81500,
};
