import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { QueryPaymentDto } from './dto/query-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  /**
   * Чиглэлийн тэмдэг.
   *  RECEIPT: данс +, өр −   (мөнгө орж ирнэ)
   *  PAYOUT : данс −, өр +   (мөнгө гарна)
   */
  private static sign(type?: string): 1 | -1 {
    return type === 'PAYOUT' ? -1 : 1;
  }

  private static ledgerText(type: string | undefined, method: string, ref?: string) {
    const base =
      type === 'PAYOUT'
        ? `Харилцагчид олгосон мөнгө (${method})`
        : `Payment received via ${method}`;
    return ref ? `${base} (Ref: ${ref})` : base;
  }

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

      const sign = PaymentsService.sign(dto.type);
      const at = dto.paidAt ? new Date(dto.paidAt) : new Date();
      if (Number.isNaN(at.getTime())) {
        throw new BadRequestException('Огноо буруу байна.');
      }

      // Create the payment record
      const payment = await tx.payment.create({
        data: {
          customerId: dto.customerId,
          amount: dto.amount,
          type: dto.type ?? 'RECEIPT',
          method: dto.method,
          status: 'COMPLETED',
          externalRef: dto.reference,
          notes: dto.note,
          orderId: dto.orderId,
          bankAccountId: dto.bankAccountId,
          paidAt: at,
          createdAt: at,
        },
      });

      // Дансны хөдөлгөөн: авсан бол нэмэгдэнэ, олгосон бол хасагдана.
      if (dto.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: dto.bankAccountId },
          data: { currentBalance: { increment: sign * dto.amount } },
        });
      }

      // Өр: авсан бол буурна, олгосон бол нэмэгдэнэ.
      const newBalance = currentDebt - sign * dto.amount;

      await tx.customer.update({
        where: { id: dto.customerId },
        data: {
          outstandingDebt: newBalance,
        },
      });

      // Дэвтэр: сөрөг = өр буурсан, эерэг = өр нэмэгдсэн.
      await tx.customerLedgerEntry.create({
        data: {
          customerId: dto.customerId,
          amount: -sign * dto.amount,
          balanceAfter: newBalance,
          description: PaymentsService.ledgerText(dto.type, dto.method, dto.reference),
          paymentId: payment.id,
          createdAt: at,
        },
      });

      return payment;
    });
  }

  async findAll(query: QueryPaymentDto): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, order = 'desc', customerId, status, method,
            type, dateFrom, dateTo, bankAccountId } = query;
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

    if (type) {
      where.type = type as any;
    }

    if (bankAccountId) {
      // "none" = данс сонгоогүй төлбөрүүд
      where.bankAccountId = bankAccountId === 'none' ? null : bankAccountId;
    }

    if (dateFrom || dateTo) {
      where.createdAt = {};
      if (dateFrom) where.createdAt.gte = new Date(dateFrom);
      // Өдрийн төгсгөл хүртэл — эс бөгөөс тухайн өдрийн гүйлгээ унана.
      if (dateTo) where.createdAt.lte = new Date(`${dateTo}T23:59:59.999`);
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
          bankAccount: {
            select: { id: true, bankName: true, accountNumber: true },
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

  /**
   * Төлбөр засах. Хуучин нөлөөг бүрэн буцаагаад шинийг тавина:
   * харилцагчийн өр, дансны үлдэгдэл, дэвтрийн бичилт гурвуулаа шинэчлэгдэнэ.
   */
  async update(id: string, dto: UpdatePaymentDto) {
    const existing = await this.prisma.payment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Төлбөр олдсонгүй.');

    const oldAmount = Number(existing.amount);
    const newAmount = dto.amount !== undefined ? Number(dto.amount) : oldAmount;
    const oldAccountId = existing.bankAccountId;
    const newAccountId =
      dto.bankAccountId !== undefined ? dto.bankAccountId : oldAccountId;
    const newMethod = dto.method ?? existing.method;
    const newType = dto.type ?? existing.type;
    const oldSign = PaymentsService.sign(existing.type);
    const newSign = PaymentsService.sign(newType);
    const at = dto.paidAt ? new Date(dto.paidAt) : undefined;
    if (at && Number.isNaN(at.getTime())) {
      throw new BadRequestException('Огноо буруу байна.');
    }

    if (newAccountId) {
      const acc = await this.prisma.bankAccount.findUnique({ where: { id: newAccountId } });
      if (!acc) throw new NotFoundException('Данс олдсонгүй.');
    }

    return this.prisma.$transaction(async (tx) => {
      // 1. Дансны үлдэгдэл: хуучин нөлөөг буцаагаад шинийг тавина.
      if (oldAccountId) {
        await tx.bankAccount.update({
          where: { id: oldAccountId },
          data: { currentBalance: { increment: -oldSign * oldAmount } },
        });
      }
      if (newAccountId) {
        await tx.bankAccount.update({
          where: { id: newAccountId },
          data: { currentBalance: { increment: newSign * newAmount } },
        });
      }

      // 2. Харилцагчийн өр: хуучныг буцаагаад шинийг тавина.
      const customer = await tx.customer.findUniqueOrThrow({
        where: { id: existing.customerId },
        select: { outstandingDebt: true },
      });
      const newDebt =
        Number(customer.outstandingDebt) + oldSign * oldAmount - newSign * newAmount;
      await tx.customer.update({
        where: { id: existing.customerId },
        data: { outstandingDebt: newDebt },
      });

      const payment = await tx.payment.update({
        where: { id },
        data: {
          amount: newAmount,
          type: newType,
          method: newMethod,
          externalRef: dto.reference,
          notes: dto.note,
          bankAccountId: newAccountId,
          ...(at ? { paidAt: at, createdAt: at } : {}),
        },
        include: {
          customer: { select: { id: true, storeName: true, contactName: true } },
          bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
        },
      });

      // 3. Дэвтрийн бичилтийг мөн засна (нэг төлбөрт нэг бичилт).
      await tx.customerLedgerEntry.updateMany({
        where: { paymentId: id },
        data: {
          amount: -newSign * newAmount,
          balanceAfter: newDebt,
          description: PaymentsService.ledgerText(newType, newMethod, dto.reference),
          ...(at ? { createdAt: at } : {}),
        },
      });

      return payment;
    });
  }

  /** Төлбөр устгах — өр, дансны үлдэгдэл, дэвтрийн бичилтийг бүрэн буцаана. */
  async remove(id: string) {
    const existing = await this.prisma.payment.findUnique({ where: { id } });
    if (!existing) throw new NotFoundException('Төлбөр олдсонгүй.');

    const amount = Number(existing.amount);
    const sign = PaymentsService.sign(existing.type);

    return this.prisma.$transaction(async (tx) => {
      if (existing.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: existing.bankAccountId },
          data: { currentBalance: { increment: -sign * amount } },
        });
      }

      const customer = await tx.customer.findUniqueOrThrow({
        where: { id: existing.customerId },
        select: { outstandingDebt: true },
      });
      await tx.customer.update({
        where: { id: existing.customerId },
        data: { outstandingDebt: Number(customer.outstandingDebt) + sign * amount },
      });

      // Дэвтрийн бичилт нь төлбөр рүү FK-тай тул эхлээд устгана.
      await tx.customerLedgerEntry.deleteMany({ where: { paymentId: id } });
      await tx.payment.delete({ where: { id } });

      return { message: 'Төлбөр устгагдлаа.' };
    });
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

    return this.findAll({ ...pagination, customerId });
  }
}
