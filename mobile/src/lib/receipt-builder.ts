// ESC/POS receipt builder for 80mm thermal printer (48 chars per line)
const LINE_WIDTH = 48;
const SEPARATOR = '─'.repeat(LINE_WIDTH);
const DOUBLE_SEP = '═'.repeat(LINE_WIDTH);

function pad(text: string, width: number, align: 'left' | 'right' = 'left'): string {
  const t = text.substring(0, width);
  return align === 'right' ? t.padStart(width) : t.padEnd(width);
}

function center(text: string): string {
  const padding = Math.max(0, Math.floor((LINE_WIDTH - text.length) / 2));
  return ' '.repeat(padding) + text;
}

function formatMoney(amount: number): string {
  return `₮${amount.toLocaleString()}`;
}

const PAYMENT_NAMES: Record<string, string> = {
  CASH: 'Бэлэн',
  BANK_TRANSFER: 'Шилжүүлэг',
  CARD: 'Карт',
  CREDIT: 'Зээл',
  COMBINED: 'Хосолсон',
  MOBILE_MONEY: 'Мобайл',
};

export function buildSaleReceipt(sale: any, copyLabel: string): string {
  const customer = sale.customer ?? {};
  const items = sale.items ?? [];
  const total = Number(sale.totalAmount ?? 0);
  const pm = PAYMENT_NAMES[sale.paymentMethod] ?? sale.paymentMethod ?? '-';
  const date = new Date().toLocaleString('mn-MN');

  let r = '';
  r += DOUBLE_SEP + '\n';
  r += center('ЗАЙРМАГ ТҮГЭЭЛТ') + '\n';
  r += center('БОРЛУУЛАЛТЫН БАРИМТ') + '\n';
  r += center(copyLabel) + '\n';
  r += DOUBLE_SEP + '\n';
  r += `Баримт №: ${sale.saleNumber ?? '-'}\n`;
  r += `Огноо:    ${date}\n`;
  r += SEPARATOR + '\n';
  r += `Харилцагч: ${customer.storeName ?? '-'}\n`;
  r += `Утас:      ${customer.phone ?? '-'}\n`;
  r += SEPARATOR + '\n';
  r += pad('БАРАА', 24) + pad('Тоо', 6, 'right') + pad('Нийт', 18, 'right') + '\n';
  r += SEPARATOR + '\n';

  for (const item of items) {
    const name = pad(item.product?.name ?? '-', 24);
    const qty = pad(String(item.quantity ?? 0), 6, 'right');
    const lt = pad(formatMoney(Number(item.lineTotal ?? 0)), 18, 'right');
    r += name + qty + lt + '\n';
  }

  r += SEPARATOR + '\n';
  r += pad('НИЙТ ДҮН:', 24) + pad(formatMoney(total), 24, 'right') + '\n';
  r += `Төлбөр: ${pm}\n`;
  r += SEPARATOR + '\n';
  r += '\n';
  r += 'Хүлээлгэн өгсөн: ___________________\n';
  r += '\n';
  r += 'Хүлээн авсан:    ___________________\n';
  r += DOUBLE_SEP + '\n';

  return r;
}

export function buildOrderReceipt(order: any, copyLabel: string): string {
  const customer = order.customer ?? {};
  const items = order.items ?? [];
  const total = Number(order.totalAmount ?? 0);
  const pm = PAYMENT_NAMES[order.paymentMethod] ?? order.paymentMethod ?? '-';
  const driver = order.deliveryRoute?.driver;
  const driverName = driver ? `${driver.lastName ?? ''} ${driver.firstName ?? ''}`.trim() : '-';
  const date = new Date().toLocaleString('mn-MN');

  let r = '';
  r += DOUBLE_SEP + '\n';
  r += center('ЗАХИАЛГЫН БАРИМТ') + '\n';
  r += center(copyLabel) + '\n';
  r += DOUBLE_SEP + '\n';
  r += `Захиалга №: ${order.orderNumber ?? '-'}\n`;
  r += `Огноо:      ${date}\n`;
  r += `Жолооч:     ${driverName}\n`;
  r += SEPARATOR + '\n';
  r += `Харилцагч:  ${customer.storeName ?? '-'}\n`;
  r += `Утас:       ${customer.phone ?? '-'}\n`;
  r += `Хаяг:       ${customer.address ?? '-'}\n`;
  r += SEPARATOR + '\n';
  r += pad('БАРАА', 24) + pad('Тоо', 6, 'right') + pad('Нийт', 18, 'right') + '\n';
  r += SEPARATOR + '\n';

  for (const item of items) {
    const name = pad(item.product?.name ?? '-', 24);
    const qty = pad(String(item.quantity ?? 0), 6, 'right');
    const lt = pad(formatMoney(Number(item.lineTotal ?? 0)), 18, 'right');
    r += name + qty + lt + '\n';
  }

  r += SEPARATOR + '\n';
  r += pad('НИЙТ ДҮН:', 24) + pad(formatMoney(total), 24, 'right') + '\n';
  r += `Төлбөр: ${pm}\n`;
  r += SEPARATOR + '\n';
  r += '\n';
  r += 'Хүлээлгэн өгсөн: ___________________\n';
  r += '\n';
  r += 'Хүлээн авсан:    ___________________\n';
  r += DOUBLE_SEP + '\n';

  return r;
}

export function buildHandoverReceipt(load: any, type: 'dispatch' | 'additional' | 'return', copyLabel: string): string {
  const driverName = `${load.driver?.lastName ?? ''} ${load.driver?.firstName ?? ''}`.trim();
  const items = load.items ?? [];
  const date = new Date().toLocaleString('mn-MN');

  const typeLabels = {
    dispatch: 'АЧИЛТ ХҮЛЭЭЛЦСЭН БАРИМТ',
    additional: 'НЭМЭЛТ АЧИЛТ БАРИМТ',
    return: 'БУЦААЛТ ХҮЛЭЭЛЦСЭН БАРИМТ',
  };

  let r = '';
  r += DOUBLE_SEP + '\n';
  r += center('ЗАЙРМАГ ТҮГЭЭЛТ') + '\n';
  r += center(typeLabels[type]) + '\n';
  r += center(copyLabel) + '\n';
  r += DOUBLE_SEP + '\n';
  r += `Ачилт №: ${load.loadNumber ?? '-'}\n`;
  r += `Жолооч:  ${driverName}\n`;
  r += `Утас:    ${load.driver?.phone ?? '-'}\n`;
  r += `Огноо:   ${date}\n`;
  r += SEPARATOR + '\n';
  r += pad('БАРАА', 28) + pad('Тоо', 20, 'right') + '\n';
  r += SEPARATOR + '\n';

  for (const item of items) {
    const name = pad(item.product?.name ?? '-', 28);
    const qty = pad(String(item.loadedQty ?? 0) + ' ш', 20, 'right');
    r += name + qty + '\n';
  }

  const totalQty = items.reduce((s: number, i: any) => s + (i.loadedQty ?? 0), 0);
  r += SEPARATOR + '\n';
  r += pad('НИЙТ:', 28) + pad(String(totalQty) + ' ш', 20, 'right') + '\n';
  r += SEPARATOR + '\n';
  r += '\n';
  r += 'Хүлээлгэн өгсөн: ___________________\n';
  r += '\n';
  r += 'Хүлээн авсан:    ___________________\n';
  r += DOUBLE_SEP + '\n';

  return r;
}
