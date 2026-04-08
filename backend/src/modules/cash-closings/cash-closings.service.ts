import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateCashClosingDto } from './dto/create-cash-closing.dto';

@Injectable()
export class CashClosingsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateCashClosingDto, userId: string) {
    // Check if closing already exists for this date
    const existing = await this.prisma.cashClosing.findUnique({
      where: { closingDate: new Date(dto.closingDate) },
    });
    if (existing) {
      throw new BadRequestException(`${dto.closingDate} өдрийн мөнгөн хаалт аль хэдийн хийгдсэн байна`);
    }

    return this.prisma.cashClosing.create({
      data: {
        closingDate: new Date(dto.closingDate),
        openingBalance: dto.openingBalance,
        totalCashIn: dto.totalCashIn,
        totalCashOut: dto.totalCashOut,
        totalBankIn: dto.totalBankIn,
        closingBalance: dto.closingBalance,
        notes: dto.notes,
        closedById: userId,
      },
      include: {
        closedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findAll(dateFrom?: string, dateTo?: string) {
    const where: any = {};
    if (dateFrom || dateTo) {
      where.closingDate = {};
      if (dateFrom) where.closingDate.gte = new Date(dateFrom);
      if (dateTo) where.closingDate.lte = new Date(dateTo);
    }

    return this.prisma.cashClosing.findMany({
      where,
      orderBy: { closingDate: 'desc' },
      include: {
        closedBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async getLatest() {
    return this.prisma.cashClosing.findFirst({
      orderBy: { closingDate: 'desc' },
    });
  }

  async getDailySummary(date: string) {
    const dayStart = new Date(date);
    const dayEnd = new Date(date + 'T23:59:59');

    // Get all payments for this date
    const payments = await this.prisma.payment.findMany({
      where: {
        paidAt: { gte: dayStart, lte: dayEnd },
        status: 'COMPLETED',
      },
      include: {
        customer: { select: { storeName: true } },
      },
    });

    const cashPayments = payments.filter((p) => p.method === 'CASH');
    const bankPayments = payments.filter((p) => p.method === 'BANK_TRANSFER');

    // Get purchase receipts for this date (cash out)
    const purchases = await this.prisma.purchaseReceipt.findMany({
      where: {
        receivedAt: { gte: dayStart, lte: dayEnd },
      },
      include: { supplier: { select: { name: true } } },
    });

    // Get previous closing balance as opening
    const previousClosing = await this.prisma.cashClosing.findFirst({
      where: { closingDate: { lt: dayStart } },
      orderBy: { closingDate: 'desc' },
    });

    const openingBalance = previousClosing ? Number(previousClosing.closingBalance) : 0;
    const totalCashIn = cashPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalBankIn = bankPayments.reduce((s, p) => s + Number(p.amount), 0);
    const totalCashOut = purchases.reduce((s, p) => s + Number(p.totalAmount), 0);

    return {
      date,
      openingBalance,
      totalCashIn,
      totalBankIn,
      totalCashOut,
      suggestedClosingBalance: openingBalance + totalCashIn - totalCashOut,
      cashPayments: cashPayments.map((p) => ({
        id: p.id,
        customer: p.customer.storeName,
        amount: Number(p.amount),
        ref: p.externalRef,
      })),
      bankPayments: bankPayments.map((p) => ({
        id: p.id,
        customer: p.customer.storeName,
        amount: Number(p.amount),
        ref: p.externalRef,
      })),
      purchases: purchases.map((p) => ({
        id: p.id,
        supplier: p.supplier.name,
        amount: Number(p.totalAmount),
      })),
    };
  }
}
