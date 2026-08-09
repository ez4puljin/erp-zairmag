import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, PaymentMethod, CustomerPaymentType } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentsService } from '../payments/payments.service';
import { ExpensesService } from '../expenses/expenses.service';
import { parseStatement, isPosIncome, settlementDescription } from './statement-parser';

/**
 * Банкны хуулгын гүйлгээг манай бүртгэлд буулгана.
 *
 *   Орлого (кредит) → харилцагчийн төлбөр болж өр нь хаагдана
 *   Зарлага (дебит) → сонгосон ангиллаар зардал болж бүртгэгдэнэ
 *
 * Төлбөр/зардлыг өөрсдийнх нь сервисээр үүсгэдэг — ингэснээр дансны
 * үлдэгдэл, харилцагчийн өр, авлагын дэвтэр бүгд зөв хөдөлнө.
 */

/** Мөр бүртгэхэд бэлэн эсэхийг тодорхойлох талбарууд. */
type MissingField = 'target' | 'desc';

interface TxnCore {
  debit: Prisma.Decimal;
  credit: Prisma.Decimal;
  description: string;
  customerId: string | null;
  expenseCategoryId: string | null;
  postedAt: Date | null;
}

function toNum(v: Prisma.Decimal | number): number {
  return typeof v === 'number' ? v : Number(v);
}

/** Мөрийн дүн ба чиглэл. Хоёул утгатай бол илүү нь голлоно. */
function amountOf(t: { debit: Prisma.Decimal; credit: Prisma.Decimal }) {
  const credit = toNum(t.credit);
  const debit = toNum(t.debit);
  return credit > 0 ? { amount: credit, income: true } : { amount: debit, income: false };
}

function missingFields(t: TxnCore): MissingField[] {
  const missing: MissingField[] = [];
  const { income } = amountOf(t);
  if (income ? !t.customerId : !t.expenseCategoryId) missing.push('target');
  if (!t.description.trim()) missing.push('desc');
  return missing;
}

/** Огноогоор шүүхэд ашиглах UTC өдрийн муж. */
function dayRange(date: string): { gte: Date; lt: Date } {
  const gte = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(gte.getTime())) throw new BadRequestException('Огноо буруу байна');
  return { gte, lt: new Date(gte.getTime() + 24 * 60 * 60 * 1000) };
}

@Injectable()
export class BankStatementsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly payments: PaymentsService,
    private readonly expenses: ExpensesService,
  ) {}

  // ── Тохиргоо (singleton) ──────────────────────────────────────────

  async getConfig() {
    const existing = await this.prisma.bankStatementConfig.findFirst();
    if (existing) return existing;
    return this.prisma.bankStatementConfig.create({ data: {} });
  }

  async updateConfig(dto: {
    settlementCustomerId?: string | null;
    settlementDescription?: string;
    feeExpenseCategoryId?: string | null;
    feeDescription?: string;
  }) {
    const cfg = await this.getConfig();
    return this.prisma.bankStatementConfig.update({
      where: { id: cfg.id },
      data: {
        // Хоосон мөрийг "сонгоогүй" гэж үзнэ — SET NULL хийнэ.
        settlementCustomerId: dto.settlementCustomerId || null,
        feeExpenseCategoryId: dto.feeExpenseCategoryId || null,
        ...(dto.settlementDescription !== undefined && {
          settlementDescription: dto.settlementDescription,
        }),
        ...(dto.feeDescription !== undefined && { feeDescription: dto.feeDescription }),
      },
    });
  }

  // ── Хуулга оруулах ────────────────────────────────────────────────

  async upload(buffer: Buffer, filename: string, userId?: string) {
    const parsed = parseStatement(buffer, filename);
    if (parsed.transactions.length === 0) {
      throw new BadRequestException(
        'Хуулгаас гүйлгээ олдсонгүй. Банкны Excel хуулга мөн эсэхийг шалгана уу.',
      );
    }

    const cfg = await this.getConfig();
    // Дансны дугаараар манай данстай холбоно — бүртгэхэд аль данснаас
    // мөнгө хөдөлснийг мэдэх шаардлагатай.
    const account = parsed.accountNumber
      ? await this.prisma.bankAccount.findFirst({
          where: { accountNumber: parsed.accountNumber },
          select: { id: true },
        })
      : null;

    const statement = await this.prisma.bankStatement.create({
      data: {
        accountNumber: parsed.accountNumber,
        currency: parsed.currency,
        dateFrom: parsed.dateFrom,
        dateTo: parsed.dateTo,
        filename: parsed.filename,
        uploadedById: userId ?? null,
        bankAccountId: account?.id ?? null,
        transactions: {
          create: parsed.transactions.map((t, index) => {
            const isSettlement = t.credit > 0 && isPosIncome(t.bankDescription);
            // Шимтгэл болон ПОС мөрийг тохиргооны дагуу урьдчилж бөглөнө.
            const auto = t.isFee
              ? {
                  expenseCategoryId: cfg.feeExpenseCategoryId,
                  description: cfg.feeDescription,
                }
              : isSettlement
                ? {
                    customerId: cfg.settlementCustomerId,
                    description: settlementDescription(
                      cfg.settlementDescription,
                      t.bankDescription,
                    ),
                  }
                : {};
            return {
              txnDate: t.txnDate,
              debit: t.debit,
              credit: t.credit,
              bankDescription: t.bankDescription,
              bankCounterpart: t.bankCounterpart,
              isFee: t.isFee,
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
      include: { transactions: true, bankAccount: { select: { bankName: true } } },
    });
    return statements.map((s) => this.serializeStatement(s));
  }

  /** Сарын өдөр бүрд хэдэн хуулга, хэр бүртгэгдсэнийг тоолж хуанлид өгнө. */
  async calendar(year: number, month: number) {
    const from = new Date(Date.UTC(year, month - 1, 1));
    const to = new Date(Date.UTC(year, month, 1));
    const statements = await this.prisma.bankStatement.findMany({
      where: { dateFrom: { gte: from, lt: to } },
      include: { transactions: true },
    });

    const days: Record<string, { count: number; posted: number; total: number }> = {};
    for (const s of statements) {
      const key = s.dateFrom ? s.dateFrom.toISOString().slice(0, 10) : '';
      if (!key) continue;
      const stats = this.serializeStatement(s);
      const entry = (days[key] ??= { count: 0, posted: 0, total: 0 });
      entry.count += 1;
      entry.posted += stats.postedCount;
      entry.total += stats.txnCount;
    }
    return { year, month, days };
  }

  async findOne(id: string) {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id },
      include: {
        transactions: {
          orderBy: [{ sortOrder: 'asc' }, { txnDate: 'asc' }],
          include: {
            customer: { select: { id: true, storeName: true } },
            expenseCategory: { select: { id: true, name: true } },
          },
        },
        bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
        feeExpense: { select: { id: true, expenseNumber: true, amount: true } },
      },
    });
    if (!statement) throw new NotFoundException('Хуулга олдсонгүй');
    return {
      ...this.serializeStatement(statement),
      transactions: statement.transactions.map(serializeTxn),
    };
  }

  async remove(id: string) {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id },
      include: { transactions: { select: { postedAt: true } } },
    });
    if (!statement) throw new NotFoundException('Хуулга олдсонгүй');

    // Бүртгэсэн мөр байвал устгахаас өмнө буцаах ёстой — эс бөгөөс төлбөр,
    // зардал нь эзэнгүй үлдэж, дансны үлдэгдэл буруу болно.
    const posted = statement.transactions.filter((t) => t.postedAt).length;
    if (posted > 0) {
      throw new BadRequestException(
        `${posted} мөр бүртгэгдсэн байна. Эхлээд буцаана уу.`,
      );
    }
    if (statement.feeExpenseId) {
      throw new BadRequestException('Шимтгэлийн зардал бүртгэлтэй байна. Эхлээд буцаана уу.');
    }

    await this.prisma.bankStatement.delete({ where: { id } });
    return { success: true };
  }

  /** Хуулгыг манай аль данстай холбохыг гараар зааж өгнө. */
  async setBankAccount(id: string, bankAccountId: string | null) {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id },
      include: { transactions: { select: { postedAt: true } } },
    });
    if (!statement) throw new NotFoundException('Хуулга олдсонгүй');
    if (statement.transactions.some((t) => t.postedAt) || statement.feeExpenseId) {
      throw new BadRequestException('Бүртгэсэн мөртэй хуулгын дансыг солих боломжгүй.');
    }
    if (bankAccountId) {
      const acc = await this.prisma.bankAccount.findUnique({ where: { id: bankAccountId } });
      if (!acc) throw new NotFoundException('Данс олдсонгүй');
    }
    await this.prisma.bankStatement.update({ where: { id }, data: { bankAccountId } });
    return this.findOne(id);
  }

  // ── Гүйлгээ засах ─────────────────────────────────────────────────

  async updateTransaction(
    statementId: string,
    txnId: string,
    dto: {
      description?: string;
      customerId?: string | null;
      expenseCategoryId?: string | null;
    },
  ) {
    const txn = await this.prisma.bankTransaction.findUnique({ where: { id: txnId } });
    if (!txn || txn.statementId !== statementId) throw new NotFoundException('Гүйлгээ олдсонгүй');
    if (txn.postedAt) {
      throw new BadRequestException('Бүртгэсэн гүйлгээг засахын тулд эхлээд буцаана уу.');
    }

    await this.prisma.bankTransaction.update({
      where: { id: txnId },
      data: {
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.customerId !== undefined && { customerId: dto.customerId || null }),
        ...(dto.expenseCategoryId !== undefined && {
          expenseCategoryId: dto.expenseCategoryId || null,
        }),
      },
    });
    return this.findOne(statementId);
  }

  /** Гүйлгээний утга хоосон мөрүүдийг банкны утгаар нөхнө. */
  async fillDescriptions(statementId: string) {
    const txns = await this.prisma.bankTransaction.findMany({ where: { statementId } });
    if (txns.length === 0) throw new NotFoundException('Хуулга олдсонгүй');

    const targets = txns.filter(
      (t) => !t.postedAt && !t.description.trim() && t.bankDescription.trim(),
    );
    await this.prisma.$transaction(
      targets.map((t) =>
        this.prisma.bankTransaction.update({
          where: { id: t.id },
          data: { description: t.bankDescription },
        }),
      ),
    );
    return this.findOne(statementId);
  }

  /**
   * Дебит/Кредит баганыг солино. Зарим хуулгад багана солигдож ирдэг ба
   * оруулсны дараа л мэдэгддэг.
   */
  async swapDebitCredit(statementId: string) {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id: statementId },
      include: { transactions: true },
    });
    if (!statement) throw new NotFoundException('Хуулга олдсонгүй');
    const txns = statement.transactions;
    if (txns.some((t) => t.postedAt) || statement.feeExpenseId) {
      throw new BadRequestException('Бүртгэсэн мөртэй үед багана солих боломжгүй.');
    }

    await this.prisma.$transaction(
      txns.map((t) =>
        this.prisma.bankTransaction.update({
          where: { id: t.id },
          data: { debit: t.credit, credit: t.debit },
        }),
      ),
    );
    return this.findOne(statementId);
  }

  // ── Бүртгэх / буцаах ──────────────────────────────────────────────

  /** Нэг мөрийг төлбөр эсвэл зардал болгож бүртгэнэ. */
  async postTransaction(statementId: string, txnId: string, userId: string) {
    const txn = await this.prisma.bankTransaction.findUnique({
      where: { id: txnId },
      include: { statement: { select: { id: true, bankAccountId: true } } },
    });
    if (!txn || txn.statementId !== statementId) throw new NotFoundException('Гүйлгээ олдсонгүй');

    await this.postOne(txn, userId);
    return this.findOne(statementId);
  }

  /**
   * Бэлэн болсон бүх мөрийг нэг дор бүртгэнэ.
   * Шимтгэлийн мөрийг оруулахгүй — тэдгээрийг нийлбэрээр нь тусад нь хаана.
   */
  async postAll(statementId: string, userId: string) {
    const txns = await this.prisma.bankTransaction.findMany({
      where: { statementId, postedAt: null, isFee: false },
      orderBy: [{ sortOrder: 'asc' }],
      include: { statement: { select: { id: true, bankAccountId: true } } },
    });

    let posted = 0;
    const skipped: Array<{ id: string; reason: string }> = [];
    for (const txn of txns) {
      try {
        await this.postOne(txn, userId);
        posted += 1;
      } catch (e) {
        // Нэг мөр бүтэлгүйтсэн ч бусдыг үргэлжлүүлнэ — шалтгааныг буцаана.
        skipped.push({ id: txn.id, reason: (e as Error).message });
      }
    }
    return { ...(await this.findOne(statementId)), posted, skipped };
  }

  /**
   * Хуулгын бүх шимтгэлийг нэгтгэж ганц зардал болгож хаана.
   *
   * Шимтгэл нь өдөрт хэдэн ч удаа, бага дүнгээр суудаг тул мөр бүрээр нь
   * зардал үүсгэвэл бүртгэл хэрэггүй олон бичилтээр дүүрнэ.
   */
  async postFees(statementId: string, userId: string, expenseCategoryId?: string) {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id: statementId },
      include: { transactions: { where: { isFee: true } } },
    });
    if (!statement) throw new NotFoundException('Хуулга олдсонгүй');
    if (statement.feeExpenseId) {
      throw new BadRequestException('Шимтгэл аль хэдийн бүртгэгдсэн байна.');
    }
    if (!statement.bankAccountId) {
      throw new BadRequestException('Хуулгын дансыг эхлээд сонгоно уу.');
    }

    const fees = statement.transactions;
    if (fees.length === 0) throw new BadRequestException('Шимтгэлийн мөр алга.');
    // Энэ өөрчлөлтөөс өмнө оруулсан хуулганд шимтгэлийг мөрөөр нь бүртгэсэн
    // байж болно — давхар зардал үүсгэхээс сэргийлнэ.
    if (fees.some((t) => t.postedAt)) {
      throw new BadRequestException(
        'Шимтгэлийн мөр аль хэдийн бүртгэгдсэн байна. Эхлээд буцаана уу.',
      );
    }

    // Шимтгэл нь зарлага. Буцаалт (кредит) байвал нийлбэрээс хасна.
    const total = fees.reduce((sum, t) => sum + toNum(t.debit) - toNum(t.credit), 0);
    if (total <= 0) throw new BadRequestException('Шимтгэлийн нийлбэр тэг байна.');

    const cfg = await this.getConfig();
    const categoryId = expenseCategoryId || cfg.feeExpenseCategoryId;
    if (!categoryId) throw new BadRequestException('Зардлын ангилал сонгоогүй байна.');

    // Огноо — хамгийн эртний шимтгэлийн огноо, эс бөгөөс хуулгын эхлэл.
    const dates = fees.map((t) => t.txnDate).filter((d): d is Date => !!d);
    const at = dates.length
      ? new Date(Math.min(...dates.map((d) => d.getTime())))
      : (statement.dateFrom ?? new Date());

    const expense = await this.expenses.create(
      {
        categoryId,
        amount: total,
        description: `${cfg.feeDescription || 'Банкны шимтгэл'} (${fees.length} гүйлгээ)`,
        date: at.toISOString().slice(0, 10),
        bankAccountId: statement.bankAccountId,
      },
      userId,
    );

    const postedAt = new Date();
    await this.prisma.$transaction([
      this.prisma.bankStatement.update({
        where: { id: statementId },
        data: { feeExpenseId: expense.id },
      }),
      this.prisma.bankTransaction.updateMany({
        where: { statementId, isFee: true },
        data: { postedAt, expenseCategoryId: categoryId },
      }),
    ]);

    return this.findOne(statementId);
  }

  /** Шимтгэлийн нэгдсэн зардлыг буцаана. */
  async unpostFees(statementId: string) {
    const statement = await this.prisma.bankStatement.findUnique({
      where: { id: statementId },
      include: { transactions: { where: { isFee: true, postedAt: { not: null } } } },
    });
    if (!statement) throw new NotFoundException('Хуулга олдсонгүй');

    if (!statement.feeExpenseId) {
      // Хуучин хуулганд шимтгэлийг мөрөөр нь бүртгэсэн байж болно.
      if (statement.transactions.length === 0) {
        throw new BadRequestException('Шимтгэл бүртгэгдээгүй байна.');
      }
      for (const t of statement.transactions) {
        await this.unpostTransaction(statementId, t.id);
      }
      return this.findOne(statementId);
    }

    const expenseId = statement.feeExpenseId;
    // Холбоосыг эхлээд салгана — эс бөгөөс FK нь устгалыг зогсооно.
    await this.prisma.$transaction([
      this.prisma.bankStatement.update({
        where: { id: statementId },
        data: { feeExpenseId: null },
      }),
      this.prisma.bankTransaction.updateMany({
        where: { statementId, isFee: true },
        data: { postedAt: null },
      }),
    ]);
    await this.expenses.remove(expenseId);

    return this.findOne(statementId);
  }

  private async postOne(
    txn: {
      id: string;
      isFee: boolean;
      debit: Prisma.Decimal;
      credit: Prisma.Decimal;
      description: string;
      customerId: string | null;
      expenseCategoryId: string | null;
      postedAt: Date | null;
      txnDate: Date | null;
      bankDescription: string;
      statement: { id: string; bankAccountId: string | null };
    },
    userId: string,
  ) {
    if (txn.postedAt) throw new BadRequestException('Энэ мөр аль хэдийн бүртгэгдсэн байна.');
    if (txn.isFee) {
      throw new BadRequestException('Шимтгэлийг нийлбэрээр нь нэг дор бүртгэнэ.');
    }

    const { amount, income } = amountOf(txn);
    if (amount <= 0) throw new BadRequestException('Дүн тэг байна.');
    if (!txn.statement.bankAccountId) {
      throw new BadRequestException('Хуулгын дансыг эхлээд сонгоно уу.');
    }

    const at = txn.txnDate ?? new Date();
    const note = txn.description.trim() || txn.bankDescription.trim();

    if (income) {
      if (!txn.customerId) throw new BadRequestException('Харилцагч сонгоогүй байна.');
      const payment = await this.payments.recordPayment(
        {
          customerId: txn.customerId,
          amount,
          type: CustomerPaymentType.RECEIPT,
          method: PaymentMethod.BANK_TRANSFER,
          bankAccountId: txn.statement.bankAccountId,
          paidAt: at.toISOString(),
          note,
        },
        userId,
      );
      await this.prisma.bankTransaction.update({
        where: { id: txn.id },
        data: { paymentId: payment.id, postedAt: new Date() },
      });
      return;
    }

    if (!txn.expenseCategoryId) throw new BadRequestException('Зардлын ангилал сонгоогүй байна.');
    const expense = await this.expenses.create(
      {
        categoryId: txn.expenseCategoryId,
        amount,
        description: note || 'Банкны хуулга',
        date: at.toISOString().slice(0, 10),
        bankAccountId: txn.statement.bankAccountId,
      },
      userId,
    );
    await this.prisma.bankTransaction.update({
      where: { id: txn.id },
      data: { expenseId: expense.id, postedAt: new Date() },
    });
  }

  /** Бүртгэлийг буцаана — үүссэн төлбөр/зардлыг устгаж нөлөөг сэргээнэ. */
  async unpostTransaction(statementId: string, txnId: string) {
    const txn = await this.prisma.bankTransaction.findUnique({ where: { id: txnId } });
    if (!txn || txn.statementId !== statementId) throw new NotFoundException('Гүйлгээ олдсонгүй');
    if (!txn.postedAt) throw new BadRequestException('Энэ мөр бүртгэгдээгүй байна.');

    // Холбоосыг эхлээд салгана — эс бөгөөс FK нь устгалыг зогсооно.
    await this.prisma.bankTransaction.update({
      where: { id: txn.id },
      data: { paymentId: null, expenseId: null, postedAt: null },
    });
    if (txn.paymentId) await this.payments.remove(txn.paymentId);
    if (txn.expenseId) await this.expenses.remove(txn.expenseId);

    return this.findOne(statementId);
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
    bankAccountId: string | null;
    bankAccount?: { bankName: string; accountNumber?: string; id?: string } | null;
    feeExpenseId?: string | null;
    feeExpense?: { expenseNumber: number; amount: Prisma.Decimal } | null;
    transactions: Array<TxnCore & { isFee: boolean }>;
  }) {
    // Шимтгэлийг нийлбэрээр нь тусад нь хаадаг тул үндсэн тооцоонд оруулахгүй.
    const txns = s.transactions.filter((t) => !t.isFee);
    const fees = s.transactions.filter((t) => t.isFee);

    const missing: Record<MissingField, number> = { target: 0, desc: 0 };
    let ready = 0;
    let posted = 0;
    for (const t of txns) {
      if (t.postedAt) {
        posted += 1;
        continue;
      }
      const miss = missingFields(t);
      if (miss.length === 0) ready += 1;
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
      bankAccountId: s.bankAccountId,
      bankName: s.bankAccount?.bankName ?? null,
      txnCount: txns.length,
      totalCredit: txns.reduce((sum, t) => sum + toNum(t.credit), 0),
      totalDebit: txns.reduce((sum, t) => sum + toNum(t.debit), 0),
      postedCount: posted,
      readyCount: ready,
      missing,
      // Шимтгэл — тусдаа блок болж харагдана.
      fee: {
        count: fees.length,
        total: fees.reduce((sum, t) => sum + toNum(t.debit) - toNum(t.credit), 0),
        // Хуучин хуулганд мөрөөр нь бүртгэсэн байж болох тул түүнийг ч
        // "бүртгэсэн" гэж үзнэ — эс бөгөөс давхар хаах товч идэвхтэй харагдана.
        posted: !!s.feeExpenseId || fees.some((t) => t.postedAt),
        expenseNumber: s.feeExpense?.expenseNumber ?? null,
      },
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
  description: string;
  customerId: string | null;
  expenseCategoryId: string | null;
  paymentId: string | null;
  expenseId: string | null;
  postedAt: Date | null;
  customer?: { id: string; storeName: string } | null;
  expenseCategory?: { id: string; name: string } | null;
}) {
  const credit = toNum(t.credit);
  return {
    id: t.id,
    txnDate: t.txnDate ? t.txnDate.toISOString() : null,
    debit: toNum(t.debit),
    credit,
    bankDescription: t.bankDescription,
    bankCounterpart: t.bankCounterpart,
    isFee: t.isFee,
    description: t.description,
    customerId: t.customerId,
    customerName: t.customer?.storeName ?? null,
    expenseCategoryId: t.expenseCategoryId,
    expenseCategoryName: t.expenseCategory?.name ?? null,
    paymentId: t.paymentId,
    expenseId: t.expenseId,
    postedAt: t.postedAt ? t.postedAt.toISOString() : null,
    isIncome: credit > 0,
    isSettlement: credit > 0 && isPosIncome(t.bankDescription),
  };
}
