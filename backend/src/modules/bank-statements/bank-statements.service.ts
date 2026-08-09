import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import {
  parseStatement,
  isPosIncome,
  settlementDescription,
} from './statement-parser';

/** Гүйлгээний мөр бүрэн бөглөгдсөн эсэхийг шалгах талбарууд. */
type MissingField = 'partner' | 'account' | 'desc' | 'action';

interface TxnLike {
  partnerName: string;
  partnerAccount: string;
  customDescription: string;
  action: string;
}

function missingFields(t: TxnLike): MissingField[] {
  const missing: MissingField[] = [];
  if (!t.partnerName.trim()) missing.push('partner');
  if (!t.partnerAccount.trim()) missing.push('account');
  if (!t.customDescription.trim()) missing.push('desc');
  if (!t.action.trim()) missing.push('action');
  return missing;
}

function toNum(v: Prisma.Decimal | number): number {
  return typeof v === 'number' ? v : Number(v);
}

/** Өдрийн эхлэл/төгсгөлийг UTC-ээр — огноогоор шүүхэд ашиглана. */
function dayRange(date: string): { gte: Date; lt: Date } {
  const gte = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(gte.getTime())) throw new BadRequestException('Огноо буруу байна');
  const lt = new Date(gte.getTime() + 24 * 60 * 60 * 1000);
  return { gte, lt };
}

@Injectable()
export class BankStatementsService {
  constructor(private readonly prisma: PrismaService) {}

  // ── Тохиргоо (singleton) ──────────────────────────────────────────

  async getConfig() {
    const existing = await this.prisma.bankStatementConfig.findFirst();
    if (existing) return existing;
    // Анх удаа хандахад анхдагч утгатай мөрийг үүсгэнэ.
    return this.prisma.bankStatementConfig.create({ data: {} });
  }

  async updateConfig(dto: Prisma.BankStatementConfigUpdateInput) {
    const cfg = await this.getConfig();
    return this.prisma.bankStatementConfig.update({ where: { id: cfg.id }, data: dto });
  }

  // ── Харьцсан дансны бэлэн сонголтууд ──────────────────────────────

  listCrossAccounts() {
    return this.prisma.crossAccountPreset.findMany({
      orderBy: [{ sortOrder: 'asc' }, { createdAt: 'asc' }],
    });
  }

  createCrossAccount(data: { code: string; label?: string; sortOrder?: number }) {
    return this.prisma.crossAccountPreset.create({
      data: { code: data.code.trim(), label: data.label?.trim() ?? '', sortOrder: data.sortOrder ?? 0 },
    });
  }

  async updateCrossAccount(id: string, data: { code?: string; label?: string; sortOrder?: number }) {
    await this.getCrossAccountOrThrow(id);
    return this.prisma.crossAccountPreset.update({ where: { id }, data });
  }

  async deleteCrossAccount(id: string) {
    await this.getCrossAccountOrThrow(id);
    await this.prisma.crossAccountPreset.delete({ where: { id } });
    return { success: true };
  }

  private async getCrossAccountOrThrow(id: string) {
    const found = await this.prisma.crossAccountPreset.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Харьцсан данс олдсонгүй');
    return found;
  }

  // ── Хуулга оруулах ────────────────────────────────────────────────

  async upload(buffer: Buffer, filename: string, userId?: string) {
    const parsed = parseStatement(buffer, filename);
    if (parsed.transactions.length === 0) {
      throw new BadRequestException(
        'Хуулгаас гүйлгээ олдсонгүй. Хаанбанкны Excel хуулга мөн эсэхийг шалгана уу.',
      );
    }

    const cfg = await this.getConfig();

    const statement = await this.prisma.bankStatement.create({
      data: {
        accountNumber: parsed.accountNumber,
        currency: parsed.currency,
        dateFrom: parsed.dateFrom,
        dateTo: parsed.dateTo,
        filename: parsed.filename,
        uploadedById: userId ?? null,
        transactions: {
          create: parsed.transactions.map((t, index) => {
            const isSettlement = t.credit > 0 && isPosIncome(t.bankDescription);
            // Шимтгэл болон ПОС гүйлгээг тохиргооны дагуу урьдчилж бөглөнө —
            // хэрэглэгч дараа нь гараар засах боломжтой.
            const auto = t.isFee
              ? {
                  partnerName: cfg.feePartnerName,
                  partnerAccount: cfg.feePartnerAccount,
                  customDescription: cfg.feeDescription,
                  action: cfg.feeAction,
                }
              : isSettlement
                ? {
                    partnerName: cfg.settlementPartnerName,
                    partnerAccount: cfg.settlementPartnerAccount,
                    customDescription: settlementDescription(
                      cfg.settlementDescription,
                      t.bankDescription,
                    ),
                    action: cfg.settlementAction,
                  }
                : {};
            return {
              txnDate: t.txnDate,
              debit: t.debit,
              credit: t.credit,
              bankDescription: t.bankDescription,
              bankCounterpart: t.bankCounterpart,
              isFee: t.isFee,
              action: t.action,
              sortOrder: index,
              ...auto,
            };
          }),
        },
      },
    });

    return this.findOne(statement.id);
  }

  // ── Хуулга унших ──────────────────────────────────────────────────

  async findAll(params: { date?: string; dateFrom?: string; dateTo?: string }) {
    const where: Prisma.BankStatementWhereInput = {};
    if (params.date) {
      const { gte, lt } = dayRange(params.date);
      where.dateFrom = { gte, lt };
    } else if (params.dateFrom || params.dateTo) {
      where.dateFrom = {};
      if (params.dateFrom) where.dateFrom.gte = dayRange(params.dateFrom).gte;
      if (params.dateTo) where.dateFrom.lt = dayRange(params.dateTo).lt;
    }

    const statements = await this.prisma.bankStatement.findMany({
      where,
      orderBy: [{ dateFrom: 'desc' }, { uploadedAt: 'desc' }],
      include: { transactions: true },
    });
    return statements.map((s) => this.serializeStatement(s));
  }

  /**
   * Сар бүрийн өдрүүдэд хэдэн хуулга байгааг тоолж хуанлид харуулна.
   * Түлхүүр нь "YYYY-MM-DD".
   */
  async calendar(year: number, month: number) {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));
    const statements = await this.prisma.bankStatement.findMany({
      where: { dateFrom: { gte: from, lt: to } },
      include: { transactions: true },
    });

    const days: Record<string, { count: number; filled: number; total: number }> = {};
    for (const s of statements) {
      const key = s.dateFrom ? s.dateFrom.toISOString().slice(0, 10) : '';
      if (!key) continue;
      const stats = this.serializeStatement(s);
      const entry = (days[key] ??= { count: 0, filled: 0, total: 0 });
      entry.count += 1;
      entry.filled += stats.filledCount;
      entry.total += stats.txnCount;
    }
    return { year, month, days };
  }

  async findOne(id: string) {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id },
      include: {
        transactions: { orderBy: [{ sortOrder: 'asc' }, { txnDate: 'asc' }] },
        uploadedBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!statement) throw new NotFoundException('Хуулга олдсонгүй');
    return { ...this.serializeStatement(statement), transactions: statement.transactions.map(serializeTxn) };
  }

  async remove(id: string) {
    const found = await this.prisma.bankStatement.findUnique({ where: { id } });
    if (!found) throw new NotFoundException('Хуулга олдсонгүй');
    await this.prisma.bankStatement.delete({ where: { id } });
    return { success: true };
  }

  // ── Гүйлгээ засах ─────────────────────────────────────────────────

  async updateTransaction(
    statementId: string,
    txnId: string,
    dto: Partial<{
      partnerName: string;
      partnerCode: string;
      partnerAccount: string;
      customDescription: string;
      action: string;
    }>,
  ) {
    const txn = await this.prisma.bankTransaction.findUnique({ where: { id: txnId } });
    if (!txn || txn.statementId !== statementId) throw new NotFoundException('Гүйлгээ олдсонгүй');
    const updated = await this.prisma.bankTransaction.update({ where: { id: txnId }, data: dto });
    return serializeTxn(updated);
  }

  /**
   * Гүйлгээний утга хоосон мөрүүдийг банкны утгаар нөхөж бөглөнө.
   * Аль хэдийн бөглөсөн мөрүүдийг хөндөхгүй.
   */
  async fillDescriptions(statementId: string) {
    const txns = await this.prisma.bankTransaction.findMany({ where: { statementId } });
    if (txns.length === 0) throw new NotFoundException('Хуулга олдсонгүй');

    const targets = txns.filter((t) => !t.customDescription.trim() && t.bankDescription.trim());
    await this.prisma.$transaction(
      targets.map((t) =>
        this.prisma.bankTransaction.update({
          where: { id: t.id },
          data: { customDescription: t.bankDescription },
        }),
      ),
    );
    return { updated: targets.length };
  }

  /**
   * Дебит/Кредит баганыг солино. Зарим банкны хуулгад багана солигдож ирдэг
   * бөгөөд импортын дараа л мэдэгддэг.
   */
  async swapDebitCredit(statementId: string) {
    const txns = await this.prisma.bankTransaction.findMany({ where: { statementId } });
    if (txns.length === 0) throw new NotFoundException('Хуулга олдсонгүй');

    await this.prisma.$transaction(
      txns.map((t) =>
        this.prisma.bankTransaction.update({
          where: { id: t.id },
          data: { debit: t.credit, credit: t.debit },
        }),
      ),
    );
    return { updated: txns.length };
  }

  // ── Харилцагч хайх ────────────────────────────────────────────────

  /** Гүйлгээнд харилцагч сонгоход зориулсан хайлт (нэр/утас/РД). */
  async searchCustomers(query: string, limit = 20) {
    const q = (query || '').trim();
    const customers = await this.prisma.customer.findMany({
      where: q
        ? {
            OR: [
              { storeName: { contains: q, mode: 'insensitive' } },
              { phone: { contains: q, mode: 'insensitive' } },
              { registerNo: { contains: q, mode: 'insensitive' } },
            ],
          }
        : {},
      select: { id: true, storeName: true, phone: true, registerNo: true },
      orderBy: { storeName: 'asc' },
      take: Math.min(Math.max(limit, 1), 50),
    });
    return customers;
  }

  // ── Хувиргалт ─────────────────────────────────────────────────────

  private serializeStatement(s: {
    id: string;
    accountNumber: string;
    currency: string;
    dateFrom: Date | null;
    dateTo: Date | null;
    filename: string;
    uploadedAt: Date;
    transactions: Array<{
      isFee: boolean;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      partnerName: string;
      partnerAccount: string;
      customDescription: string;
      action: string;
    }>;
  }) {
    // Шимтгэлийн мөрийг үндсэн статистикт оруулахгүй — тэдгээр нь автоматаар
    // бөглөгддөг тул "дутуу" тоололд саад болно.
    const main = s.transactions.filter((t) => !t.isFee);

    const missing: Record<MissingField, number> = { partner: 0, account: 0, desc: 0, action: 0 };
    let filled = 0;
    for (const t of main) {
      const miss = missingFields(t);
      if (miss.length === 0) filled += 1;
      else for (const k of miss) missing[k] += 1;
    }

    return {
      id: s.id,
      accountNumber: s.accountNumber,
      currency: s.currency,
      dateFrom: s.dateFrom ? s.dateFrom.toISOString().slice(0, 10) : null,
      dateTo: s.dateTo ? s.dateTo.toISOString().slice(0, 10) : null,
      filename: s.filename,
      uploadedAt: s.uploadedAt.toISOString(),
      txnCount: main.length,
      feeCount: s.transactions.length - main.length,
      totalCredit: main.reduce((sum, t) => sum + toNum(t.credit), 0),
      totalDebit: main.reduce((sum, t) => sum + toNum(t.debit), 0),
      filledCount: filled,
      missing,
    };
  }
}

function serializeTxn(t: {
  id: string;
  txnDate: Date | null;
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  bankDescription: string;
  bankCounterpart: string;
  isFee: boolean;
  partnerName: string;
  partnerCode: string;
  partnerAccount: string;
  customDescription: string;
  action: string;
}) {
  return {
    id: t.id,
    txnDate: t.txnDate ? t.txnDate.toISOString() : null,
    debit: toNum(t.debit),
    credit: toNum(t.credit),
    bankDescription: t.bankDescription,
    bankCounterpart: t.bankCounterpart,
    isFee: t.isFee,
    partnerName: t.partnerName,
    partnerCode: t.partnerCode,
    partnerAccount: t.partnerAccount,
    customDescription: t.customDescription,
    action: t.action,
    isSettlement: toNum(t.credit) > 0 && isPosIncome(t.bankDescription),
  };
}
