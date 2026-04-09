import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async recordPayment(dto: CreatePaymentDto, recordedById: string) {
    if (dto.amount <= 0) {
      throw new BadRequestException('Payment amount must be positive.');
    }

    return this.prisma.$transaction(async (tx) => {
      // Lock customer row by reading inside transaction
      const customer = await tx.customer.findUnique({
        where: { id: dto.customerId },
      });

      if (!customer) {
        throw new NotFoundException(`Customer with ID ${dto.customerId} not found`);
      }

      const currentDebt = Number(customer.outstandingDebt);
      // Allow overpayment (advance payment) - negative balance means credit

      // Validate bank account if provided
      if (dto.bankAccountId) {
        const acc = await tx.bankAccount.findUnique({ where: { id: dto.bankAccountId } });
        if (!acc) throw new NotFoundException('Bank account not found');
        if (!acc.isActive) throw new NotFoundException('Bank account is inactive');
      }

      // Create the payment record
      const payment = await tx.payment.create({
        data: {
          customerId: dto.customerId,
          amount: dto.amount,
          method: dto.method,
          status: 'COMPLETED',
          externalRef: dto.reference,
          notes: dto.note,
          orderId: dto.orderId,
          bankAccountId: dto.bankAccountId,
          paidAt: new Date(),
        },
      });

      // Update bank account balance (inflow)
      if (dto.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: dto.bankAccountId },
          data: { currentBalance: { increment: dto.amount } },
        });
      }

      // Compute new balance from DB-fresh value
      const newBalance = currentDebt - dto.amount;

      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          outstandingDebt: newBalance,
        },
      });

      // Create ledger entry (negative amount = payment received)
      await tx.customerLedgerEntry.create({
        data: {
          customerId: dto.customerId,
          amount: -dto.amount,
          balanceAfter: newBalance,
          description: `Payment received via ${dto.method}${dto.reference ? ` (Ref: ${dto.reference})` : ''}`,
          paymentId: payment.id,
        },
      });

      return payment;
    });
  }

  async findAll(
    pagination: PaginationDto,
    customerId?: string,
    status?: string,
    method?: string,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, order = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.PaymentWhereInput = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (status) {
      where.status = status as any;
    }

    if (method) {
      where.method = method as any;
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: order },
        include: {
          customer: {
            select: { id: true, storeName: true, contactName: true },
          },
        },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findByCustomer(
    customerId: string,
    pagination: PaginationDto,
  ): Promise<PaginatedResponse<any>> {
    // Verify customer exists
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId, deletedAt: null },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    return this.findAll(pagination, customerId);
  }
}
