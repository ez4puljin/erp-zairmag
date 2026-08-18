/**
 * Баримтын загварын тохиргоо.
 *
 * Тохиргооны хуудасны урьдчилан харах болон POS-ийн бодит хэвлэлт хоёул
 * ЭНЭ нэг тодорхойлолтыг ашиглана — өмнө нь тус тусдаа кодтой байсан тул
 * хадгалсан загвар хэвлэх үедээ өөр гардаг байв.
 */
export interface ReceiptSettings {
  companyName: string;
  subtitle: string;
  phone: string | null;
  address: string | null;
  footerMessage: string;
  paperWidth: number;
  fontSize: number;
  showCustomer: boolean;
  showPhone: boolean;
  showSignatures: boolean;
  showFooter: boolean;
  showDriver: boolean;
  showBarcode: boolean;
  showItemNumber: boolean;
  showSaleDriver: boolean;
  showLoadNumber: boolean;
  feedbackPhone: string | null;
  printTwoCopies: boolean;

  /** Байршлын тохиргоо — принтерийн цэгээр (58мм цаас = 384 цэг). */
  marginX: number;
  marginY: number;
  lineSpacing: number;
  sectionSpacing: number;
  signatureSpacing: number;
  itemFontBoost: number;
  /** Үсэг хоорондын зай (px). Бутархай байж болно. */
  letterSpacing: number;
}

export const DEFAULT_RECEIPT_SETTINGS: ReceiptSettings = {
  companyName: 'ЗАЙРМАГ ТҮГЭЭЛТ',
  subtitle: 'БОРЛУУЛАЛТЫН БАРИМТ',
  phone: '',
  address: '',
  footerMessage: 'Баярлалаа!',
  paperWidth: 58,
  fontSize: 20,
  showCustomer: true,
  showPhone: true,
  showSignatures: true,
  showFooter: true,
  showDriver: true,
  showBarcode: true,
  showItemNumber: true,
  showSaleDriver: true,
  showLoadNumber: true,
  feedbackPhone: '90940123',
  printTwoCopies: true,
  marginX: 4,
  marginY: 4,
  lineSpacing: 2,
  sectionSpacing: 2,
  signatureSpacing: 6,
  itemFontBoost: 2,
  letterSpacing: 0,
};

/** Серверээс ирсэн утгыг өгөгдмөлтэй нийлүүлнэ (null → хоосон мөр). */
export function mergeReceiptSettings(raw: Partial<ReceiptSettings> | null | undefined): ReceiptSettings {
  return {
    ...DEFAULT_RECEIPT_SETTINGS,
    ...(raw ?? {}),
    phone: raw?.phone ?? '',
    address: raw?.address ?? '',
    feedbackPhone: raw?.feedbackPhone ?? '',
  };
}

/** Цаасны өргөнд тохирсон дэлгэцийн өргөн (px). */
export function receiptWidthPx(paperWidth: number): number {
  return paperWidth >= 80 ? 320 : 240;
}
