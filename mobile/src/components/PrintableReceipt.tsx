import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import type { ReceiptSettings } from '../lib/receipt-settings';
import { DEFAULT_SETTINGS } from '../lib/receipt-settings';

// Width: 58mm @ 203dpi ≈ 384px ; 80mm ≈ 576px
export function widthForPaper(paper: number): number {
  return paper >= 80 ? 576 : 384;
}

const PAYMENT_NAMES: Record<string, string> = {
  CASH: 'Бэлэн',
  BANK_TRANSFER: 'Шилжүүлэг',
  CARD: 'Карт',
  CREDIT: 'Зээл',
  COMBINED: 'Хосолсон',
  MOBILE_MONEY: 'Мобайл',
};

function fmtNum(amount: number): string {
  return (amount || 0).toLocaleString('mn-MN', { maximumFractionDigits: 2 });
}
function fmt(amount: number): string {
  return `${fmtNum(amount)}₮`;
}

interface CombinedPayment {
  method: string;
  amount: number;
}

interface SaleReceiptProps {
  sale: any;
  customer: any;
  paymentMethod: string;
  copyLabel: string;
  driverName?: string;
  driverPhone?: string;
  combinedPayments?: CombinedPayment[];
  settings?: ReceiptSettings;
}

export function SaleReceipt({ sale, customer, paymentMethod, copyLabel, driverName, driverPhone, combinedPayments, settings = DEFAULT_SETTINGS }: SaleReceiptProps) {
  const items = sale?.items ?? [];
  const total = Number(sale?.totalAmount ?? 0);
  const discount = Number(sale?.discount ?? 0);
  const pm = PAYMENT_NAMES[paymentMethod] ?? paymentMethod ?? '-';
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
  const s = makeStyles(settings);
  const width = widthForPaper(settings.paperWidth);

  // Cash / Non-cash split
  let cashAmount = 0;
  let nonCashAmount = 0;
  if (paymentMethod === 'COMBINED' && combinedPayments && combinedPayments.length > 0) {
    combinedPayments.forEach(p => {
      if (p.method === 'CASH') cashAmount += p.amount;
      else nonCashAmount += p.amount;
    });
  } else if (paymentMethod === 'CASH') {
    cashAmount = total;
  } else {
    nonCashAmount = total;
  }

  return (
    <View style={[s.page, { width }]}>
      {/* Title */}
      <Text style={s.title}>{settings.companyName || 'Борлуулалт'}</Text>
      <Text style={s.subtitle}>{settings.subtitle}</Text>
      <Text style={s.copyLabel}>{copyLabel}</Text>

      <View style={s.divider} />

      {/* Customer top bar (icon name | phone) */}
      {settings.showCustomer && (
        <View style={s.custBar}>
          <Text style={s.custName} numberOfLines={1}>👤 {customer?.storeName ?? customer?.contactName ?? '-'}</Text>
          {settings.showPhone && customer?.phone ? (
            <Text style={s.custPhone}>📞 {customer.phone}</Text>
          ) : null}
        </View>
      )}

      {/* Meta rows */}
      <View style={s.metaBlock}>
        <MetaRow label="Талон №" value={String(sale?.saleNumber ?? '-')} s={s} />
        {customer?.address ? <MetaRow label="Хаяг" value={customer.address} s={s} multiline /> : null}
        {settings.showSaleDriver && driverName ? (
          <MetaRow label="Жолооч" value={`${driverName}${driverPhone ? ' (' + driverPhone + ')' : ''}`} s={s} multiline />
        ) : null}
        <MetaRow label="Огноо" value={dateStr} s={s} />
      </View>

      {/* Items table header */}
      <View style={s.tableDivider} />
      <View style={s.tableHead}>
        <Text style={[s.th, { flex: 2.8 }]}>Бараа</Text>
        <Text style={[s.th, { flex: 0.6, textAlign: 'right' }]}>Т/Ш</Text>
        <Text style={[s.th, { flex: 1.3, textAlign: 'right' }]}>Үнэ</Text>
        <Text style={[s.th, { flex: 1.5, textAlign: 'right' }]}>Нийт</Text>
      </View>
      <View style={s.tableDividerDashed} />

      {/* Items rows */}
      {items.map((item: any, idx: number) => {
        const name = item?.product?.name ?? '-';
        const sku = item?.product?.barcodes?.[0]?.code ?? item?.product?.barcode;
        const qty = item?.quantity ?? 0;
        const price = Number(item?.unitPrice ?? 0);
        const lineTotal = Number(item?.lineTotal ?? qty * price);
        const prefix = settings.showItemNumber ? `${idx + 1}. ` : '';
        return (
          <View key={idx} style={s.itemRow}>
            <View style={{ flex: 2.8 }}>
              <Text style={s.itemName}>{prefix}{name}</Text>
              {sku ? (
                <Text style={s.itemBarcode}>▎{sku}</Text>
              ) : null}
            </View>
            <Text style={[s.itemCell, { flex: 0.6, textAlign: 'right' }]}>{qty}</Text>
            <Text style={[s.itemCell, { flex: 1.3, textAlign: 'right' }]}>{fmtNum(price)}₮</Text>
            <Text style={[s.itemCell, { flex: 1.5, textAlign: 'right', fontWeight: '800' }]}>{fmtNum(lineTotal)}₮</Text>
          </View>
        );
      })}

      <View style={s.tableDividerDashed} />

      {/* Totals */}
      {discount > 0 && <TotalRow label="Хөнгөлөлт" value={fmt(discount)} s={s} />}
      <TotalRow label="Нийт дүн" value={fmt(total)} s={s} bold />

      <View style={s.tableDividerDashed} />

      {/* Payment */}
      <TotalRow label="Бэлэн" value={fmt(cashAmount)} s={s} />
      <TotalRow label="Бэлэн бус" value={fmt(nonCashAmount)} s={s} />
      <TotalRow label="Төлсөн" value={fmt(total)} s={s} bold />

      {/* Combined breakdown */}
      {paymentMethod === 'COMBINED' && combinedPayments && combinedPayments.length > 0 ? (
        <View style={{ marginTop: 4 }}>
          {combinedPayments.map((p, i) => (
            <View key={i} style={s.totalRow}>
              <Text style={[s.totalLabel, { fontSize: settings.fontSize - 3 }]}>  • {PAYMENT_NAMES[p.method] ?? p.method}</Text>
              <Text style={[s.totalValue, { fontSize: settings.fontSize - 3 }]}>{fmt(p.amount)}</Text>
            </View>
          ))}
        </View>
      ) : null}

      {settings.showSignatures && (
        <>
          <View style={s.tableDividerDashed} />
          <Text style={s.signLabel}>Хүлээлгэн өгсөн: ______________</Text>
          <Text style={s.signLabel}>Хүлээн авсан: _________________</Text>
        </>
      )}

      {settings.showFooter && (
        <>
          <View style={s.tableDividerDashed} />
          <Text style={s.footer}>{settings.footerMessage}</Text>
        </>
      )}

      {settings.feedbackPhone ? (
        <Text style={s.feedback}>Санал хүсэлт: {settings.feedbackPhone}</Text>
      ) : null}
    </View>
  );
}

function MetaRow({ label, value, s, multiline }: { label: string; value: string; s: any; multiline?: boolean }) {
  return (
    <View style={s.metaRow}>
      <Text style={s.metaLabel}>{label}:</Text>
      <Text style={s.metaValue} numberOfLines={multiline ? 3 : 1}>{value}</Text>
    </View>
  );
}

function TotalRow({ label, value, s, bold }: { label: string; value: string; s: any; bold?: boolean }) {
  return (
    <View style={s.totalRow}>
      <Text style={[s.totalLabel, bold && { fontWeight: '900' }]}>{label}</Text>
      <Text style={[s.totalValue, bold && { fontWeight: '900' }]}>{value}</Text>
    </View>
  );
}

interface HandoverReceiptProps {
  load: any;
  type: 'dispatch' | 'additional' | 'return';
  copyLabel: string;
  settings?: ReceiptSettings;
}

export function HandoverReceipt({ load, type, copyLabel, settings = DEFAULT_SETTINGS }: HandoverReceiptProps) {
  const driverName = `${load?.driver?.lastName ?? ''} ${load?.driver?.firstName ?? ''}`.trim();
  const items = load?.items ?? [];
  const now = new Date();
  const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  const totalQty = items.reduce((acc: number, i: any) => acc + (i?.loadedQty ?? 0), 0);
  const typeLabels = {
    dispatch: 'АЧИЛТ ХҮЛЭЭЛЦСЭН',
    additional: 'НЭМЭЛТ АЧИЛТ',
    return: 'БУЦААЛТ ХҮЛЭЭЛЦСЭН',
  };
  const s = makeStyles(settings);
  const width = widthForPaper(settings.paperWidth);

  return (
    <View style={[s.page, { width }]}>
      <Text style={s.title}>{settings.companyName}</Text>
      <Text style={s.subtitle}>{typeLabels[type]}</Text>
      <Text style={s.copyLabel}>{copyLabel}</Text>

      <View style={s.divider} />

      <View style={s.metaBlock}>
        <MetaRow label="Ачилт №" value={String(load?.loadNumber ?? '-')} s={s} />
        {settings.showDriver && (
          <>
            <MetaRow label="Жолооч" value={driverName || '-'} s={s} />
            {load?.driver?.phone ? <MetaRow label="Утас" value={load.driver.phone} s={s} /> : null}
          </>
        )}
        <MetaRow label="Огноо" value={dateStr} s={s} />
      </View>

      <View style={s.tableDivider} />
      <View style={s.tableHead}>
        <Text style={[s.th, { flex: 3 }]}>Бараа</Text>
        <Text style={[s.th, { flex: 1, textAlign: 'right' }]}>Т/Ш</Text>
      </View>
      <View style={s.tableDividerDashed} />

      {items.map((item: any, idx: number) => {
        const sku = item?.product?.barcodes?.[0]?.code ?? item?.product?.barcode;
        const prefix = settings.showItemNumber ? `${idx + 1}. ` : '';
        return (
          <View key={idx} style={s.itemRow}>
            <View style={{ flex: 3 }}>
              <Text style={s.itemName}>{prefix}{item?.product?.name ?? '-'}</Text>
              {sku ? <Text style={s.itemBarcode}>▎{sku}</Text> : null}
            </View>
            <Text style={[s.itemCell, { flex: 1, textAlign: 'right', fontWeight: '800' }]}>{item?.loadedQty ?? 0} ш</Text>
          </View>
        );
      })}

      <View style={s.tableDividerDashed} />

      <TotalRow label="Нийт" value={`${totalQty} ш`} s={s} bold />

      {settings.showSignatures && (
        <>
          <View style={s.tableDividerDashed} />
          <Text style={s.signLabel}>Хүлээлгэн өгсөн: ______________</Text>
          <Text style={s.signLabel}>Хүлээн авсан: _________________</Text>
        </>
      )}

      {settings.feedbackPhone ? (
        <Text style={s.feedback}>Санал хүсэлт: {settings.feedbackPhone}</Text>
      ) : null}
    </View>
  );
}

function makeStyles(settings: ReceiptSettings) {
  // Honor saved fontSize but cap at 14 for compactness as per latest design
  const fs = Math.min(settings.fontSize || 12, 14);
  return StyleSheet.create({
    page: { backgroundColor: '#FFFFFF', paddingVertical: 6, paddingHorizontal: 4 },
    title: { fontSize: fs + 6, fontWeight: '900', color: '#000', textAlign: 'center' },
    subtitle: { fontSize: fs - 1, fontWeight: '700', color: '#000', textAlign: 'center', marginTop: 1 },
    copyLabel: { fontSize: fs - 3, fontWeight: '700', color: '#000', textAlign: 'center', marginTop: 1 },
    divider: { borderBottomWidth: 1.5, borderBottomColor: '#000', borderStyle: 'dashed', marginVertical: 4 },
    tableDivider: { borderBottomWidth: 1.5, borderBottomColor: '#000', marginVertical: 3 },
    tableDividerDashed: { borderBottomWidth: 1, borderBottomColor: '#000', borderStyle: 'dashed', marginVertical: 3 },

    // Customer bar
    custBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 2, marginBottom: 2 },
    custName: { fontSize: fs - 1, fontWeight: '700', color: '#000', flex: 1 },
    custPhone: { fontSize: fs - 2, fontWeight: '600', color: '#000' },

    // Meta block
    metaBlock: { paddingVertical: 1 },
    metaRow: { flexDirection: 'row', paddingVertical: 1, alignItems: 'flex-start' },
    metaLabel: { fontSize: fs - 2, color: '#000', width: 65, fontWeight: '500' },
    metaValue: { fontSize: fs - 2, fontWeight: '600', color: '#000', flex: 1 },

    // Items table
    tableHead: { flexDirection: 'row', paddingVertical: 2 },
    th: { fontSize: fs - 3, fontWeight: '700', color: '#000' },
    itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 3 },
    itemName: { fontSize: fs - 2, fontWeight: '700', color: '#000', lineHeight: fs + 2 },
    itemBarcode: { fontSize: fs - 3, fontWeight: '800', color: '#000', lineHeight: fs + 1, marginTop: 1, letterSpacing: 0.5 },
    itemCell: { fontSize: fs - 2, color: '#000', paddingTop: 1 },

    // Totals
    totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 1 },
    totalLabel: { fontSize: fs - 2, fontWeight: '600', color: '#000' },
    totalValue: { fontSize: fs - 2, fontWeight: '600', color: '#000' },

    // Signatures / footer
    signLabel: { fontSize: fs - 3, color: '#000', paddingVertical: 4 },
    footer: { fontSize: fs - 1, fontWeight: '700', color: '#000', textAlign: 'center', marginTop: 2 },
    feedback: { fontSize: fs - 3, fontWeight: '700', color: '#000', textAlign: 'center', marginTop: 3 },
  });
}

export const DEFAULT_RECEIPT_WIDTH = 384;
