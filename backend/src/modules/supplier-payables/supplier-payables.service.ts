import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';

@Injectable()
export class SupplierPayablesService {
  constructor(private prisma: PrismaService) {}

  async createPayment(dto: CreateSupplierPaymentDto, userId: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: dto.supplierId, deletedAt: null },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    return this.prisma.supplierPayment.create({
      data: {
        supplierId: dto.supplierId,
        type: dto.type ?? 'PAYMENT',
        amount: dto.amount,
        method: dto.method,
        description: dto.description,
        referenceNo: dto.referenceNo,
        date: new Date(dto.date),
        createdById: userId,
      },
      include: { supplier: { select: { name: true } } },
    });
  }

  async getPayments(supplierId?: string) {
    return this.prisma.supplierPayment.findMany({
      where: supplierId ? { supplierId } : undefined,
      include: {
        supplier: { select: { name: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
      orderBy: { date: 'desc' },
    });
  }

  async getSupplierLedger(supplierId: string, startDate: string, endDate: string) {
    const supplier = await this.prisma.supplier.findFirst({
      where: { id: supplierId, deletedAt: null },
    });
    if (!supplier) throw new NotFoundException('Supplier not found');

    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // --- Opening balance calculation ---
    // Base opening balance from supplier record
    let openingCredit = Number(supplier.openingBalance);
    let openingDebit = 0;

    // Add purchase receipts BEFORE start date (credit: we owe more)
    const priorPurchases = await this.prisma.purchaseReceipt.aggregate({
      where: { supplierId, receivedAt: { lt: start } },
      _sum: { totalAmount: true },
    });
    openingCredit += Number(priorPurchases._sum.totalAmount ?? 0);

    // Add payments BEFORE start date (debit: we paid)
    const priorPayments = await this.prisma.supplierPayment.aggregate({
      where: { supplierId, date: { lt: start } },
      _sum: { amount: true },
    });
    openingDebit += Number(priorPayments._sum.amount ?? 0);

    // Net opening: if credit > debit, we still owe (credit side)
    const netOpening = openingCredit - openingDebit;
    const openingBalanceDebit = netOpening < 0 ? Math.abs(netOpening) : 0;
    const openingBalanceCredit = netOpening > 0 ? netOpening : 0;

    // --- Transactions in date range ---
    const [purchases, payments] = await Promise.all([
      this.prisma.purchaseReceipt.findMany({
        where: { supplierId, receivedAt: { gte: start, lte: end } },
        include: { items: { include: { product: { select: { name: true, unit: true } } } } },
        orderBy: { receivedAt: 'asc' },
      }),
      this.prisma.supplierPayment.findMany({
        where: { supplierId, date: { gte: start, lte: end } },
        orderBy: { date: 'asc' },
      }),
    ]);

    // Build combined entries sorted by date
    const entries: Array<{
      date: string;
      referenceNo: string;
      description: string;
      type: string;
      debit: number;
      credit: number;
      runningBalance: number;
    }> = [];

    let runningBalance = netOpening;

    // Merge and sort by date
    const allTxns: Array<{ date: Date; kind: 'purchase' | 'payment'; data: any }> = [
      ...purchases.map(p => ({ date: new Date(p.receivedAt), kind: 'purchase' as const, data: p })),
      ...payments.map(p => ({ date: new Date(p.date), kind: 'payment' as const, data: p })),
    ];
    allTxns.sort((a, b) => a.date.getTime() - b.date.getTime());

    for (const txn of allTxns) {
      if (txn.kind === 'purchase') {
        const p = txn.data;
        const amount = Number(p.totalAmount);
        runningBalance += amount;
        const itemsSummary = p.items?.map((i: any) => i.product?.name).join(', ') || '';
        const detail = p.notes && p.notes.trim() ? p.notes.trim() : itemsSummary;
        entries.push({
          date: txn.date.toISOString(),
          referenceNo: `#${p.receiptNumber}`,
          description: `Орлого${detail ? ' - ' + detail : ''}`,
          type: 'PURCHASE',
          debit: 0,
          credit: amount,
          runningBalance,
        });
      } else {
        const p = txn.data;
        const amount = Number(p.amount);
        runningBalance -= amount;
        const typeLabels: Record<string, string> = {
          PAYMENT: 'Төлбөр',
          RETURN: 'Буцаалт',
          ADJUSTMENT: 'Тохируулга',
        };
        const methodLabels: Record<string, string> = {
          CASH: 'Бэлэн',
          BANK_TRANSFER: 'Банк',
          MOBILE_MONEY: 'Мобайл',
          CHECK: 'Чек',
        };
        const label = typeLabels[p.type] || p.type;
        const methodLabel = p.method ? ` (${methodLabels[p.method] || p.method})` : '';
        entries.push({
          date: txn.date.toISOString(),
          referenceNo: p.referenceNo || '',
          description: `${label}${methodLabel}${p.description ? ' - ' + p.description : ''}`,
          type: p.type,
          debit: amount,
          credit: 0,
          runningBalance,
        });
      }
    }

    // Totals
    const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
    const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
    const closingNet = netOpening + totalCredit - totalDebit;
    const closingDebit = closingNet < 0 ? Math.abs(closingNet) : 0;
    const closingCredit = closingNet > 0 ? closingNet : 0;

    return {
      supplier: { id: supplier.id, name: supplier.name, phone: supplier.phone },
      period: { startDate, endDate },
      openingBalance: { debit: openingBalanceDebit, credit: openingBalanceCredit },
      entries,
      totals: { debit: totalDebit, credit: totalCredit },
      closingBalance: { debit: closingDebit, credit: closingCredit },
    };
  }

  async getPayablesSummary(startDate: string, endDate: string, supplierId?: string) {
    const supplierWhere: any = { deletedAt: null };
    if (supplierId) supplierWhere.id = supplierId;

    const suppliers = await this.prisma.supplier.findMany({
      where: supplierWhere,
      orderBy: { name: 'asc' },
    });

    const supplierIds = suppliers.map((s) => s.id);
    const start = new Date(startDate);
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);

    // Batch all 4 aggregate queries in parallel, each grouped by supplierId
    const [priorPurchasesAgg, priorPaymentsAgg, periodPurchasesAgg, periodPaymentsAgg] = await Promise.all([
      this.prisma.purchaseReceipt.groupBy({
        by: ['supplierId'],
        where: { supplierId: { in: supplierIds }, receivedAt: { lt: start } },
        _sum: { totalAmount: true },
      }),
      this.prisma.supplierPayment.groupBy({
        by: ['supplierId'],
        where: { supplierId: { in: supplierIds }, date: { lt: start } },
        _sum: { amount: true },
      }),
      this.prisma.purchaseReceipt.groupBy({
        by: ['supplierId'],
        where: { supplierId: { in: supplierIds }, receivedAt: { gte: start, lte: end } },
        _sum: { totalAmount: true },
      }),
      this.prisma.supplierPayment.groupBy({
        by: ['supplierId'],
        where: { supplierId: { in: supplierIds }, date: { gte: start, lte: end } },
        _sum: { amount: true },
      }),
    ]);

    // Build lookup maps
    const priorPurchasesMap = new Map<string, number>();
    for (const row of priorPurchasesAgg) {
      priorPurchasesMap.set(row.supplierId, Number(row._sum.totalAmount ?? 0));
    }
    const priorPaymentsMap = new Map<string, number>();
    for (const row of priorPaymentsAgg) {
      priorPaymentsMap.set(row.supplierId, Number(row._sum.amount ?? 0));
    }
    const periodPurchasesMap = new Map<string, number>();
    for (const row of periodPurchasesAgg) {
      periodPurchasesMap.set(row.supplierId, Number(row._sum.totalAmount ?? 0));
    }
    const periodPaymentsMap = new Map<string, number>();
    for (const row of periodPaymentsAgg) {
      periodPaymentsMap.set(row.supplierId, Number(row._sum.amount ?? 0));
    }

    // Map results in memory
    const results = suppliers.map((sup) => {
      const openingCredit = Number(sup.openingBalance) + (priorPurchasesMap.get(sup.id) ?? 0);
      const openingDebit = priorPaymentsMap.get(sup.id) ?? 0;
      const netOpening = openingCredit - openingDebit;

      const txnCredit = periodPurchasesMap.get(sup.id) ?? 0;
      const txnDebit = periodPaymentsMap.get(sup.id) ?? 0;
      const closingNet = netOpening + txnCredit - txnDebit;

      return {
        id: sup.id,
        name: sup.name,
        openingBalance: netOpening,
        totalCredit: txnCredit,
        totalDebit: txnDebit,
        closingBalance: closingNet,
      };
    });

    return results.filter(r => r.openingBalance !== 0 || r.totalCredit !== 0 || r.totalDebit !== 0 || r.closingBalance !== 0);
  }
}
