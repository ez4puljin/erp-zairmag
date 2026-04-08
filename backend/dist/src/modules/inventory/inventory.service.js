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
exports.InventoryService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let InventoryService = class InventoryService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
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
    async restock(dto, userId) {
        return this.prisma.$transaction(async (tx) => {
            const movements = [];
            for (const item of dto.items) {
                const product = await tx.product.findUnique({
                    where: { id: item.productId },
                });
                if (!product) {
                    throw new common_1.NotFoundException(`Product ${item.productId} not found`);
                }
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
                    throw new common_1.ConflictException(`Product "${product.name}" was modified concurrently. Please retry.`);
                }
                const movement = await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        quantity: item.quantity,
                        reason: client_1.StockMovementReason.PURCHASE_RECEIPT,
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
    async adjustStock(dto, userId) {
        const product = await this.prisma.product.findUnique({
            where: { id: dto.productId },
        });
        if (!product) {
            throw new common_1.NotFoundException('Product not found');
        }
        if (dto.adjustment < 0 && product.stockAvailable + dto.adjustment < 0) {
            throw new common_1.BadRequestException(`Cannot adjust below zero. Available: ${product.stockAvailable}`);
        }
        const reason = dto.adjustment > 0
            ? client_1.StockMovementReason.ADJUSTMENT_GAIN
            : client_1.StockMovementReason.ADJUSTMENT_LOSS;
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
                throw new common_1.ConflictException(`Product "${product.name}" was modified concurrently or insufficient stock. Please retry.`);
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
    async getMovements(query) {
        const page = query.page || 1;
        const limit = query.limit || 20;
        const where = {};
        if (query.productId)
            where.productId = query.productId;
        if (query.reason)
            where.reason = query.reason;
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
    async getLowStock(threshold) {
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
        return products.filter((p) => p.stockAvailable <= (threshold ?? p.reorderLevel));
    }
};
exports.InventoryService = InventoryService;
exports.InventoryService = InventoryService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], InventoryService);
//# sourceMappingURL=inventory.service.js.map