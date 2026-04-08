import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RestockDto, AdjustStockDto } from './dto/restock.dto';
import { StockMovementReason } from '@prisma/client';

@Injectable()
export class InventoryService {
  constructor(private prisma: PrismaService) {}

  async getOverview() {
    const products = await this.prisma.product.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        name: true,
        sku: true,
        unit: true,
        stockAvailable: true,
        stockReserved: true,
        reorderLevel: true,
        costPrice: true,
        sellingPrice: true,
        category: { select: { name: true } },
      },
      orderBy: { name: 'asc' },
    });

    return products.map((p) => ({
      ...p,
      totalStock: p.stockAvailable + p.stockReserved,
      isLowStock: p.stockAvailable <= p.reorderLevel,
    }));
  }

  async restock(dto: RestockDto, userId: string) {
    return this.prisma.$transaction(async (tx) => {
      const movements: any[] = [];

      for (const item of dto.items) {
        const product = await tx.product.findUnique({
          where: { id: item.productId },
        });

        if (!product) {
          throw new NotFoundException(`Product ${item.productId} not found`);
        }

        // Update stock with optimistic lock
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            version: product.version,
          },
          data: {
            stockAvailable: { increment: item.quantity },
            costPrice: item.costPerUnit ?? product.costPrice,
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new ConflictException(
            `Product "${product.name}" was modified concurrently. Please retry.`,
          );
        }

        // Create stock movement
        const movement = await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: item.quantity,
            reason: StockMovementReason.PURCHASE_RECEIPT,
            notes: dto.note
              ? `${dto.supplier ? `Supplier: ${dto.supplier}. ` : ''}${dto.note}`
              : dto.supplier
                ? `Supplier: ${dto.supplier}`
                : null,
            createdById: userId,
          },
        });

        movements.push(movement);
      }

      return { movements, itemCount: dto.items.length };
    });
  }

  async adjustStock(dto: AdjustStockDto, userId: string) {
    const product = await this.prisma.product.findUnique({
      where: { id: dto.productId },
    });

    if (!product) {
      throw new NotFoundException('Product not found');
    }

    if (dto.adjustment < 0 && product.stockAvailable + dto.adjustment < 0) {
      throw new BadRequestException(
        `Cannot adjust below zero. Available: ${product.stockAvailable}`,
      );
    }

    const reason =
      dto.adjustment > 0
        ? StockMovementReason.ADJUSTMENT_GAIN
        : StockMovementReason.ADJUSTMENT_LOSS;

    return this.prisma.$transaction(async (tx) => {
      const result = await tx.product.updateMany({
        where: {
          id: dto.productId,
          version: product.version,
          ...(dto.adjustment < 0 ? { stockAvailable: { gte: Math.abs(dto.adjustment) } } : {}),
        },
        data: {
          stockAvailable: { increment: dto.adjustment },
          version: { increment: 1 },
        },
      });

      if (result.count === 0) {
        throw new ConflictException(
          `Product "${product.name}" was modified concurrently or insufficient stock. Please retry.`,
        );
      }

      return tx.stockMovement.create({
        data: {
          productId: dto.productId,
          quantity: dto.adjustment,
          reason,
          notes: dto.reason,
          createdById: userId,
        },
      });
    });
  }

  async getMovements(query: {
    productId?: string;
    reason?: StockMovementReason;
    page?: number;
    limit?: number;
  }) {
    const page = query.page || 1;
    const limit = query.limit || 20;
    const where: any = {};

    if (query.productId) where.productId = query.productId;
    if (query.reason) where.reason = query.reason;

    const [data, total] = await Promise.all([
      this.prisma.stockMovement.findMany({
        where,
        include: {
          product: { select: { name: true, sku: true } },
          createdBy: { select: { firstName: true, lastName: true } },
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.stockMovement.count({ where }),
    ]);

    return {
      data,
      meta: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  async getLowStock(threshold?: number) {
    const products = await this.prisma.product.findMany({
      where: {
        isActive: true,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        sku: true,
        stockAvailable: true,
        stockReserved: true,
        reorderLevel: true,
      },
    });

    return products.filter(
      (p) => p.stockAvailable <= (threshold ?? p.reorderLevel),
    );
  }
}
