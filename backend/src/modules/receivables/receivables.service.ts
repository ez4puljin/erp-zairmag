import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ReceivablesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Get customer ledger with debit/credit columns
   * Debit = customer owes more (orders delivered)
   * Credit = customer paid (payments received)
   */
  async getCustomerLedger(
    customerId: string,
    dateFrom?: string,
    dateTo?: string,
  ) {
    const customer = await this.prisma.customer.findUnique({
      where: { id: customerId },
      select: { id: true, storeName: true, contactName: true, phone: true, outstandingDebt: true, creditLimit: true },
    });

    const where: any = { customerId };
    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      if (dateTo) where.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const entries = await this.prisma.customerLedgerEntry.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      include: {
        payment: { select: { method: true, externalRef: true } },
      },
    });

    // Calculate opening balance (sum of all entries BEFORE dateFrom)
    let openingBalance = 0;
    if (dateFrom) {
      const priorEntries = await this.prisma.customerLedgerEntry.findMany({
        where: { customerId, createdAt: { lt: new Date(dateFrom) } },
        select: { amount: true },
      });
      openingBalance = priorEntries.reduce((sum, e) => sum + Number(e.amount), 0);
    }

    // Map entries to debit/credit format
    let runningBalance = openingBalance;
    const ledgerRows = entries.map((entry) => {
      const amount = Number(entry.amount);
      const debit = amount > 0 ? amount : 0;   // Customer owes more
      const credit = amount < 0 ? Math.abs(amount) : 0; // Customer paid
      runningBalance += amount;

      return {
        id: entry.id,
        date: entry.createdAt,
        description: entry.description,
        debit,
        credit,
        balance: runningBalance,
        paymentMethod: entry.payment?.method ?? null,
        paymentRef: entry.payment?.externalRef ?? null,
      };
    });

    return {
      customer,
      openingBalance,
      closingBalance: runningBalance,
      totalDebit: ledgerRows.reduce((s, r) => s + r.debit, 0),
      totalCredit: ledgerRows.reduce((s, r) => s + r.credit, 0),
      entries: ledgerRows,
    };
  }

  /**
   * Get all customers receivable summary
   */
  async getReceivablesSummary(dateFrom?: string, dateTo?: string, customerId?: string, categoryId?: string) {
    const customerWhere: any = { deletedAt: null };
    if (customerId) customerWhere.id = customerId;
    if (categoryId) customerWhere.customerCategoryId = categoryId;

    const customers = await this.prisma.customer.findMany({
      where: customerWhere,
      select: {
        id: true,
        storeName: true,
        contactName: true,
        phone: true,
        outstandingDebt: true,
        creditLimit: true,
        customerCategory: { select: { name: true } },
      },
      orderBy: { outstandingDebt: 'desc' },
    });

    const customerIds = customers.map((c) => c.id);

    // Batch query: opening balances (sum of all entries before dateFrom) grouped by customerId
    const priorByCustomer = new Map<string, number>();
    if (dateFrom) {
      const priorAgg = await this.prisma.customerLedgerEntry.groupBy({
        by: ['customerId'],
        where: { customerId: { in: customerIds }, createdAt: { lt: new Date(dateFrom) } },
        _sum: { amount: true },
      });
      for (const row of priorAgg) {
        priorByCustomer.set(row.customerId, Number(row._sum.amount ?? 0));
      }
    }

    // Batch query: period debits (amount > 0) grouped by customerId
    const periodDateWhere: any = { customerId: { in: customerIds } };
    if (dateFrom || dateTo) {
      periodDateWhere.createdAt = {};
      if (dateFrom) periodDateWhere.createdAt.gte = new Date(dateFrom);
      if (dateTo) periodDateWhere.createdAt.lte = new Date(dateTo + 'T23:59:59');
    }

    const [debitAgg, creditAgg] = await Promise.all([
      this.prisma.customerLedgerEntry.groupBy({
        by: ['customerId'],
        where: { ...periodDateWhere, amount: { gt: 0 } },
        _sum: { amount: true },
      }),
      this.prisma.customerLedgerEntry.groupBy({
        by: ['customerId'],
        where: { ...periodDateWhere, amount: { lt: 0 } },
        _sum: { amount: true },
      }),
    ]);

    const debitByCustomer = new Map<string, number>();
    for (const row of debitAgg) {
      debitByCustomer.set(row.customerId, Number(row._sum.amount ?? 0));
    }
    const creditByCustomer = new Map<string, number>();
    for (const row of creditAgg) {
      creditByCustomer.set(row.customerId, Math.abs(Number(row._sum.amount ?? 0)));
    }

    // Map results in memory
    const summaries = customers.map((c) => {
      const openingBalance = priorByCustomer.get(c.id) ?? 0;
      const totalDebit = debitByCustomer.get(c.id) ?? 0;
      const totalCredit = creditByCustomer.get(c.id) ?? 0;
      const closingBalance = openingBalance + totalDebit - totalCredit;

      return {
        id: c.id,
        storeName: c.storeName,
        contactName: c.contactName,
        phone: c.phone,
        outstandingDebt: Number(c.outstandingDebt),
        creditLimit: Number(c.creditLimit),
        openingBalance,
        periodDebit: totalDebit,
        periodCredit: totalCredit,
        closingBalance,
        category: c.customerCategory?.name ?? null,
      };
    });

    return summaries.filter((c) => c.openingBalance !== 0 || c.periodDebit > 0 || c.periodCredit > 0 || c.outstandingDebt > 0);
  }

  async getDebtAging() {
    // Get all customers with outstanding debt > 0
    const customers = await this.prisma.customer.findMany({
      where: { outstandingDebt: { gt: 0 }, deletedAt: null },
      select: { id: true, storeName: true, phone: true, outstandingDebt: true, creditLimit: true },
    });

    const now = new Date();
    const results: any[] = [];

    for (const customer of customers) {
      // Get all unpaid debit entries (positive amounts = customer owes)
      const debitEntries = await this.prisma.customerLedgerEntry.findMany({
        where: { customerId: customer.id, amount: { gt: 0 } },
        orderBy: { createdAt: 'asc' },
      });

      // Get total credits (payments)
      const creditResult = await this.prisma.customerLedgerEntry.aggregate({
        where: { customerId: customer.id, amount: { lt: 0 } },
        _sum: { amount: true },
      });
      let remainingCredit = Math.abs(Number(creditResult._sum.amount ?? 0));

      // FIFO: oldest debits get paid first
      let current = 0, days31_60 = 0, days61_90 = 0, over90 = 0;

      for (const entry of debitEntries) {
        let unpaid = Number(entry.amount);
        if (remainingCredit >= unpaid) {
          remainingCredit -= unpaid;
          continue; // fully paid
        }
        if (remainingCredit > 0) {
          unpaid -= remainingCredit;
          remainingCredit = 0;
        }

        const daysDiff = Math.floor((now.getTime() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24));
        if (daysDiff <= 30) current += unpaid;
        else if (daysDiff <= 60) days31_60 += unpaid;
        else if (daysDiff <= 90) days61_90 += unpaid;
        else over90 += unpaid;
      }

      results.push({
        customerId: customer.id,
        storeName: customer.storeName,
        phone: customer.phone,
        creditLimit: Number(customer.creditLimit),
        current: Math.round(current),
        days31_60: Math.round(days31_60),
        days61_90: Math.round(days61_90),
        over90: Math.round(over90),
        total: Math.round(current + days31_60 + days61_90 + over90),
      });
    }

    return results.sort((a, b) => b.total - a.total);
  }
}
