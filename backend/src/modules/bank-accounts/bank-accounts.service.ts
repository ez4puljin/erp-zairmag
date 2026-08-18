import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';
import { CreateBankTransferDto } from './dto/create-bank-transfer.dto';

@Injectable()
export class BankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBankAccountDto) {
    const opening = dto.openingBalance ?? 0;
    return this.prisma.$transaction(async (tx) => {
      if (dto.isIncomeDefault) await this.clearIncomeDefault(tx);
      return tx.bankAccount.create({
        data: {
          bankName: dto.bankName,
          accountNumber: dto.accountNumber,
          holderName: dto.holderName,
          currency: dto.currency ?? 'MNT',
          openingBalance: opening,
          currentBalance: opening,
          notes: dto.notes ?? null,
          isActive: dto.isActive ?? true,
          isIncomeDefault: dto.isIncomeDefault ?? false,
        },
      });
    });
  }

  /** Одоо байгаа орлогын дансны тэмдгийг арилгана — зөвхөн нэг байх ёстой. */
  private async clearIncomeDefault(tx: any, exceptId?: string) {
    await tx.bankAccount.updateMany({
      where: { isIncomeDefault: true, ...(exceptId ? { id: { not: exceptId } } : {}) },
      data: { isIncomeDefault: false },
    });
  }

  /** ПОС-ын шилжүүлгийн төлбөрийг хаах данс. Тохируулаагүй бол null. */
  async getIncomeAccount() {
    return this.prisma.bankAccount.findFirst({
      where: { isIncomeDefault: true, isActive: true },
      select: { id: true },
    });
  }

  async findAll(includeInactive = false) {
    return this.prisma.bankAccount.findMany({
      where: includeInactive ? {} : { isActive: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const acc = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!acc) throw new NotFoundException('Данс олдсонгүй');
    return acc;
  }

  async update(id: string, dto: UpdateBankAccountDto) {
    const existing = await this.prisma.bankAccount.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Данс олдсонгүй');

    const data: any = { ...dto };
    if (dto.openingBalance !== undefined) {
      // Adjust currentBalance by the delta
      const delta = Number(dto.openingBalance) - Number(existing.openingBalance);
      data.currentBalance = Number(existing.currentBalance) + delta;
    }

    return this.prisma.$transaction(async (tx) => {
      // Өмнөх орлогын дансыг эхлээд арилгана — эс бөгөөс өгөгдлийн сангийн
      // цор ганц индекс зөрчигдөж алдаа өгнө.
      if (dto.isIncomeDefault) await this.clearIncomeDefault(tx, id);
      return tx.bankAccount.update({ where: { id }, data });
    });
  }

  async remove(id: string) {
    const used = await this.prisma.payment.count({ where: { bankAccountId: id } });
    const used2 = await this.prisma.supplierPayment.count({ where: { bankAccountId: id } });
    if (used + used2 > 0) {
      // Soft-delete: mark inactive instead
      return this.prisma.bankAccount.update({ where: { id }, data: { isActive: false } });
    }
    return this.prisma.bankAccount.delete({ where: { id } });
  }

  // Get transactions (incoming payments and outgoing supplier payments)
  async getTransactions(id: string, from?: string, to?: string) {
    const acc = await this.findOne(id);
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + 'T23:59:59.999Z');

    const [payments, supplierPayments, expenses] = await Promise.all([
      this.prisma.payment.findMany({
        where: {
          bankAccountId: id,
          ...(from || to ? { createdAt: dateFilter } : {}),
        },
        include: {
          customer: { select: { id: true, storeName: true, contactName: true } },
        },
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.supplierPayment.findMany({
        where: {
          bankAccountId: id,
          ...(from || to ? { date: dateFilter } : {}),
        },
        include: {
          supplier: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
      this.prisma.expense.findMany({
        where: {
          bankAccountId: id,
          ...(from || to ? { date: dateFilter } : {}),
        },
        include: {
          category: { select: { id: true, name: true } },
        },
        orderBy: { date: 'desc' },
      }),
    ]);

    // Харилцагчийн төлбөр хоёр чиглэлтэй: RECEIPT = орлого, PAYOUT = зарлага.
    const inflowTotal = payments
      .filter((p) => p.type !== 'PAYOUT')
      .reduce((s, p) => s + Number(p.amount), 0);
    const customerPayout = payments
      .filter((p) => p.type === 'PAYOUT')
      .reduce((s, p) => s + Number(p.amount), 0);
    const supplierOutflow = supplierPayments.reduce((s, p) => s + Number(p.amount), 0);
    const expenseOutflow = expenses.reduce((s, e) => s + Number(e.amount), 0);
    const outflowTotal = supplierOutflow + expenseOutflow + customerPayout;

    return {
      account: acc,
      payments,
      supplierPayments,
      expenses,
      summary: {
        inflowTotal,
        outflowTotal,
        supplierOutflow,
        expenseOutflow,
        customerPayout,
        net: inflowTotal - outflowTotal,
      },
    };
  }

  /**
   * Дансны тайлан — бараа материалын тайлантай ижил бүтэц:
   * эхний үлдэгдэл, орлого, зарлага, эцсийн үлдэгдэл.
   *
   * Үлдэгдлийг `current_balance`-аас биш, гүйлгээнээс нь тооцоолно —
   * `current_balance` нь зөвхөн ӨНӨӨДРИЙН байдлыг илэрхийлдэг тул
   * сонгосон хугацааны эцсийн үлдэгдэл болж чадахгүй.
   *
   * Тооцооллын томьёо нь үлдэгдлийг хөтөлдөг логиктой (payments/expenses/
   * supplier-payments service) яг ижил: орлого нь RECEIPT төлбөр, зарлага нь
   * PAYOUT төлбөр + нийлүүлэгчийн төлбөр + зардал.
   */
  async getAllAccountsReport(from?: string, to?: string, accountId?: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { isActive: true, ...(accountId ? { id: accountId } : {}) },
      orderBy: { bankName: 'asc' },
    });

    const start = from ? new Date(from) : null;
    const end = to ? new Date(to + 'T23:59:59.999') : null;
    const inRange: any = {};
    if (start) inRange.gte = start;
    if (end) inRange.lte = end;
    const hasRange = start !== null || end !== null;

    const report = await Promise.all(
      accounts.map(async (acc) => {
        // --- Эхний үлдэгдэл: нээлтийн үлдэгдэл + хугацаанаас өмнөх бүх хөдөлгөөн ---
        let opening = Number(acc.openingBalance);
        if (start) {
          const before = { lt: start };
          const [pBefore, spBefore, eBefore, trOutBefore, trInBefore] = await Promise.all([
            this.prisma.payment.groupBy({
              by: ['type'],
              where: { bankAccountId: acc.id, createdAt: before },
              _sum: { amount: true },
            }),
            this.prisma.supplierPayment.aggregate({
              where: { bankAccountId: acc.id, date: before },
              _sum: { amount: true },
            }),
            this.prisma.expense.aggregate({
              where: { bankAccountId: acc.id, date: before },
              _sum: { amount: true },
            }),
            this.prisma.bankTransfer.aggregate({
              where: { fromAccountId: acc.id, date: before },
              _sum: { amount: true },
            }),
            this.prisma.bankTransfer.aggregate({
              where: { toAccountId: acc.id, date: before },
              _sum: { amount: true },
            }),
          ]);
          for (const g of pBefore) {
            const sum = Number(g._sum.amount ?? 0);
            opening += g.type === 'PAYOUT' ? -sum : sum;
          }
          opening -= Number(spBefore._sum.amount ?? 0);
          opening -= Number(eBefore._sum.amount ?? 0);
          opening -= Number(trOutBefore._sum.amount ?? 0);
          opening += Number(trInBefore._sum.amount ?? 0);
        }

        // --- Хугацааны доторх гүйлгээнүүд ---
        const [payments, supplierPayments, expenses, transfers] = await Promise.all([
          this.prisma.payment.findMany({
            where: { bankAccountId: acc.id, ...(hasRange ? { createdAt: inRange } : {}) },
            include: { customer: { select: { storeName: true, contactName: true } } },
          }),
          this.prisma.supplierPayment.findMany({
            where: { bankAccountId: acc.id, ...(hasRange ? { date: inRange } : {}) },
            include: { supplier: { select: { name: true } } },
          }),
          this.prisma.expense.findMany({
            where: { bankAccountId: acc.id, ...(hasRange ? { date: inRange } : {}) },
            include: { category: { select: { name: true } } },
          }),
          this.prisma.bankTransfer.findMany({
            where: {
              ...(hasRange ? { date: inRange } : {}),
              OR: [{ fromAccountId: acc.id }, { toAccountId: acc.id }],
            },
            include: {
              fromAccount: { select: { bankName: true, accountNumber: true } },
              toAccount: { select: { bankName: true, accountNumber: true } },
            },
          }),
        ]);

        type Tx = {
          id: string;
          date: Date;
          kind: 'PAYMENT' | 'PAYOUT' | 'SUPPLIER' | 'EXPENSE' | 'TRANSFER_IN' | 'TRANSFER_OUT';
          description: string;
          inflow: number;
          outflow: number;
          running: number;
        };

        const txs: Tx[] = [];

        for (const p of payments) {
          const who = p.customer?.storeName || p.customer?.contactName || 'Харилцагч';
          const amount = Number(p.amount);
          const isPayout = p.type === 'PAYOUT';
          txs.push({
            id: p.id,
            date: p.createdAt,
            kind: isPayout ? 'PAYOUT' : 'PAYMENT',
            description: [isPayout ? `Харилцагчид олгосон - ${who}` : `Харилцагчийн төлбөр - ${who}`, p.notes]
              .filter(Boolean)
              .join(' · '),
            // Сөрөг дүнтэй төлбөр (буцаалт) эсрэг талдаа бичигдэнэ.
            inflow: isPayout ? Math.max(0, -amount) : Math.max(0, amount),
            outflow: isPayout ? Math.max(0, amount) : Math.max(0, -amount),
            running: 0,
          });
        }

        for (const sp of supplierPayments) {
          const amount = Number(sp.amount);
          txs.push({
            id: sp.id,
            date: sp.date,
            kind: 'SUPPLIER',
            description: [`Нийлүүлэгчид төлсөн - ${sp.supplier?.name ?? '-'}`, sp.description]
              .filter(Boolean)
              .join(' · '),
            inflow: Math.max(0, -amount),
            outflow: Math.max(0, amount),
            running: 0,
          });
        }

        for (const e of expenses) {
          const amount = Number(e.amount);
          txs.push({
            id: e.id,
            date: e.date,
            kind: 'EXPENSE',
            description: [`Зардал - ${e.category?.name ?? '-'}`, e.description].filter(Boolean).join(' · '),
            inflow: Math.max(0, -amount),
            outflow: Math.max(0, amount),
            running: 0,
          });
        }

        // Шилжүүлэг нь энэ дансны хувьд орлого эсвэл зарлага аль нэг нь болно.
        for (const t of transfers) {
          const amount = Number(t.amount);
          const isOut = t.fromAccountId === acc.id;
          const other = isOut ? t.toAccount : t.fromAccount;
          const otherLabel = `${other.bankName} ${other.accountNumber}`;
          txs.push({
            id: t.id,
            date: t.date,
            kind: isOut ? 'TRANSFER_OUT' : 'TRANSFER_IN',
            description: [
              isOut ? `Шилжүүлэг → ${otherLabel}` : `Шилжүүлэг ← ${otherLabel}`,
              t.description,
            ]
              .filter(Boolean)
              .join(' · '),
            inflow: isOut ? 0 : amount,
            outflow: isOut ? amount : 0,
            running: 0,
          });
        }

        txs.sort((a, b) => a.date.getTime() - b.date.getTime());

        let running = opening;
        for (const t of txs) {
          running += t.inflow - t.outflow;
          t.running = running;
        }

        const inflowAmount = txs.reduce((s, t) => s + t.inflow, 0);
        const outflowAmount = txs.reduce((s, t) => s + t.outflow, 0);

        return {
          account: acc,
          openingBalance: opening,
          inflow: { count: txs.filter((t) => t.inflow > 0).length, amount: inflowAmount },
          outflow: { count: txs.filter((t) => t.outflow > 0).length, amount: outflowAmount },
          closingBalance: opening + inflowAmount - outflowAmount,
          net: inflowAmount - outflowAmount,
          transactions: txs,
        };
      }),
    );

    const totals = {
      opening: report.reduce((s, r) => s + r.openingBalance, 0),
      inflow: report.reduce((s, r) => s + r.inflow.amount, 0),
      outflow: report.reduce((s, r) => s + r.outflow.amount, 0),
      closing: report.reduce((s, r) => s + r.closingBalance, 0),
    };

    return {
      from: from ?? null,
      to: to ?? null,
      accounts: report,
      totals,
    };
  }

  // ==================== ДАНС ХООРОНДЫН ШИЛЖҮҮЛЭГ ====================

  /**
   * Данс хооронд мөнгө шилжүүлэх.
   *
   * Хоёр дансны үлдэгдлийг нэг гүйлгээнд зэрэг хөдөлгөнө — эс бөгөөс
   * дундуур нь тасарвал мөнгө алга болно.
   */
  async createTransfer(dto: CreateBankTransferDto, userId: string) {
    if (dto.fromAccountId === dto.toAccountId) {
      throw new BadRequestException('Нэг данс руугаа шилжүүлэх боломжгүй.');
    }

    const amount = Number(dto.amount);
    const date = dto.date ? new Date(dto.date) : new Date();
    if (Number.isNaN(date.getTime())) {
      throw new BadRequestException('Огноо буруу байна.');
    }

    const [from, to] = await Promise.all([
      this.prisma.bankAccount.findUnique({ where: { id: dto.fromAccountId } }),
      this.prisma.bankAccount.findUnique({ where: { id: dto.toAccountId } }),
    ]);
    if (!from) throw new NotFoundException('Гаргах данс олдсонгүй.');
    if (!to) throw new NotFoundException('Хүлээн авах данс олдсонгүй.');

    return this.prisma.$transaction(async (tx) => {
      const transfer = await tx.bankTransfer.create({
        data: {
          fromAccountId: dto.fromAccountId,
          toAccountId: dto.toAccountId,
          amount,
          description: dto.description ?? null,
          date,
          createdById: userId,
        },
        include: {
          fromAccount: { select: { id: true, bankName: true, accountNumber: true } },
          toAccount: { select: { id: true, bankName: true, accountNumber: true } },
        },
      });

      await tx.bankAccount.update({
        where: { id: dto.fromAccountId },
        data: { currentBalance: { decrement: amount } },
      });
      await tx.bankAccount.update({
        where: { id: dto.toAccountId },
        data: { currentBalance: { increment: amount } },
      });

      return transfer;
    });
  }

  async findTransfers(from?: string, to?: string, accountId?: string) {
    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + 'T23:59:59.999');

    return this.prisma.bankTransfer.findMany({
      where: {
        ...(from || to ? { date: dateFilter } : {}),
        ...(accountId
          ? { OR: [{ fromAccountId: accountId }, { toAccountId: accountId }] }
          : {}),
      },
      include: {
        fromAccount: { select: { id: true, bankName: true, accountNumber: true } },
        toAccount: { select: { id: true, bankName: true, accountNumber: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
    });
  }

  /** Шилжүүлэг устгах — хоёр дансны үлдэгдлийг буцаана. */
  async removeTransfer(id: string) {
    const transfer = await this.prisma.bankTransfer.findUnique({ where: { id } });
    if (!transfer) throw new NotFoundException('Шилжүүлэг олдсонгүй.');

    const amount = Number(transfer.amount);
    return this.prisma.$transaction(async (tx) => {
      await tx.bankAccount.update({
        where: { id: transfer.fromAccountId },
        data: { currentBalance: { increment: amount } },
      });
      await tx.bankAccount.update({
        where: { id: transfer.toAccountId },
        data: { currentBalance: { decrement: amount } },
      });
      await tx.bankTransfer.delete({ where: { id } });
      return { message: 'Шилжүүлэг устгагдлаа.' };
    });
  }
}
