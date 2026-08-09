import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';

@Injectable()
export class PurchaseReceiptsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreatePurchaseReceiptDto, userId: string) {
    // Calculate line totals and grand total
    const items = dto.items.map((item) => ({
      productId: item.productId,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      lineTotal: item.quantity * item.unitPrice,
    }));
    const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);

    return this.prisma.$transaction(async (tx) => {
      // Create receipt
      const receipt = await tx.purchaseReceipt.create({
        data: {
          supplierId: dto.supplierId,
          totalAmount,
          notes: dto.notes,
          receivedAt: dto.receivedAt ? new Date(dto.receivedAt) : new Date(),
          createdById: userId,
          items: {
            create: items,
          },
        },
        include: {
          items: { include: { product: true } },
          supplier: true,
          createdBy: { select: { firstName: true, lastName: true } },
        },
      });

      // Update stock for each product
      for (const item of items) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stockAvailable: { increment: item.quantity },
            version: { increment: 1 },
          },
        });

        // Create stock movement audit
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            reason: 'PURCHASE_RECEIPT',
            notes: `Орлого #${receipt.receiptNumber} - ${receipt.supplier?.name ?? ''}`,
            createdById: userId,
          },
        });
      }

      return receipt;
    });
  }

  async findAll(pagination: PaginationDto, filters?: { supplierId?: string; dateFrom?: string; dateTo?: string }) {
    const { page = 1, limit = 20 } = pagination;
    const skip = (page - 1) * limit;

    const where: any = {};
    if (filters?.supplierId) where.supplierId = filters.supplierId;
    if (filters?.dateFrom || filters?.dateTo) {
      where.receivedAt = {};
      if (filters.dateFrom) where.receivedAt.gte = new Date(filters.dateFrom);
      if (filters.dateTo) where.receivedAt.lte = new Date(filters.dateTo + 'T23:59:59');
    }

    const [data, total] = await Promise.all([
      this.prisma.purchaseReceipt.findMany({
        where,
        skip,
        take: limit,
        orderBy: { receivedAt: 'desc' },
        include: {
          supplier: { select: { id: true, name: true } },
          items: { include: { product: { select: { id: true, name: true, barcodes: { select: { code: true } }, unit: true, unitsPerBox: true, weightGrams: true } } } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
      }),
      this.prisma.purchaseReceipt.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOne(id: string) {
    const receipt = await this.prisma.purchaseReceipt.findUnique({
      where: { id },
      include: {
        supplier: true,
        items: { include: { product: true } },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!receipt) throw new NotFoundException('Purchase receipt not found');
    return receipt;
  }
}
