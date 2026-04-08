"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.InventoryCountsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let InventoryCountsService = class InventoryCountsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, userId) {
        const products = await this.prisma.product.findMany({
            where: { deletedAt: null, isActive: true },
            select: { id: true, name: true, sku: true, stockAvailable: true, unit: true },
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
                    include: { product: { select: { id: true, name: true, sku: true, unit: true, sellingPrice: true } } },
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
    async findOne(id) {
        const count = await this.prisma.inventoryCount.findUnique({
            where: { id },
            include: {
                items: {
                    include: { product: { select: { id: true, name: true, sku: true, unit: true, stockAvailable: true, sellingPrice: true } } },
                    orderBy: { product: { name: 'asc' } },
                },
                createdBy: { select: { firstName: true, lastName: true } },
            },
        });
        if (!count)
            throw new common_1.NotFoundException('Inventory count not found');
        return count;
    }
    async updateItems(id, items) {
        const count = await this.prisma.inventoryCount.findUnique({ where: { id } });
        if (!count)
            throw new common_1.NotFoundException('Inventory count not found');
        if (count.status !== 'DRAFT')
            throw new common_1.BadRequestException('Can only update DRAFT counts');
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
    async finalize(id, userId) {
        const preCheck = await this.prisma.inventoryCount.findUnique({ where: { id } });
        if (!preCheck)
            throw new common_1.NotFoundException('Inventory count not found');
        if (preCheck.status !== 'DRAFT')
            throw new common_1.BadRequestException('Can only finalize DRAFT counts');
        await this.prisma.$transaction(async (tx) => {
            const count = await tx.inventoryCount.findUniqueOrThrow({
                where: { id },
                include: { items: { include: { product: true } } },
            });
            if (count.status !== 'DRAFT') {
                throw new common_1.BadRequestException('Can only finalize DRAFT counts');
            }
            const uncounted = count.items.filter(i => i.countedQty === null);
            if (uncounted.length > 0) {
                throw new common_1.BadRequestException(`${uncounted.length} бараа тоологдоогүй байна`);
            }
            for (const item of count.items) {
                if (item.difference === 0)
                    continue;
                const reason = item.difference > 0 ? 'ADJUSTMENT_GAIN' : 'ADJUSTMENT_LOSS';
                const adjustedAvailable = Math.max(0, item.countedQty - item.product.stockReserved);
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
                    throw new common_1.ConflictException(`Product "${item.product.name}" (${item.productId}) was modified concurrently. ` +
                        `Please re-create the inventory count to get fresh stock values.`);
                }
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
            await tx.inventoryCount.update({
                where: { id },
                data: { status: 'FINALIZED', finalizedAt: new Date() },
            });
        });
        return this.findOne(id);
    }
    async getReport(id) {
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
};
exports.InventoryCountsService = InventoryCountsService;
exports.InventoryCountsService = InventoryCountsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryCountsService);
//# sourceMappingURL=inventory-counts.service.js.map