import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
export declare class ExpensesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(pagination: PaginationDto, dateFrom?: string, dateTo?: string, categoryId?: string): Promise<PaginatedResponse<any>>;
    findOne(id: string): Promise<{
        category: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        notes: string | null;
        categoryId: string;
        amount: Prisma.Decimal;
        createdById: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        date: Date;
        referenceNo: string | null;
        expenseNumber: number;
    }>;
    create(dto: CreateExpenseDto, userId: string): Promise<{
        category: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        notes: string | null;
        categoryId: string;
        amount: Prisma.Decimal;
        createdById: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        date: Date;
        referenceNo: string | null;
        expenseNumber: number;
    }>;
    update(id: string, dto: Partial<CreateExpenseDto>): Promise<{
        category: {
            id: string;
            name: string;
        };
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        notes: string | null;
        categoryId: string;
        amount: Prisma.Decimal;
        createdById: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        date: Date;
        referenceNo: string | null;
        expenseNumber: number;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        description: string;
        notes: string | null;
        categoryId: string;
        amount: Prisma.Decimal;
        createdById: string;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
        date: Date;
        referenceNo: string | null;
        expenseNumber: number;
    }>;
    getCategories(): Promise<({
        _count: {
            expenses: number;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        description: string | null;
    })[]>;
    createCategory(dto: CreateExpenseCategoryDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        description: string | null;
    }>;
    updateCategory(id: string, dto: Partial<CreateExpenseCategoryDto>): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        description: string | null;
    }>;
    deleteCategory(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        name: string;
        description: string | null;
    }>;
    getSummary(dateFrom: string, dateTo: string): Promise<{
        dateFrom: string;
        dateTo: string;
        totalAmount: number;
        totalCount: number;
        byCategory: {
            categoryId: string;
            categoryName: string;
            totalAmount: number;
            count: number;
        }[];
    }>;
}
