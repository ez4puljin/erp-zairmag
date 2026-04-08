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
exports.PurchaseReceiptsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PurchaseReceiptsService = class PurchaseReceiptsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(dto, userId) {
        const items = dto.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineTotal: item.quantity * item.unitPrice,
        }));
        const totalAmount = items.reduce((sum, item) => sum + item.lineTotal, 0);
        return this.prisma.$transaction(async (tx) => {
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
            for (const item of items) {
                await tx.product.update({
                    where: { id: item.productId },
                    data: {
                        stockAvailable: { increment: item.quantity },
                        version: { increment: 1 },
                    },
                });
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
    async findAll(pagination, filters) {
        const { page = 1, limit = 20 } = pagination;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.supplierId)
            where.supplierId = filters.supplierId;
        if (filters?.dateFrom || filters?.dateTo) {
            where.receivedAt = {};
            if (filters.dateFrom)
                where.receivedAt.gte = new Date(filters.dateFrom);
            if (filters.dateTo)
                where.receivedAt.lte = new Date(filters.dateTo + 'T23:59:59');
        }
        const [data, total] = await Promise.all([
            this.prisma.purchaseReceipt.findMany({
                where,
                skip,
                take: limit,
                orderBy: { receivedAt: 'desc' },
                include: {
                    supplier: { select: { id: true, name: true } },
                    items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
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
    async findOne(id) {
        const receipt = await this.prisma.purchaseReceipt.findUnique({
            where: { id },
            include: {
                supplier: true,
                items: { include: { product: true } },
                createdBy: { select: { firstName: true, lastName: true } },
            },
        });
        if (!receipt)
            throw new common_1.NotFoundException('Purchase receipt not found');
        return receipt;
    }
};
exports.PurchaseReceiptsService = PurchaseReceiptsService;
exports.PurchaseReceiptsService = PurchaseReceiptsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PurchaseReceiptsService);
//# sourceMappingURL=purchase-receipts.service.js.map