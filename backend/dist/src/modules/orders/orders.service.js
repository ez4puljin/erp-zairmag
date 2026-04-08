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
exports.OrdersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const prisma_service_1 = require("../../prisma/prisma.service");
let OrdersService = class OrdersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createOrder(dto, userId, customerId) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, isActive: true, creditLimit: true, outstandingDebt: true, deletedAt: true, pricingTier: true },
        });
        if (!customer || customer.deletedAt) {
            throw new common_1.NotFoundException('Customer not found.');
        }
        if (!customer.isActive) {
            throw new common_1.BadRequestException('Customer account is deactivated.');
        }
        const productIds = dto.items.map((i) => i.productId);
        const products = await this.prisma.product.findMany({
            where: { id: { in: productIds }, isActive: true, deletedAt: null },
        });
        if (products.length !== productIds.length) {
            const found = new Set(products.map((p) => p.id));
            const missing = productIds.filter((id) => !found.has(id));
            throw new common_1.NotFoundException(`Products not found or inactive: ${missing.join(', ')}`);
        }
        const productMap = new Map(products.map((p) => [p.id, p]));
        for (const item of dto.items) {
            const product = productMap.get(item.productId);
            if (item.quantity > product.stockAvailable) {
                throw new common_1.BadRequestException(`Бараа "${product.name}" нөөц хүрэлцэхгүй. Боломжит: ${product.stockAvailable}`);
            }
        }
        const customerPrices = await this.prisma.customerPrice.findMany({
            where: { customerId, productId: { in: productIds } },
        });
        const customerPriceMap = new Map(customerPrices.map((cp) => [cp.productId, cp.price]));
        const tierPrices = await this.prisma.tierPrice.findMany({
            where: { productId: { in: productIds }, tier: customer.pricingTier },
        });
        const tierPriceMap = new Map(tierPrices.map((tp) => [tp.productId, tp.price]));
        const itemsData = dto.items.map((item) => {
            const product = productMap.get(item.productId);
            const unitPrice = customerPriceMap.get(item.productId) ??
                tierPriceMap.get(item.productId) ??
                product.sellingPrice;
            const lineTotal = new client_1.Prisma.Decimal(unitPrice.toString()).mul(item.quantity);
            return {
                productId: item.productId,
                quantity: item.quantity,
                unitPrice,
                lineTotal,
                productVersion: product.version,
            };
        });
        const subtotal = itemsData.reduce((sum, i) => sum.add(i.lineTotal), new client_1.Prisma.Decimal(0));
        const taxAmount = new client_1.Prisma.Decimal(0);
        const totalAmount = subtotal.add(taxAmount);
        return this.prisma.$transaction(async (tx) => {
            const freshCustomer = await tx.customer.findUniqueOrThrow({
                where: { id: customerId },
                select: { creditLimit: true, outstandingDebt: true },
            });
            const creditLimit = Number(freshCustomer.creditLimit);
            if (creditLimit > 0) {
                const currentDebt = Number(freshCustomer.outstandingDebt);
                const projectedDebt = currentDebt + Number(totalAmount);
                if (projectedDebt > creditLimit) {
                    throw new common_1.BadRequestException(`Зээлийн хязгаар хэтэрнэ. Одоогийн өр: ₮${currentDebt.toLocaleString()}, ` +
                        `Захиалгын дүн: ₮${Number(totalAmount).toLocaleString()}, ` +
                        `Зээлийн хязгаар: ₮${creditLimit.toLocaleString()}.`);
                }
            }
            return tx.order.create({
                data: {
                    customerId,
                    createdById: userId,
                    status: client_1.OrderStatus.PENDING,
                    subtotal,
                    taxAmount,
                    totalAmount,
                    notes: dto.notes,
                    paymentMethod: dto.paymentMethod,
                    items: {
                        create: itemsData,
                    },
                },
                include: {
                    items: { include: { product: true } },
                    customer: true,
                },
            });
        });
    }
    async approveOrder(orderId, approverUserId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status !== client_1.OrderStatus.PENDING) {
            throw new common_1.BadRequestException(`Cannot approve order with status ${order.status}. Order must be PENDING.`);
        }
        return this.prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                const result = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        version: item.productVersion,
                        stockAvailable: { gte: item.quantity },
                    },
                    data: {
                        stockAvailable: { decrement: item.quantity },
                        stockReserved: { increment: item.quantity },
                        version: { increment: 1 },
                    },
                });
                if (result.count === 0) {
                    const product = await tx.product.findUnique({
                        where: { id: item.productId },
                        select: { name: true, stockAvailable: true, version: true },
                    });
                    throw new common_1.ConflictException(`Stock reservation failed for product "${product?.name ?? item.productId}". ` +
                        `Either insufficient stock (available: ${product?.stockAvailable ?? 'unknown'}, ` +
                        `requested: ${item.quantity}) or the product was modified concurrently ` +
                        `(expected version ${item.productVersion}, current: ${product?.version ?? 'unknown'}).`);
                }
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        quantity: -item.quantity,
                        reason: client_1.StockMovementReason.RESERVATION,
                        orderId: order.id,
                        createdById: approverUserId,
                        notes: `Reserved ${item.quantity} units for order #${order.orderNumber}`,
                    },
                });
            }
            return tx.order.update({
                where: { id: orderId },
                data: {
                    status: client_1.OrderStatus.APPROVED,
                    approvedById: approverUserId,
                    approvedAt: new Date(),
                },
                include: {
                    items: { include: { product: true } },
                    customer: true,
                },
            });
        });
    }
    async updateToShipping(orderId, driverId, deliveryNotes) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status !== client_1.OrderStatus.APPROVED) {
            throw new common_1.BadRequestException(`Cannot ship order with status ${order.status}. Order must be APPROVED.`);
        }
        const driver = await this.prisma.user.findUnique({
            where: { id: driverId },
        });
        if (!driver || driver.role !== 'DRIVER') {
            throw new common_1.BadRequestException('Invalid driver. User must have DRIVER role.');
        }
        return this.prisma.$transaction(async (tx) => {
            const truckLoad = await tx.truckLoad.findFirst({
                where: { driverId, status: 'DISPATCHED' },
                include: { items: true },
            });
            if (!truckLoad) {
                throw new common_1.BadRequestException('Жолоочид идэвхтэй ачилт (DISPATCHED) байхгүй.');
            }
            const orderItems = await tx.orderItem.findMany({
                where: { orderId },
                include: { product: true },
            });
            for (const item of orderItems) {
                const result = await tx.product.updateMany({
                    where: {
                        id: item.productId,
                        stockReserved: { gte: item.quantity },
                    },
                    data: {
                        stockReserved: { decrement: item.quantity },
                        version: { increment: 1 },
                    },
                });
                if (result.count === 0) {
                    throw new common_1.ConflictException(`Failed to release reserved stock for product "${item.product.name}". Concurrent modification detected.`);
                }
                await tx.stockMovement.create({
                    data: {
                        productId: item.productId,
                        quantity: -item.quantity,
                        reason: client_1.StockMovementReason.TRANSFER_OUT,
                        orderId: order.id,
                        createdById: driverId,
                        notes: `Transferred ${item.quantity} units to truck for order #${order.orderNumber}`,
                    },
                });
                const existingTruckItem = truckLoad.items.find((ti) => ti.productId === item.productId);
                if (existingTruckItem) {
                    await tx.truckLoadItem.update({
                        where: { id: existingTruckItem.id },
                        data: { loadedQty: { increment: item.quantity } },
                    });
                }
                else {
                    await tx.truckLoadItem.create({
                        data: {
                            truckLoadId: truckLoad.id,
                            productId: item.productId,
                            loadedQty: item.quantity,
                        },
                    });
                }
            }
            await tx.deliveryRoute.create({
                data: {
                    driverId,
                    orderId,
                    scheduledDate: new Date(),
                    stopSequence: 1,
                    deliveryNotes,
                },
            });
            return tx.order.update({
                where: { id: orderId },
                data: {
                    status: client_1.OrderStatus.SHIPPING,
                },
                include: {
                    items: { include: { product: true } },
                    customer: true,
                    deliveryRoute: true,
                },
            });
        });
    }
    async deliverOrder(orderId, userId, paymentMethod) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true, customer: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status !== client_1.OrderStatus.SHIPPING) {
            throw new common_1.BadRequestException(`Cannot deliver order with status ${order.status}. Order must be SHIPPING.`);
        }
        return this.prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                await tx.orderItem.update({
                    where: { id: item.id },
                    data: { deliveredQty: item.quantity },
                });
            }
            const customer = await tx.customer.findUniqueOrThrow({
                where: { id: order.customerId },
                select: { outstandingDebt: true },
            });
            const newDebt = new client_1.Prisma.Decimal(customer.outstandingDebt.toString()).add(order.totalAmount);
            await tx.customer.update({
                where: { id: order.customerId },
                data: {
                    outstandingDebt: newDebt,
                },
            });
            await tx.customerLedgerEntry.create({
                data: {
                    customerId: order.customerId,
                    amount: order.totalAmount,
                    balanceAfter: newDebt,
                    description: `Order #${order.orderNumber} delivered`,
                },
            });
            return tx.order.update({
                where: { id: orderId },
                data: {
                    status: client_1.OrderStatus.DELIVERED,
                    deliveredAt: new Date(),
                    paymentMethod: paymentMethod ? paymentMethod : undefined,
                },
                include: {
                    items: { include: { product: true } },
                    customer: true,
                    deliveryRoute: true,
                },
            });
        });
    }
    async markReceiptPrinted(id) {
        const order = await this.prisma.order.findUnique({ where: { id } });
        if (!order)
            throw new common_1.NotFoundException('Захиалга олдсонгүй.');
        return this.prisma.order.update({
            where: { id },
            data: { receiptPrintedAt: new Date() },
            include: {
                items: { include: { product: true } },
                customer: true,
                deliveryRoute: { include: { driver: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
            },
        });
    }
    async cancelOrder(orderId, userId, cancellationNote) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status === client_1.OrderStatus.DELIVERED ||
            order.status === client_1.OrderStatus.CANCELLED) {
            throw new common_1.BadRequestException(`Cannot cancel order with status ${order.status}.`);
        }
        const needsStockRelease = order.status === client_1.OrderStatus.APPROVED ||
            order.status === client_1.OrderStatus.SHIPPING;
        return this.prisma.$transaction(async (tx) => {
            const freshOrder = await tx.order.findUniqueOrThrow({
                where: { id: orderId },
            });
            if (freshOrder.status === client_1.OrderStatus.DELIVERED ||
                freshOrder.status === client_1.OrderStatus.CANCELLED) {
                throw new common_1.BadRequestException(`Cannot cancel order with status ${freshOrder.status}.`);
            }
            const needsStockReleaseInTx = freshOrder.status === client_1.OrderStatus.APPROVED ||
                freshOrder.status === client_1.OrderStatus.SHIPPING;
            if (needsStockReleaseInTx) {
                for (const item of order.items) {
                    const result = await tx.product.updateMany({
                        where: {
                            id: item.productId,
                            stockReserved: { gte: item.quantity },
                        },
                        data: {
                            stockAvailable: { increment: item.quantity },
                            stockReserved: { decrement: item.quantity },
                            version: { increment: 1 },
                        },
                    });
                    if (result.count === 0) {
                        throw new common_1.ConflictException(`Failed to release stock for product ${item.productId}. Concurrent modification detected.`);
                    }
                    await tx.stockMovement.create({
                        data: {
                            productId: item.productId,
                            quantity: item.quantity,
                            reason: client_1.StockMovementReason.RESERVATION_RELEASE,
                            orderId: order.id,
                            createdById: userId,
                            notes: `Released reservation of ${item.quantity} units for cancelled order #${order.orderNumber}`,
                        },
                    });
                }
            }
            return tx.order.update({
                where: { id: orderId },
                data: {
                    status: client_1.OrderStatus.CANCELLED,
                    cancelledAt: new Date(),
                    cancellationNote,
                },
                include: {
                    items: { include: { product: true } },
                    customer: true,
                },
            });
        });
    }
    async requestCancellation(orderId, userId, note) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status === client_1.OrderStatus.DELIVERED ||
            order.status === client_1.OrderStatus.CANCELLED ||
            order.status === client_1.OrderStatus.CANCELLATION_REQUESTED) {
            throw new common_1.BadRequestException(`Cannot request cancellation for order with status ${order.status}.`);
        }
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: client_1.OrderStatus.CANCELLATION_REQUESTED,
                cancellationRequestedAt: new Date(),
                cancellationRequestNote: note || 'Харилцагчаас цуцлах хүсэлт ирсэн',
            },
            include: {
                items: { include: { product: true } },
                customer: true,
            },
        });
    }
    async approveCancellation(orderId, userId, note) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: true },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status !== client_1.OrderStatus.CANCELLATION_REQUESTED) {
            throw new common_1.BadRequestException('Only orders with CANCELLATION_REQUESTED status can be approved for cancellation.');
        }
        return this.cancelOrder(orderId, userId, note || 'Менежер цуцлах хүсэлтийг баталгаажуулсан');
    }
    async rejectCancellation(orderId, userId, note) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        if (order.status !== client_1.OrderStatus.CANCELLATION_REQUESTED) {
            throw new common_1.BadRequestException('Only orders with CANCELLATION_REQUESTED status can be rejected.');
        }
        let previousStatus = client_1.OrderStatus.PENDING;
        if (order.approvedAt) {
            const deliveryRoute = await this.prisma.deliveryRoute.findFirst({
                where: { orderId },
            });
            previousStatus = deliveryRoute ? client_1.OrderStatus.SHIPPING : client_1.OrderStatus.APPROVED;
        }
        return this.prisma.order.update({
            where: { id: orderId },
            data: {
                status: previousStatus,
                cancellationNote: note || 'Менежер цуцлах хүсэлтийг татгалзсан',
                cancellationRequestedAt: null,
                cancellationRequestNote: null,
            },
            include: {
                items: { include: { product: true } },
                customer: true,
            },
        });
    }
    async verifyDriverAssignment(orderId, driverUserId) {
        const route = await this.prisma.deliveryRoute.findFirst({
            where: { orderId, driverId: driverUserId },
        });
        if (!route) {
            throw new common_1.BadRequestException('This order is not assigned to you. Only the assigned driver can mark it as delivered.');
        }
    }
    async findAll(pagination, filters) {
        const { page = 1, limit = 20, order = 'desc' } = pagination;
        const skip = (page - 1) * limit;
        const where = {};
        if (filters?.statuses) {
            where.status = { in: filters.statuses.split(',') };
        }
        else if (filters?.status) {
            where.status = filters.status;
        }
        if (filters?.customerId) {
            where.customerId = filters.customerId;
        }
        if (filters?.dateFrom || filters?.dateTo) {
            where.createdAt = {};
            if (filters.dateFrom) {
                where.createdAt.gte = filters.dateFrom;
            }
            if (filters.dateTo) {
                where.createdAt.lte = filters.dateTo;
            }
        }
        if (filters?.receiptPrinted === 'true') {
            where.receiptPrintedAt = { not: null };
        }
        else if (filters?.receiptPrinted === 'false') {
            where.receiptPrintedAt = null;
        }
        const [data, total] = await this.prisma.$transaction([
            this.prisma.order.findMany({
                where,
                include: {
                    items: { include: { product: { select: { id: true, name: true, sku: true } } } },
                    customer: { select: { id: true, storeName: true, contactName: true } },
                    createdBy: { select: { id: true, firstName: true, lastName: true } },
                    deliveryRoute: { include: { driver: { select: { id: true, firstName: true, lastName: true, phone: true } } } },
                },
                orderBy: { createdAt: order },
                skip,
                take: limit,
            }),
            this.prisma.order.count({ where }),
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
    async findOne(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: {
                items: {
                    include: {
                        product: {
                            select: {
                                id: true,
                                name: true,
                                sku: true,
                                unit: true,
                                imageUrl: true,
                            },
                        },
                    },
                },
                customer: true,
                createdBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                approvedBy: {
                    select: { id: true, firstName: true, lastName: true, email: true },
                },
                deliveryRoute: {
                    include: {
                        driver: {
                            select: { id: true, firstName: true, lastName: true, phone: true },
                        },
                    },
                },
                stockMovements: {
                    orderBy: { createdAt: 'asc' },
                    select: {
                        id: true,
                        quantity: true,
                        reason: true,
                        createdAt: true,
                        notes: true,
                    },
                },
            },
        });
        if (!order) {
            throw new common_1.NotFoundException('Order not found');
        }
        return order;
    }
    async getStockWarnings(orderId) {
        const order = await this.prisma.order.findUnique({
            where: { id: orderId },
            include: { items: { include: { product: true } } },
        });
        if (!order)
            throw new common_1.NotFoundException('Order not found');
        const warnings = [];
        for (const item of order.items) {
            const aggregation = await this.prisma.orderItem.aggregate({
                where: {
                    productId: item.productId,
                    order: {
                        id: { not: orderId },
                        status: { in: ['PENDING', 'APPROVED'] },
                    },
                },
                _sum: { quantity: true },
            });
            const otherPendingQty = aggregation._sum.quantity || 0;
            const totalDemand = otherPendingQty + item.quantity;
            const available = Number(item.product.stockAvailable);
            if (totalDemand > available) {
                warnings.push({
                    productId: item.productId,
                    productName: item.product.name,
                    thisOrderQty: item.quantity,
                    otherPendingQty,
                    totalDemand,
                    available,
                    shortfall: totalDemand - available,
                });
            }
        }
        return warnings;
    }
};
exports.OrdersService = OrdersService;
exports.OrdersService = OrdersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], OrdersService);
//# sourceMappingURL=orders.service.js.map