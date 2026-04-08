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
exports.ReceivablesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ReceivablesService = class ReceivablesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getCustomerLedger(customerId, dateFrom, dateTo) {
        const customer = await this.prisma.customer.findUnique({
            where: { id: customerId },
            select: { id: true, storeName: true, contactName: true, phone: true, outstandingDebt: true, creditLimit: true },
        });
        const where = { customerId };
        if (dateFrom || dateTo) {
            where.createdAt = {};
            if (dateFrom)
                where.createdAt.gte = new Date(dateFrom);
            if (dateTo)
                where.createdAt.lte = new Date(dateTo + 'T23:59:59');
        }
        const entries = await this.prisma.customerLedgerEntry.findMany({
            where,
            orderBy: { createdAt: 'asc' },
            include: {
                payment: { select: { method: true, externalRef: true } },
            },
        });
        let openingBalance = 0;
        if (dateFrom) {
            const priorEntries = await this.prisma.customerLedgerEntry.findMany({
                where: { customerId, createdAt: { lt: new Date(dateFrom) } },
                select: { amount: true },
            });
            openingBalance = priorEntries.reduce((sum, e) => sum + Number(e.amount), 0);
        }
        let runningBalance = openingBalance;
        const ledgerRows = entries.map((entry) => {
            const amount = Number(entry.amount);
            const debit = amount > 0 ? amount : 0;
            const credit = amount < 0 ? Math.abs(amount) : 0;
            runningBalance += amount;
            return {
                id: entry.id,
                date: entry.createdAt,
                description: entry.description,
                debit,
                credit,
                balance: runningBalance,
                paymentMethod: entry.payment?.method ?? null,
                paymentRef: entry.payment?.externalRef ?? null,
            };
        });
        return {
            customer,
            openingBalance,
            closingBalance: runningBalance,
            totalDebit: ledgerRows.reduce((s, r) => s + r.debit, 0),
            totalCredit: ledgerRows.reduce((s, r) => s + r.credit, 0),
            entries: ledgerRows,
        };
    }
    async getReceivablesSummary(dateFrom, dateTo, customerId, categoryId) {
        const customerWhere = { deletedAt: null };
        if (customerId)
            customerWhere.id = customerId;
        if (categoryId)
            customerWhere.customerCategoryId = categoryId;
        const customers = await this.prisma.customer.findMany({
            where: customerWhere,
            select: {
                id: true,
                storeName: true,
                contactName: true,
                phone: true,
                outstandingDebt: true,
                creditLimit: true,
                customerCategory: { select: { name: true } },
            },
            orderBy: { outstandingDebt: 'desc' },
        });
        const customerIds = customers.map((c) => c.id);
        const priorByCustomer = new Map();
        if (dateFrom) {
            const priorAgg = await this.prisma.customerLedgerEntry.groupBy({
                by: ['customerId'],
                where: { customerId: { in: customerIds }, createdAt: { lt: new Date(dateFrom) } },
                _sum: { amount: true },
            });
            for (const row of priorAgg) {
                priorByCustomer.set(row.customerId, Number(row._sum.amount ?? 0));
            }
        }
        const periodDateWhere = { customerId: { in: customerIds } };
        if (dateFrom || dateTo) {
            periodDateWhere.createdAt = {};
            if (dateFrom)
                periodDateWhere.createdAt.gte = new Date(dateFrom);
            if (dateTo)
                periodDateWhere.createdAt.lte = new Date(dateTo + 'T23:59:59');
        }
        const [debitAgg, creditAgg] = await Promise.all([
            this.prisma.customerLedgerEntry.groupBy({
                by: ['customerId'],
                where: { ...periodDateWhere, amount: { gt: 0 } },
                _sum: { amount: true },
            }),
            this.prisma.customerLedgerEntry.groupBy({
                by: ['customerId'],
                where: { ...periodDateWhere, amount: { lt: 0 } },
                _sum: { amount: true },
            }),
        ]);
        const debitByCustomer = new Map();
        for (const row of debitAgg) {
            debitByCustomer.set(row.customerId, Number(row._sum.amount ?? 0));
        }
        const creditByCustomer = new Map();
        for (const row of creditAgg) {
            creditByCustomer.set(row.customerId, Math.abs(Number(row._sum.amount ?? 0)));
        }
        const summaries = customers.map((c) => {
            const openingBalance = priorByCustomer.get(c.id) ?? 0;
            const totalDebit = debitByCustomer.get(c.id) ?? 0;
            const totalCredit = creditByCustomer.get(c.id) ?? 0;
            const closingBalance = openingBalance + totalDebit - totalCredit;
            return {
                id: c.id,
                storeName: c.storeName,
                contactName: c.contactName,
                phone: c.phone,
                outstandingDebt: Number(c.outstandingDebt),
                creditLimit: Number(c.creditLimit),
                openingBalance,
                periodDebit: totalDebit,
                periodCredit: totalCredit,
                closingBalance,
                category: c.customerCategory?.name ?? null,
            };
        });
        return summaries.filter((c) => c.openingBalance !== 0 || c.periodDebit > 0 || c.periodCredit > 0 || c.outstandingDebt > 0);
    }
    async getDebtAging() {
        const customers = await this.prisma.customer.findMany({
            where: { outstandingDebt: { gt: 0 }, deletedAt: null },
            select: { id: true, storeName: true, phone: true, outstandingDebt: true, creditLimit: true },
        });
        const now = new Date();
        const results = [];
        for (const customer of customers) {
            const debitEntries = await this.prisma.customerLedgerEntry.findMany({
                where: { customerId: customer.id, amount: { gt: 0 } },
                orderBy: { createdAt: 'asc' },
            });
            const creditResult = await this.prisma.customerLedgerEntry.aggregate({
                where: { customerId: customer.id, amount: { lt: 0 } },
                _sum: { amount: true },
            });
            let remainingCredit = Math.abs(Number(creditResult._sum.amount ?? 0));
            let current = 0, days31_60 = 0, days61_90 = 0, over90 = 0;
            for (const entry of debitEntries) {
                let unpaid = Number(entry.amount);
                if (remainingCredit >= unpaid) {
                    remainingCredit -= unpaid;
                    continue;
                }
                if (remainingCredit > 0) {
                    unpaid -= remainingCredit;
                    remainingCredit = 0;
                }
                const daysDiff = Math.floor((now.getTime() - new Date(entry.createdAt).getTime()) / (1000 * 60 * 60 * 24));
                if (daysDiff <= 30)
                    current += unpaid;
                else if (daysDiff <= 60)
                    days31_60 += unpaid;
                else if (daysDiff <= 90)
                    days61_90 += unpaid;
                else
                    over90 += unpaid;
            }
            results.push({
                customerId: customer.id,
                storeName: customer.storeName,
                phone: customer.phone,
                creditLimit: Number(customer.creditLimit),
                current: Math.round(current),
                days31_60: Math.round(days31_60),
                days61_90: Math.round(days61_90),
                over90: Math.round(over90),
                total: Math.round(current + days31_60 + days61_90 + over90),
            });
        }
        return results.sort((a, b) => b.total - a.total);
    }
};
exports.ReceivablesService = ReceivablesService;
exports.ReceivablesService = ReceivablesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ReceivablesService);
//# sourceMappingURL=receivables.service.js.map