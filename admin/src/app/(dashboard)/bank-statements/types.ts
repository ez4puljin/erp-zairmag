/** Банкны хуулгын хэсэгт хамаарах хуваалцсан төрлүүд. */

export interface BankTxn {
  id: string;
  txnDate: string | null;
  debit: number;
  credit: number;
  bankDescription: string;
  bankCounterpart: string;
  isFee: boolean;
  partnerName: string;
  partnerCode: string;
  partnerAccount: string;
  customDescription: string;
  action: string;
  /** ПОС (SETTLEMENT) орлого мөн эсэх — автомат бөглөгддөг. */
  isSettlement: boolean;
}

export interface MissingCounts {
  partner: number;
  account: number;
  desc: number;
  action: number;
}

export interface BankStatement {
  id: string;
  accountNumber: string;
  currency: string;
  dateFrom: string | null;
  dateTo: string | null;
  filename: string;
  uploadedAt: string;
  txnCount: number;
  feeCount: number;
  totalCredit: number;
  totalDebit: number;
  filledCount: number;
  missing: MissingCounts;
  transactions?: BankTxn[];
}

export interface CrossAccount {
  id: string;
  code: string;
  label: string;
  sortOrder: number;
}

export interface StatementConfig {
  id: string;
  settlementPartnerName: string;
  settlementPartnerAccount: string;
  settlementDescription: string;
  settlementAction: string;
  feePartnerName: string;
  feePartnerAccount: string;
  feeDescription: string;
  feeAction: string;
}

/** Гүйлгээнд сонгож болох үйлдлүүд — backend-ийн TXN_ACTIONS-тэй тэнцүү. */
export const ACTION_OPTIONS = [
  { value: 'close', label: 'Хаах' },
  { value: 'create', label: 'Үүсгэх' },
  { value: 'close_create', label: 'Хаах + Үүсгэх' },
];

export const ACTION_LABEL: Record<string, string> = {
  close: 'Хаах',
  create: 'Үүсгэх',
  close_create: 'Хаах + Үүсгэх',
};

export const MISSING_LABEL: Record<keyof MissingCounts, string> = {
  partner: 'Харилцагч',
  account: 'Харьцсан данс',
  desc: 'Гүйлгээний утга',
  action: 'Үйлдэл',
};
