/** Банкны хуулгын хэсэгт хамаарах хуваалцсан төрлүүд. */

export interface BankTxn {
  id: string;
  txnDate: string | null;
  debit: number;
  credit: number;
  bankDescription: string;
  bankCounterpart: string;
  isFee: boolean;
  description: string;
  /** Орлогын мөрд — төлбөр нь хаагдах харилцагч. */
  customerId: string | null;
  customerName: string | null;
  /** Зарлагын мөрд — зардал бүртгэгдэх ангилал. */
  expenseCategoryId: string | null;
  expenseCategoryName: string | null;
  /** Бүртгэсний дараа үүссэн бичилтүүд. */
  paymentId: string | null;
  expenseId: string | null;
  postedAt: string | null;
  isIncome: boolean;
  isSettlement: boolean;
}

export interface MissingCounts {
  /** Харилцагч (орлого) эсвэл зардлын ангилал (зарлага) сонгоогүй. */
  target: number;
  desc: number;
}

export interface BankStatement {
  id: string;
  accountNumber: string;
  currency: string;
  dateFrom: string | null;
  dateTo: string | null;
  filename: string;
  uploadedAt: string;
  bankAccountId: string | null;
  bankName: string | null;
  txnCount: number;
  feeCount: number;
  totalCredit: number;
  totalDebit: number;
  postedCount: number;
  readyCount: number;
  missing: MissingCounts;
  transactions?: BankTxn[];
  /** post-all хариунд ирнэ. */
  posted?: number;
  skipped?: Array<{ id: string; reason: string }>;
}

export interface StatementConfig {
  id: string;
  settlementCustomerId: string | null;
  settlementDescription: string;
  feeExpenseCategoryId: string | null;
  feeDescription: string;
}

export const MISSING_LABEL: Record<keyof MissingCounts, string> = {
  target: 'Харилцагч / ангилал',
  desc: 'Тайлбар',
};
