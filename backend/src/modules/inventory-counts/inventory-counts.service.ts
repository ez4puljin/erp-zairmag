import { Injectable, NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryCountDto, CountItemDto } from './dto/create-inventory-count.dto';

@Injectable()
export class InventoryCountsService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateInventoryCountDto, userId: string) {
    // Get all active products with current stock
    const products = await this.prisma.product.findMany({
      where: { deletedAt: null, isActive: true },
      select: { id: true, name: true, barcodes: { select: { code: true } }, stockAvailable: true, unit: true },
      orderBy: { name: 'asc' },
    });

    return this.prisma.inventoryCount.create({
      data: {
        countDate: new Date(dto.countDate),
        notes: dto.notes,
        createdById: userId,
        items: {
          create: products.map(p => ({
            productId: p.id,
            systemQty: p.stockAvailable,
            countedQty: null,
            difference: 0,
          })),
        },
      },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, barcodes: { select: { code: true } }, unit: true, sellingPrice: true } } },
          orderBy: { product: { name: 'asc' } },
        },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
  }

  async findAll() {
    return this.prisma.inventoryCount.findMany({
      include: {
        createdBy: { select: { firstName: true, lastName: true } },
        _count: { select: { items: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const count = await this.prisma.inventoryCount.findUnique({
      where: { id },
      include: {
        items: {
          include: { product: { select: { id: true, name: true, barcodes: { select: { code: true } }, unit: true, stockAvailable: true, sellingPrice: true } } },
          orderBy: { product: { name: 'asc' } },
        },
        createdBy: { select: { firstName: true, lastName: true } },
      },
    });
    if (!count) throw new NotFoundException('Inventory count not found');
    return count;
  }

  async updateItems(id: string, items: CountItemDto[]) {
    const count = await this.prisma.inventoryCount.findUnique({ where: { id } });
    if (!count) throw new NotFoundException('Inventory count not found');
    if (count.status !== 'DRAFT') throw new BadRequestException('Can only update DRAFT counts');

    // Update each item inside a transaction for atomicity
    await this.prisma.$transaction(async (tx) => {
      for (const item of items) {
        const existing = await tx.inventoryCountItem.findFirst({
          where: { inventoryCountId: id, productId: item.productId },
        });
        if (existing) {
          const diff = item.countedQty - existing.systemQty;
          await tx.inventoryCountItem.update({
            where: { id: existing.id },
            data: { countedQty: item.countedQty, difference: diff },
          });
        }
      }
    });

    return this.findOne(id);
  }

  async finalize(id: string, userId: string) {
    // Pre-check outside transaction for fast-fail
    const preCheck = await this.prisma.inventoryCount.findUnique({ where: { id } });
    if (!preCheck) throw new NotFoundException('Inventory count not found');
    if (preCheck.status !== 'DRAFT') throw new BadRequestException('Can only finalize DRAFT counts');

    // Apply adjustments in transaction with re-fetched data
    await this.prisma.$transaction(async (tx) => {
      // Re-fetch the count AND items inside the transaction to prevent race conditions
      const count = await tx.inventoryCount.findUniqueOrThrow({
        where: { id },
        include: { items: { include: { product: true } } },
      });

      if (count.status !== 'DRAFT') {
        throw new BadRequestException('Can only finalize DRAFT counts');
      }

      // Check all items have been counted
      const uncounted = count.items.filter(i => i.countedQty === null);
      if (uncounted.length > 0) {
        throw new BadRequestException(`${uncounted.length} бараа тоологдоогүй байна`);
      }

      for (const item of count.items) {
        if (item.difference === 0) continue;

        const reason = item.difference > 0 ? 'ADJUSTMENT_GAIN' : 'ADJUSTMENT_LOSS';

        // The physical count represents total stock on hand (available + reserved).
        // Since stockReserved units are already committed to orders, we must subtract
        // them so that stockAvailable + stockReserved = countedQty (physical total).
        // Clamp to 0 in case reserved exceeds the counted quantity.
        const adjustedAvailable = Math.max(0, item.countedQty! - item.product.stockReserved);

        // Update product stock with optimistic locking via version check
        const result = await tx.product.updateMany({
          where: {
            id: item.productId,
            version: item.product.version,
          },
          data: {
            stockAvailable: adjustedAvailable,
            version: { increment: 1 },
          },
        });

        if (result.count === 0) {
          throw new ConflictException(
            `Product "${item.product.name}" (${item.productId}) was modified concurrently. ` +
            `Please re-create the inventory count to get fresh stock values.`,
          );
        }

        // Create stock movement audit trail
        await tx.stockMovement.create({
          data: {
            productId: item.productId,
            quantity: Math.abs(item.difference),
            reason,
            notes: `Тооллого #${count.countNumber} - ${item.difference > 0 ? 'Илүүдэл' : 'Дутагдал'}`,
            createdById: userId,
          },
        });
      }

      // Mark count as finalized
      await tx.inventoryCount.update({
        where: { id },
        data: { status: 'FINALIZED', finalizedAt: new Date() },
      });
    });

    return this.findOne(id);
  }

  async getReport(id: string) {
    const count = await this.findOne(id);

    const totalItems = count.items.length;
    const countedItems = count.items.filter(i => i.countedQty !== null).length;
    const discrepancies = count.items.filter(i => i.difference !== 0);
    const gains = discrepancies.filter(i => i.difference > 0);
    const losses = discrepancies.filter(i => i.difference < 0);

    const totalGainAmount = gains.reduce((s, i) => {
      const price = Number(i.product?.sellingPrice || 0);
      return s + i.difference * price;
    }, 0);
    const totalLossAmount = losses.reduce((s, i) => {
      const price = Number(i.product?.sellingPrice || 0);
      return s + Math.abs(i.difference) * price;
    }, 0);

    return {
      ...count,
      summary: {
        totalItems,
        countedItems,
        discrepancyCount: discrepancies.length,
        gainCount: gains.length,
        lossCount: losses.length,
        totalGain: gains.reduce((s, i) => s + i.difference, 0),
        totalLoss: losses.reduce((s, i) => s + i.difference, 0),
        totalGainAmount,
        totalLossAmount,
        totalDiscrepancyAmount: totalGainAmount - totalLossAmount,
      },
    };
  }
}
