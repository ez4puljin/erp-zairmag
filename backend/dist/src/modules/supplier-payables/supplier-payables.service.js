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
exports.SupplierPayablesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let SupplierPayablesService = class SupplierPayablesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async createPayment(dto, userId) {
        const supplier = await this.prisma.supplier.findFirst({
            where: { id: dto.supplierId, deletedAt: null },
        });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found');
        return this.prisma.supplierPayment.create({
            data: {
                supplierId: dto.supplierId,
                type: dto.type ?? 'PAYMENT',
                amount: dto.amount,
                method: dto.method,
                description: dto.description,
                referenceNo: dto.referenceNo,
                date: new Date(dto.date),
                createdById: userId,
            },
            include: { supplier: { select: { name: true } } },
        });
    }
    async getPayments(supplierId) {
        return this.prisma.supplierPayment.findMany({
            where: supplierId ? { supplierId } : undefined,
            include: {
                supplier: { select: { name: true } },
                createdBy: { select: { firstName: true, lastName: true } },
            },
            orderBy: { date: 'desc' },
        });
    }
    async getSupplierLedger(supplierId, startDate, endDate) {
        const supplier = await this.prisma.supplier.findFirst({
            where: { id: supplierId, deletedAt: null },
        });
        if (!supplier)
            throw new common_1.NotFoundException('Supplier not found');
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        let openingCredit = Number(supplier.openingBalance);
        let openingDebit = 0;
        const priorPurchases = await this.prisma.purchaseReceipt.aggregate({
            where: { supplierId, receivedAt: { lt: start } },
            _sum: { totalAmount: true },
        });
        openingCredit += Number(priorPurchases._sum.totalAmount ?? 0);
        const priorPayments = await this.prisma.supplierPayment.aggregate({
            where: { supplierId, date: { lt: start } },
            _sum: { amount: true },
        });
        openingDebit += Number(priorPayments._sum.amount ?? 0);
        const netOpening = openingCredit - openingDebit;
        const openingBalanceDebit = netOpening < 0 ? Math.abs(netOpening) : 0;
        const openingBalanceCredit = netOpening > 0 ? netOpening : 0;
        const [purchases, payments] = await Promise.all([
            this.prisma.purchaseReceipt.findMany({
                where: { supplierId, receivedAt: { gte: start, lte: end } },
                include: { items: { include: { product: { select: { name: true, unit: true } } } } },
                orderBy: { receivedAt: 'asc' },
            }),
            this.prisma.supplierPayment.findMany({
                where: { supplierId, date: { gte: start, lte: end } },
                orderBy: { date: 'asc' },
            }),
        ]);
        const entries = [];
        let runningBalance = netOpening;
        const allTxns = [
            ...purchases.map(p => ({ date: new Date(p.receivedAt), kind: 'purchase', data: p })),
            ...payments.map(p => ({ date: new Date(p.date), kind: 'payment', data: p })),
        ];
        allTxns.sort((a, b) => a.date.getTime() - b.date.getTime());
        for (const txn of allTxns) {
            if (txn.kind === 'purchase') {
                const p = txn.data;
                const amount = Number(p.totalAmount);
                runningBalance += amount;
                const itemsSummary = p.items?.map((i) => i.product?.name).join(', ') || '';
                const detail = p.notes && p.notes.trim() ? p.notes.trim() : itemsSummary;
                entries.push({
                    date: txn.date.toISOString(),
                    referenceNo: `#${p.receiptNumber}`,
                    description: `Орлого${detail ? ' - ' + detail : ''}`,
                    type: 'PURCHASE',
                    debit: 0,
                    credit: amount,
                    runningBalance,
                });
            }
            else {
                const p = txn.data;
                const amount = Number(p.amount);
                runningBalance -= amount;
                const typeLabels = {
                    PAYMENT: 'Төлбөр',
                    RETURN: 'Буцаалт',
                    ADJUSTMENT: 'Тохируулга',
                };
                const methodLabels = {
                    CASH: 'Бэлэн',
                    BANK_TRANSFER: 'Банк',
                    MOBILE_MONEY: 'Мобайл',
                    CHECK: 'Чек',
                };
                const label = typeLabels[p.type] || p.type;
                const methodLabel = p.method ? ` (${methodLabels[p.method] || p.method})` : '';
                entries.push({
                    date: txn.date.toISOString(),
                    referenceNo: p.referenceNo || '',
                    description: `${label}${methodLabel}${p.description ? ' - ' + p.description : ''}`,
                    type: p.type,
                    debit: amount,
                    credit: 0,
                    runningBalance,
                });
            }
        }
        const totalDebit = entries.reduce((s, e) => s + e.debit, 0);
        const totalCredit = entries.reduce((s, e) => s + e.credit, 0);
        const closingNet = netOpening + totalCredit - totalDebit;
        const closingDebit = closingNet < 0 ? Math.abs(closingNet) : 0;
        const closingCredit = closingNet > 0 ? closingNet : 0;
        return {
            supplier: { id: supplier.id, name: supplier.name, phone: supplier.phone },
            period: { startDate, endDate },
            openingBalance: { debit: openingBalanceDebit, credit: openingBalanceCredit },
            entries,
            totals: { debit: totalDebit, credit: totalCredit },
            closingBalance: { debit: closingDebit, credit: closingCredit },
        };
    }
    async getPayablesSummary(startDate, endDate, supplierId) {
        const supplierWhere = { deletedAt: null };
        if (supplierId)
            supplierWhere.id = supplierId;
        const suppliers = await this.prisma.supplier.findMany({
            where: supplierWhere,
            orderBy: { name: 'asc' },
        });
        const supplierIds = suppliers.map((s) => s.id);
        const start = new Date(startDate);
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        const [priorPurchasesAgg, priorPaymentsAgg, periodPurchasesAgg, periodPaymentsAgg] = await Promise.all([
            this.prisma.purchaseReceipt.groupBy({
                by: ['supplierId'],
                where: { supplierId: { in: supplierIds }, receivedAt: { lt: start } },
                _sum: { totalAmount: true },
            }),
            this.prisma.supplierPayment.groupBy({
                by: ['supplierId'],
                where: { supplierId: { in: supplierIds }, date: { lt: start } },
                _sum: { amount: true },
            }),
            this.prisma.purchaseReceipt.groupBy({
                by: ['supplierId'],
                where: { supplierId: { in: supplierIds }, receivedAt: { gte: start, lte: end } },
                _sum: { totalAmount: true },
            }),
            this.prisma.supplierPayment.groupBy({
                by: ['supplierId'],
                where: { supplierId: { in: supplierIds }, date: { gte: start, lte: end } },
                _sum: { amount: true },
            }),
        ]);
        const priorPurchasesMap = new Map();
        for (const row of priorPurchasesAgg) {
            priorPurchasesMap.set(row.supplierId, Number(row._sum.totalAmount ?? 0));
        }
        const priorPaymentsMap = new Map();
        for (const row of priorPaymentsAgg) {
            priorPaymentsMap.set(row.supplierId, Number(row._sum.amount ?? 0));
        }
        const periodPurchasesMap = new Map();
        for (const row of periodPurchasesAgg) {
            periodPurchasesMap.set(row.supplierId, Number(row._sum.totalAmount ?? 0));
        }
        const periodPaymentsMap = new Map();
        for (const row of periodPaymentsAgg) {
            periodPaymentsMap.set(row.supplierId, Number(row._sum.amount ?? 0));
        }
        const results = suppliers.map((sup) => {
            const openingCredit = Number(sup.openingBalance) + (priorPurchasesMap.get(sup.id) ?? 0);
            const openingDebit = priorPaymentsMap.get(sup.id) ?? 0;
            const netOpening = openingCredit - openingDebit;
            const txnCredit = periodPurchasesMap.get(sup.id) ?? 0;
            const txnDebit = periodPaymentsMap.get(sup.id) ?? 0;
            const closingNet = netOpening + txnCredit - txnDebit;
            return {
                id: sup.id,
                name: sup.name,
                openingBalance: netOpening,
                totalCredit: txnCredit,
                totalDebit: txnDebit,
                closingBalance: closingNet,
            };
        });
        return results.filter(r => r.openingBalance !== 0 || r.totalCredit !== 0 || r.totalDebit !== 0 || r.closingBalance !== 0);
    }
};
exports.SupplierPayablesService = SupplierPayablesService;
exports.SupplierPayablesService = SupplierPayablesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], SupplierPayablesService);
//# sourceMappingURL=supplier-payables.service.js.map