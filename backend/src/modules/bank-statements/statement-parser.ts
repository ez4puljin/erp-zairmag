import * as XLSX from 'xlsx';

/**
 * Банкны хуулга Excel-ийг задлан унших.
 *
 * Хаанбанкны хуулгын бүтэц:
 *   Мөр 0: Хэвлэсэн огноо / Хэрэглэгч / Интервал зэрэг нийтлэг мэдээлэл
 *   Мөр 1: Баганы гарчиг — байрлал нь хувирдаг тул динамикаар танина
 *   Мөр 2..n: Гүйлгээний мөрүүд
 *   Сүүлийн мөр: "Нийт дүн:" нийлбэр (хасна)
 */

const FEE_KEYWORDS = ['хураамж', 'commission', 'fee', 'үйлчилгээний төлбөр'];

/** ПОС гүйлгээ — Хаанбанк тайлбарт "SETTLEMENT" гэж бичдэг. */
const SETTLEMENT_RE = /\bSETTLEMENT\b/i;

const DATE_YMD_RE = /\b(\d{4})[-./](\d{1,2})[-./](\d{1,2})\b/;
const DATE_DMY_RE = /\b(\d{1,2})[-./](\d{1,2})[-./](\d{4})\b/;

export interface ParsedTransaction {
  txnDate: Date | null;
  debit: number;
  credit: number;
  bankDescription: string;
  bankCounterpart: string;
  isFee: boolean;
  action: string;
}

export interface ParsedStatement {
  accountNumber: string;
  currency: string;
  dateFrom: Date | null;
  dateTo: Date | null;
  filename: string;
  transactions: ParsedTransaction[];
}

export function isFeeDescription(desc: string): boolean {
  const d = (desc || '').toLowerCase();
  return FEE_KEYWORDS.some((k) => d.includes(k));
}

export function isPosIncome(desc: string): boolean {
  return !!desc && SETTLEMENT_RE.test(desc);
}

/**
 * ПОС гүйлгээний утга = тохиргооны бичвэр + банкны бичвэр.
 * Аль нэг нь хоосон бол нөгөөг нь дангаар нь буцаана.
 */
export function settlementDescription(cfgText: string, bankDesc: string): string {
  const bd = (bankDesc || '').trim();
  const cfg = (cfgText || '').trim();
  if (cfg && bd) return `${cfg} ${bd}`;
  return cfg || bd;
}

/** Тайлбар бичвэрээс огноо ялгаж авна. Олдохгүй бол null. */
export function extractDateFromDescription(desc: string): Date | null {
  if (!desc) return null;
  const ymd = DATE_YMD_RE.exec(desc);
  if (ymd) {
    const d = makeDate(+ymd[1], +ymd[2], +ymd[3]);
    if (d) return d;
  }
  // Монголд DD/MM/YYYY хэлбэр түгээмэл
  const dmy = DATE_DMY_RE.exec(desc);
  if (dmy) {
    const d = makeDate(+dmy[3], +dmy[2], +dmy[1]);
    if (d) return d;
  }
  return null;
}

function makeDate(y: number, m: number, d: number): Date | null {
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  return dt.getUTCMonth() === m - 1 && dt.getUTCDate() === d ? dt : null;
}

interface ColumnMap {
  date: number;
  debit: number;
  credit: number;
  desc: number;
  counterpart: number;
  headerRow: number;
}

/**
 * Гарчгийн мөрийг сканнердаж Дебит/Кредит/Огноо/Утга/Харьцсан дансны баганы
 * индексийг олно. Дебит/Кредит баганы дараалал солигдсон ч зөв таних учиртай.
 */
function detectColumns(rows: unknown[][]): ColumnMap {
  const cols: ColumnMap = { date: 0, debit: 3, credit: 4, desc: 6, counterpart: 7, headerRow: 1 };
  // Гарчиг ихэвчлэн 1-р мөрд байдаг ч зарим хуулгад 0 эсвэл 2-т байна.
  for (let hr = 0; hr < Math.min(4, rows.length); hr++) {
    const header = rows[hr] ?? [];
    const found: Partial<ColumnMap> = {};
    header.forEach((val, idx) => {
      if (typeof val !== 'string') return;
      const s = val.trim().toLowerCase();
      if (!s) return;
      if (s.includes('дебит') || s.includes('debit')) found.debit = idx;
      else if (s.includes('кредит') || s.includes('credit')) found.credit = idx;
      else if ((s.includes('огноо') && (s.includes('гүйлгээ') || idx <= 1)) || s === 'date') {
        if (found.date === undefined) found.date = idx;
      } else if (s.includes('утга') || s.includes('тайлбар') || s.includes('description')) {
        found.desc = idx;
      } else if ((s.includes('харьцсан') && s.includes('данс')) || s.includes('counterparty')) {
        found.counterpart = idx;
      }
    });
    // Дебит, Кредит хоёулаа олдвол энэ мөрийг гарчиг гэж үзнэ.
    if (found.debit !== undefined && found.credit !== undefined) {
      return { ...cols, ...found, headerRow: hr };
    }
  }
  return cols;
}

/** Дансны дугаар/валютыг файлын нэрнээс ялгана: Statement_MNT_5301234567.xlsx */
function parseFilename(filename: string): { accountNumber: string; currency: string } {
  const m = /Statement_([A-Z]+)_(\d+)/.exec(filename || '');
  return m ? { currency: m[1], accountNumber: m[2] } : { currency: 'MNT', accountNumber: '' };
}

function toNumber(v: unknown): number {
  if (v === null || v === undefined || v === '') return 0;
  if (typeof v === 'number') return Number.isFinite(v) ? v : 0;
  const n = Number(String(v).replace(/[\s,']/g, ''));
  return Number.isFinite(n) ? n : 0;
}

function cellToDate(v: unknown): Date | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : v;
  if (typeof v === 'number') {
    // Excel серийн огноо (1900 систем)
    const parsed = XLSX.SSF.parse_date_code(v);
    if (!parsed) return null;
    return new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d, parsed.H ?? 0, parsed.M ?? 0, parsed.S ?? 0));
  }
  const s = String(v ?? '').trim();
  if (!s) return null;
  const fromDesc = extractDateFromDescription(s);
  if (fromDesc) return fromDesc;
  const d = new Date(s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Харьцсан дансыг цэвэрлэнэ: 5303363476.0 → "5303363476" */
function cleanCounterpart(v: unknown): string {
  if (v === null || v === undefined) return '';
  const s = String(v).trim();
  if (!s || s.toLowerCase() === 'nan') return '';
  const n = Number(s);
  if (Number.isFinite(n) && Number.isInteger(n)) return String(n);
  return s;
}

export function parseStatement(buffer: Buffer, filename: string): ParsedStatement {
  const { accountNumber, currency } = parseFilename(filename);

  const wb = XLSX.read(buffer, { type: 'buffer', cellDates: true });
  const sheetName = wb.SheetNames[0];
  if (!sheetName) {
    return { accountNumber, currency, dateFrom: null, dateTo: null, filename, transactions: [] };
  }
  const rows = XLSX.utils.sheet_to_json<unknown[]>(wb.Sheets[sheetName], {
    header: 1,
    raw: true,
    defval: null,
    blankrows: true,
  });

  // Эхний мөрөөс хуулгын интервалыг ялгана. Хэвлэсэн огноо ба интервал хоёулаа
  // байдаг тул YYYY-ээр эхэлсэн сүүлийн 1-2 огноог сонгоно.
  let dateFrom: Date | null = null;
  let dateTo: Date | null = null;
  const firstRow = (rows[0] ?? []).filter((v) => v !== null && v !== undefined);
  const joined = firstRow.map((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : String(v))).join(' ');
  const ymdParts = joined.match(/\d{4}[/\-.]\d{2}[/\-.]\d{2}/g) ?? [];
  if (ymdParts.length >= 2) {
    dateFrom = extractDateFromDescription(ymdParts[ymdParts.length - 2]);
    dateTo = extractDateFromDescription(ymdParts[ymdParts.length - 1]);
  } else if (ymdParts.length === 1) {
    dateFrom = dateTo = extractDateFromDescription(ymdParts[0]);
  }

  const cols = detectColumns(rows);
  const transactions: ParsedTransaction[] = [];

  for (let i = cols.headerRow + 1; i < rows.length; i++) {
    const row = rows[i] ?? [];
    const first = row[cols.date];
    if (first === null || first === undefined) continue;
    const firstStr = String(first).trim();
    // Нийлбэр мөрийг алгасна
    if (!firstStr || firstStr.startsWith('Нийт')) continue;

    const txnDate = cellToDate(first);
    if (!txnDate) continue; // огноо танигдахгүй бол гүйлгээний мөр биш

    // Зарим хуулгад дебит сөрөг утгатай ирдэг тул абсолют утгыг авна.
    const debit = Math.abs(toNumber(row[cols.debit]));
    const credit = Math.abs(toNumber(row[cols.credit]));

    let desc = '';
    const descRaw = row[cols.desc];
    if (descRaw !== null && descRaw !== undefined) {
      desc = String(descRaw).trim();
      if (desc.toLowerCase() === 'nan') desc = '';
    }

    const isFee = isFeeDescription(desc);
    transactions.push({
      txnDate,
      debit,
      credit,
      bankDescription: desc,
      bankCounterpart: cleanCounterpart(row[cols.counterpart]),
      isFee,
      // Орлогын мөр анхдагчаар "хаах" үйлдэлтэй
      action: credit > 0 && !isFee ? 'close' : '',
    });
  }

  // Хуулгын огноог ГҮЙЛГЭЭНЭЭС нь тодорхойлно.
  //
  // Толгой мөрөнд хуулгын интервал ба хэвлэсэн огноо хоёулаа байдаг бөгөөд
  // дараалал нь банк тус бүрд харилцан адилгүй. Улмаас хэвлэсэн огноог
  // хуулгын огноо гэж андуурч, 8/9-ний хуулга өнөөдрийн өдөр дээр
  // бүртгэгддэг байв. Гүйлгээний огноо нь эргэлзээгүй тул түүнийг эх
  // сурвалж болгоно; толгойн огноог зөвхөн гүйлгээгүй үед нөөцөд үлдээв.
  if (transactions.length > 0) {
    const times = transactions
      .map((t) => t.txnDate?.getTime())
      .filter((v): v is number => typeof v === 'number');
    if (times.length > 0) {
      dateFrom = new Date(Math.min(...times));
      dateTo = new Date(Math.max(...times));
    }
  }

  return { accountNumber, currency, dateFrom, dateTo, filename, transactions };
}
