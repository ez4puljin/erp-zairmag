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
exports.ExpensesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let ExpensesService = class ExpensesService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(pagination, dateFrom, dateTo, categoryId) {
        const { page = 1, limit = 20, order = 'desc' } = pagination;
        const skip = (page - 1) * limit;
        const where = {};
        if (categoryId) {
            where.categoryId = categoryId;
        }
        if (dateFrom || dateTo) {
            where.date = {};
            if (dateFrom) {
                where.date.gte = new Date(dateFrom);
            }
            if (dateTo) {
                where.date.lte = new Date(dateTo);
            }
        }
        const [data, total] = await Promise.all([
            this.prisma.expense.findMany({
                where,
                skip,
                take: limit,
                orderBy: { date: order },
                include: {
                    category: {
                        select: { id: true, name: true },
                    },
                    createdBy: {
                        select: { id: true, firstName: true, lastName: true },
                    },
                },
            }),
            this.prisma.expense.count({ where }),
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
    async findOne(id) {
        const expense = await this.prisma.expense.findUnique({
            where: { id },
            include: {
                category: {
                    select: { id: true, name: true },
                },
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
        if (!expense) {
            throw new common_1.NotFoundException(`Expense with ID ${id} not found`);
        }
        return expense;
    }
    async create(dto, userId) {
        const category = await this.prisma.expenseCategory.findUnique({
            where: { id: dto.categoryId },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Expense category with ID ${dto.categoryId} not found`);
        }
        return this.prisma.expense.create({
            data: {
                categoryId: dto.categoryId,
                amount: dto.amount,
                description: dto.description,
                date: new Date(dto.date),
                paymentMethod: dto.paymentMethod,
                referenceNo: dto.referenceNo,
                notes: dto.notes,
                createdById: userId,
            },
            include: {
                category: {
                    select: { id: true, name: true },
                },
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async update(id, dto) {
        await this.findOne(id);
        if (dto.categoryId) {
            const category = await this.prisma.expenseCategory.findUnique({
                where: { id: dto.categoryId },
            });
            if (!category) {
                throw new common_1.NotFoundException(`Expense category with ID ${dto.categoryId} not found`);
            }
        }
        const data = { ...dto };
        if (dto.date) {
            data.date = new Date(dto.date);
        }
        return this.prisma.expense.update({
            where: { id },
            data,
            include: {
                category: {
                    select: { id: true, name: true },
                },
                createdBy: {
                    select: { id: true, firstName: true, lastName: true },
                },
            },
        });
    }
    async remove(id) {
        await this.findOne(id);
        return this.prisma.expense.delete({
            where: { id },
        });
    }
    async getCategories() {
        return this.prisma.expenseCategory.findMany({
            where: { isActive: true },
            orderBy: { name: 'asc' },
            include: {
                _count: {
                    select: { expenses: true },
                },
            },
        });
    }
    async createCategory(dto) {
        return this.prisma.expenseCategory.create({
            data: {
                name: dto.name,
                description: dto.description,
            },
        });
    }
    async updateCategory(id, dto) {
        const category = await this.prisma.expenseCategory.findUnique({
            where: { id },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Expense category with ID ${id} not found`);
        }
        return this.prisma.expenseCategory.update({
            where: { id },
            data: dto,
        });
    }
    async deleteCategory(id) {
        const category = await this.prisma.expenseCategory.findUnique({
            where: { id },
        });
        if (!category) {
            throw new common_1.NotFoundException(`Expense category with ID ${id} not found`);
        }
        return this.prisma.expenseCategory.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async getSummary(dateFrom, dateTo) {
        const where = {
            date: {
                gte: new Date(dateFrom),
                lte: new Date(dateTo),
            },
        };
        const expenses = await this.prisma.expense.groupBy({
            by: ['categoryId'],
            where,
            _sum: {
                amount: true,
            },
            _count: {
                id: true,
            },
        });
        const categories = await this.prisma.expenseCategory.findMany({
            where: {
                id: { in: expenses.map((e) => e.categoryId) },
            },
            select: { id: true, name: true },
        });
        const categoryMap = new Map(categories.map((c) => [c.id, c.name]));
        const totalAmount = expenses.reduce((sum, e) => sum + Number(e._sum.amount || 0), 0);
        return {
            dateFrom,
            dateTo,
            totalAmount,
            totalCount: expenses.reduce((sum, e) => sum + e._count.id, 0),
            byCategory: expenses.map((e) => ({
                categoryId: e.categoryId,
                categoryName: categoryMap.get(e.categoryId) || 'Unknown',
                totalAmount: Number(e._sum.amount || 0),
                count: e._count.id,
            })),
        };
    }
};
exports.ExpensesService = ExpensesService;
exports.ExpensesService = ExpensesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ExpensesService);
//# sourceMappingURL=expenses.service.js.map