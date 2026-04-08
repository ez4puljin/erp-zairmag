import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';

@Injectable()
export class ExpensesService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    pagination: PaginationDto,
    dateFrom?: string,
    dateTo?: string,
    categoryId?: string,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, order = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};

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

  async findOne(id: string) {
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
      throw new NotFoundException(`Expense with ID ${id} not found`);
    }

    return expense;
  }

  async create(dto: CreateExpenseDto, userId: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId },
    });

    if (!category) {
      throw new NotFoundException(`Expense category with ID ${dto.categoryId} not found`);
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

  async update(id: string, dto: Partial<CreateExpenseDto>) {
    await this.findOne(id);

    if (dto.categoryId) {
      const category = await this.prisma.expenseCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Expense category with ID ${dto.categoryId} not found`);
      }
    }

    const data: any = { ...dto };
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

  async remove(id: string) {
    await this.findOne(id);

    return this.prisma.expense.delete({
      where: { id },
    });
  }

  // --- Expense Categories ---

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

  async createCategory(dto: CreateExpenseCategoryDto) {
    return this.prisma.expenseCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
      },
    });
  }

  async updateCategory(id: string, dto: Partial<CreateExpenseCategoryDto>) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Expense category with ID ${id} not found`);
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data: dto,
    });
  }

  async deleteCategory(id: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id },
    });

    if (!category) {
      throw new NotFoundException(`Expense category with ID ${id} not found`);
    }

    return this.prisma.expenseCategory.update({
      where: { id },
      data: { isActive: false },
    });
  }

  // --- Summary ---

  async getSummary(dateFrom: string, dateTo: string) {
    const where: Prisma.ExpenseWhereInput = {
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

    const totalAmount = expenses.reduce(
      (sum, e) => sum + Number(e._sum.amount || 0),
      0,
    );

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
}
