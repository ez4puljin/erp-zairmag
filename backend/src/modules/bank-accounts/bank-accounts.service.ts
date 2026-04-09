import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateBankAccountDto } from './dto/create-bank-account.dto';
import { UpdateBankAccountDto } from './dto/update-bank-account.dto';

@Injectable()
export class BankAccountsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateBankAccountDto) {
    const opening = dto.openingBalance ?? 0;
    return this.prisma.bankAccount.create({
      data: {
        bankName: dto.bankName,
        accountNumber: dto.accountNumber,
        holderName: dto.holderName,
        currency: dto.currency ?? 'MNT',
        openingBalance: opening,
        currentBalance: opening,
        notes: dto.notes ?? null,
        isActive: dto.isActive ?? true,
      },
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

    return this.prisma.bankAccount.update({ where: { id }, data });
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

    const [payments, supplierPayments] = await Promise.all([
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
    ]);

    const inflowTotal = payments.reduce((s, p) => s + Number(p.amount), 0);
    const outflowTotal = supplierPayments.reduce((s, p) => s + Number(p.amount), 0);

    return {
      account: acc,
      payments,
      supplierPayments,
      summary: {
        inflowTotal,
        outflowTotal,
        net: inflowTotal - outflowTotal,
      },
    };
  }

  // Report: all accounts with income/expense in date range
  async getAllAccountsReport(from?: string, to?: string) {
    const accounts = await this.prisma.bankAccount.findMany({
      where: { isActive: true },
      orderBy: { bankName: 'asc' },
    });

    const dateFilter: any = {};
    if (from) dateFilter.gte = new Date(from);
    if (to) dateFilter.lte = new Date(to + 'T23:59:59.999Z');

    const report = await Promise.all(
      accounts.map(async (acc) => {
        const [inflow, outflow] = await Promise.all([
          this.prisma.payment.aggregate({
            where: {
              bankAccountId: acc.id,
              ...(from || to ? { createdAt: dateFilter } : {}),
            },
            _sum: { amount: true },
            _count: true,
          }),
          this.prisma.supplierPayment.aggregate({
            where: {
              bankAccountId: acc.id,
              ...(from || to ? { date: dateFilter } : {}),
            },
            _sum: { amount: true },
            _count: true,
          }),
        ]);

        const inflowAmount = Number(inflow._sum.amount ?? 0);
        const outflowAmount = Number(outflow._sum.amount ?? 0);

        return {
          account: acc,
          inflow: { count: inflow._count, amount: inflowAmount },
          outflow: { count: outflow._count, amount: outflowAmount },
          net: inflowAmount - outflowAmount,
        };
      }),
    );

    const grandTotal = {
      inflow: report.reduce((s, r) => s + r.inflow.amount, 0),
      outflow: report.reduce((s, r) => s + r.outflow.amount, 0),
      net: report.reduce((s, r) => s + r.net, 0),
    };

    return { accounts: report, grandTotal };
  }
}
