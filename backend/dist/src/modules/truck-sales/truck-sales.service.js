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
exports.TruckSalesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let TruckSalesService = class TruckSalesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createSale(dto, userId) {
        const truckLoad = await this.prisma.truckLoad.findUnique({
            where: { id: dto.truckLoadId },
            include: { items: true },
        });
        if (!truckLoad)
            throw new common_1.NotFoundException('Ачилт олдсонгүй.');
        if (truckLoad.status !== 'DISPATCHED') {
            throw new common_1.BadRequestException('Ачилт идэвхтэй биш байна.');
        }
        const customer = await this.prisma.customer.findFirst({
            where: { id: dto.customerId, isActive: true, deletedAt: null },
            select: {
                id: true,
                storeName: true,
                contactName: true,
                phone: true,
                address: true,
                creditLimit: true,
                outstandingDebt: true,
            },
        });
        if (!customer)
            throw new common_1.NotFoundException('Харилцагч олдсонгүй.');
        for (const saleItem of dto.items) {
            const loadItem = truckLoad.items.find(i => i.productId === saleItem.productId);
            if (!loadItem) {
                throw new common_1.BadRequestException(`Бараа ${saleItem.productId} машинд байхгүй.`);
            }
            const availableOnTruck = loadItem.loadedQty - loadItem.soldQty - loadItem.returnedQty - loadItem.damagedQty;
            if (saleItem.quantity > availableOnTruck) {
                throw new common_1.BadRequestException(`"${saleItem.productId}" бараа хүрэлцэхгүй. Машинд: ${availableOnTruck}, Хүссэн: ${saleItem.quantity}`);
            }
        }
        for (const saleItem of dto.items) {
            const product = await this.prisma.product.findUnique({
                where: { id: saleItem.productId },
                select: { sellingPrice: true, name: true },
            });
            if (saleItem.unitPrice <= 0) {
                throw new common_1.BadRequestException(`Бараа "${product?.name}"-ын үнэ буруу: ${saleItem.unitPrice}`);
            }
        }
        const itemsData = dto.items.map(item => {
            const lineTotal = item.quantity * item.unitPrice;
            return { ...item, lineTotal };
        });
        const subtotal = itemsData.reduce((sum, i) => sum + i.lineTotal, 0);
        const totalAmount = subtotal;
        if (dto.paymentMethod === 'CREDIT' || dto.paymentMethod === 'COMBINED') {
            const creditLimit = Number(customer.creditLimit ?? 0);
            const currentDebt = Number(customer.outstandingDebt ?? 0);
            let creditAmount = totalAmount;
            if (dto.paymentMethod === 'COMBINED' && dto.combinedPayments) {
                creditAmount = dto.combinedPayments
                    .filter(p => p.method === 'CREDIT')
                    .reduce((s, p) => s + p.amount, 0);
            }
            if (creditLimit > 0 && (currentDebt + creditAmount) > creditLimit) {
                throw new common_1.BadRequestException(`Зээлийн хязгаар хэтэрсэн. Хязгаар: ₮${creditLimit.toLocaleString()}, Одоогийн өр: ₮${currentDebt.toLocaleString()}, Нэмэгдэх: ₮${creditAmount.toLocaleString()}`);
            }
        }
        if (dto.paymentMethod === 'COMBINED') {
            if (!dto.combinedPayments || dto.combinedPayments.length < 2) {
                throw new common_1.BadRequestException('Хосолсон төлбөрт 2-оос дээш төлбөрийн хэлбэр шаардлагатай.');
            }
            const combinedTotal = dto.combinedPayments.reduce((s, p) => s + p.amount, 0);
            if (Math.abs(combinedTotal - totalAmount) > 1) {
                throw new common_1.BadRequestException(`Хосолсон төлбөрийн нийт дүн (${combinedTotal}) нийт дүнтэй (${totalAmount}) тохирохгүй байна.`);
            }
        }
        let saleNotes = dto.notes || '';
        if (dto.paymentMethod === 'COMBINED' && dto.combinedPayments) {
            const detail = dto.combinedPayments.map(p => `${p.method}:${p.amount}`).join(',');
            saleNotes = saleNotes ? `${saleNotes} | COMBINED:${detail}` : `COMBINED:${detail}`;
        }
        return this.prisma.$transaction(async (tx) => {
            const sale = await tx.truckSale.create({
                data: {
                    truckLoadId: dto.truckLoadId,
                    customerId: dto.customerId,
                    paymentMethod: dto.paymentMethod,
                    subtotal,
                    totalAmount,
                    notes: saleNotes || null,
                    items: {
                        create: itemsData.map(item => ({
                            productId: item.productId,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            lineTotal: item.lineTotal,
                        })),
                    },
                },
                include: {
                    items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
                    customer: { select: { id: true, storeName: true, contactName: true, phone: true, address: true } },
                },
            });
            for (const saleItem of dto.items) {
                await tx.truckLoadItem.updateMany({
                    where: {
                        truckLoadId: dto.truckLoadId,
                        productId: saleItem.productId,
                    },
                    data: {
                        soldQty: { increment: saleItem.quantity },
                    },
                });
            }
            for (const saleItem of dto.items) {
                await tx.stockMovement.create({
                    data: {
                        productId: saleItem.productId,
                        quantity: -saleItem.quantity,
                        reason: client_1.StockMovementReason.SALE_DISPATCH,
                        createdById: userId,
                        locationCode: `TRUCK-${truckLoad.loadNumber}`,
                        notes: `Түгээлтийн борлуулалт #${sale.saleNumber} - ${customer.storeName}`,
                    },
                });
            }
            const freshCustomer = await tx.customer.findUniqueOrThrow({
                where: { id: dto.customerId },
                select: { outstandingDebt: true },
            });
            const currentDebt = Number(freshCustomer.outstandingDebt);
            if (dto.paymentMethod === 'CREDIT') {
                const newDebt = currentDebt + totalAmount;
                await tx.customer.update({
                    where: { id: dto.customerId },
                    data: { outstandingDebt: newDebt },
                });
                await tx.customerLedgerEntry.create({
                    data: {
                        customerId: dto.customerId,
                        amount: totalAmount,
                        balanceAfter: newDebt,
                        description: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
                    },
                });
            }
            else if (dto.paymentMethod === 'COMBINED' && dto.combinedPayments) {
                const creditPortion = dto.combinedPayments
                    .filter(p => p.method === 'CREDIT')
                    .reduce((s, p) => s + p.amount, 0);
                const paidPortion = totalAmount - creditPortion;
                const afterSaleDebt = currentDebt + totalAmount;
                await tx.customerLedgerEntry.create({
                    data: {
                        customerId: dto.customerId,
                        amount: totalAmount,
                        balanceAfter: afterSaleDebt,
                        description: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
                    },
                });
                if (paidPortion > 0) {
                    const payment = await tx.payment.create({
                        data: {
                            customerId: dto.customerId,
                            amount: paidPortion,
                            method: 'CASH',
                            status: 'COMPLETED',
                            paidAt: new Date(),
                            notes: `Түгээлтийн хосолсон төлбөр #${sale.saleNumber}`,
                        },
                    });
                    const afterPaymentDebt = afterSaleDebt - paidPortion;
                    await tx.customer.update({
                        where: { id: dto.customerId },
                        data: { outstandingDebt: afterPaymentDebt },
                    });
                    await tx.customerLedgerEntry.create({
                        data: {
                            customerId: dto.customerId,
                            amount: -paidPortion,
                            balanceAfter: afterPaymentDebt,
                            description: `Түгээлтийн төлбөр #${sale.saleNumber} (хосолсон)`,
                            paymentId: payment.id,
                        },
                    });
                }
                else {
                    await tx.customer.update({
                        where: { id: dto.customerId },
                        data: { outstandingDebt: afterSaleDebt },
                    });
                }
            }
            else {
                const payment = await tx.payment.create({
                    data: {
                        customerId: dto.customerId,
                        amount: totalAmount,
                        method: dto.paymentMethod,
                        status: 'COMPLETED',
                        paidAt: new Date(),
                        notes: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
                    },
                });
                const afterSaleDebt = currentDebt + totalAmount;
                await tx.customerLedgerEntry.create({
                    data: {
                        customerId: dto.customerId,
                        amount: totalAmount,
                        balanceAfter: afterSaleDebt,
                        description: `Түгээлтийн борлуулалт #${sale.saleNumber}`,
                    },
                });
                const afterPaymentDebt = afterSaleDebt - totalAmount;
                await tx.customer.update({
                    where: { id: dto.customerId },
                    data: { outstandingDebt: afterPaymentDebt },
                });
                await tx.customerLedgerEntry.create({
                    data: {
                        customerId: dto.customerId,
                        amount: -totalAmount,
                        balanceAfter: afterPaymentDebt,
                        description: `Түгээлтийн төлбөр #${sale.saleNumber} (${dto.paymentMethod})`,
                        paymentId: payment.id,
                    },
                });
            }
            return sale;
        });
    }
    async findOne(id) {
        const sale = await this.prisma.truckSale.findUnique({
            where: { id },
            include: {
                items: { include: { product: { select: { id: true, name: true, sku: true, unit: true } } } },
                customer: { select: { id: true, storeName: true, contactName: true, phone: true, address: true } },
                truckLoad: {
                    select: { loadNumber: true, driver: { select: { firstName: true, lastName: true, phone: true } } },
                },
            },
        });
        if (!sale)
            throw new common_1.NotFoundException('Борлуулалт олдсонгүй.');
        return sale;
    }
    async findByTruckLoad(truckLoadId) {
        return this.prisma.truckSale.findMany({
            where: { truckLoadId },
            include: {
                items: { include: { product: { select: { id: true, name: true, sku: true, unit: true, sellingPrice: true } } } },
                customer: { select: { id: true, storeName: true, contactName: true, phone: true, address: true } },
            },
            orderBy: { createdAt: 'desc' },
        });
    }
    async voidSale(id, userId) {
        const sale = await this.prisma.truckSale.findUnique({
            where: { id },
            include: {
                items: true,
                truckLoad: { include: { items: true } },
                customer: { select: { id: true, storeName: true, outstandingDebt: true } },
            },
        });
        if (!sale)
            throw new common_1.NotFoundException('Борлуулалт олдсонгүй.');
        if (sale.truckLoad.status !== 'DISPATCHED') {
            throw new common_1.BadRequestException('Зөвхөн DISPATCHED статустай ачилтын борлуулалтыг цуцлах боломжтой.');
        }
        const totalAmount = Number(sale.totalAmount);
        return this.prisma.$transaction(async (tx) => {
            for (const saleItem of sale.items) {
                await tx.truckLoadItem.updateMany({
                    where: {
                        truckLoadId: sale.truckLoadId,
                        productId: saleItem.productId,
                    },
                    data: {
                        soldQty: { decrement: saleItem.quantity },
                    },
                });
                await tx.stockMovement.create({
                    data: {
                        productId: saleItem.productId,
                        quantity: saleItem.quantity,
                        reason: client_1.StockMovementReason.SALE_DISPATCH,
                        createdById: userId,
                        locationCode: `TRUCK-${sale.truckLoad.loadNumber}`,
                        notes: `Борлуулалт #${sale.saleNumber} цуцлагдсан - ${sale.customer.storeName}`,
                    },
                });
            }
            const freshCustomer = await tx.customer.findUniqueOrThrow({
                where: { id: sale.customerId },
                select: { outstandingDebt: true },
            });
            const currentDebt = Number(freshCustomer.outstandingDebt);
            if (sale.paymentMethod === 'CREDIT') {
                const newDebt = currentDebt - totalAmount;
                await tx.customer.update({
                    where: { id: sale.customerId },
                    data: { outstandingDebt: newDebt },
                });
                await tx.customerLedgerEntry.create({
                    data: {
                        customerId: sale.customerId,
                        amount: -totalAmount,
                        balanceAfter: newDebt,
                        description: `Борлуулалт #${sale.saleNumber} цуцлагдсан`,
                    },
                });
            }
            else if (sale.paymentMethod === 'COMBINED') {
                let creditPortion = 0;
                let paidPortion = 0;
                const notesStr = sale.notes || '';
                const combinedMatch = notesStr.match(/COMBINED:(.+?)($|\s*\|)/);
                if (combinedMatch) {
                    const parts = combinedMatch[1].split(',');
                    for (const part of parts) {
                        const [method, amountStr] = part.split(':');
                        const amount = parseFloat(amountStr);
                        if (method === 'CREDIT') {
                            creditPortion += amount;
                        }
                        else {
                            paidPortion += amount;
                        }
                    }
                }
                else {
                    creditPortion = totalAmount;
                }
                if (creditPortion > 0) {
                    const afterCreditReverse = currentDebt - creditPortion;
                    await tx.customer.update({
                        where: { id: sale.customerId },
                        data: { outstandingDebt: afterCreditReverse },
                    });
                    await tx.customerLedgerEntry.create({
                        data: {
                            customerId: sale.customerId,
                            amount: -creditPortion,
                            balanceAfter: afterCreditReverse,
                            description: `Борлуулалт #${sale.saleNumber} цуцлагдсан (зээлийн хэсэг)`,
                        },
                    });
                }
                if (paidPortion > 0) {
                    await tx.payment.create({
                        data: {
                            customerId: sale.customerId,
                            amount: -paidPortion,
                            method: 'CASH',
                            status: 'COMPLETED',
                            paidAt: new Date(),
                            notes: `Борлуулалт #${sale.saleNumber} цуцлагдсан - Буцаалт`,
                        },
                    });
                }
            }
            else {
                await tx.payment.create({
                    data: {
                        customerId: sale.customerId,
                        amount: -totalAmount,
                        method: sale.paymentMethod,
                        status: 'COMPLETED',
                        paidAt: new Date(),
                        notes: `Борлуулалт #${sale.saleNumber} цуцлагдсан - Буцаалт`,
                    },
                });
            }
            await tx.truckSale.delete({
                where: { id },
            });
            return { message: `Борлуулалт #${sale.saleNumber} амжилттай цуцлагдлаа.` };
        });
    }
};
exports.TruckSalesService = TruckSalesService;
exports.TruckSalesService = TruckSalesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], TruckSalesService);
//# sourceMappingURL=truck-sales.service.js.map