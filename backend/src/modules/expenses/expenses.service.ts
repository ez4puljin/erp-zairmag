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
    bankAccountId?: string,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, order = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.ExpenseWhereInput = {};

    if (categoryId) {
      where.categoryId = categoryId;
    }

    if (bankAccountId) {
      // "none" = данс сонгоогүй зардлууд
      where.bankAccountId = bankAccountId === 'none' ? null : bankAccountId;
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
          bankAccount: {
            select: { id: true, bankName: true, accountNumber: true },
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
        bankAccount: {
          select: { id: true, bankName: true, accountNumber: true },
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

    if (dto.bankAccountId) {
      const account = await this.prisma.bankAccount.findUnique({
        where: { id: dto.bankAccountId },
      });
      if (!account) throw new NotFoundException('Данс олдсонгүй.');
    }

    return this.prisma.$transaction(async (tx) => {
      const expense = await tx.expense.create({
        data: {
          categoryId: dto.categoryId,
          amount: dto.amount,
          description: dto.description,
          date: new Date(dto.date),
          bankAccountId: dto.bankAccountId,
          referenceNo: dto.referenceNo,
          notes: dto.notes,
          createdById: userId,
        },
        include: {
          category: { select: { id: true, name: true } },
          bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });

      // Зардал = данснаас гарах урсгал.
      if (dto.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: dto.bankAccountId },
          data: { currentBalance: { decrement: dto.amount } },
        });
      }

      return expense;
    });
  }

  async update(id: string, dto: Partial<CreateExpenseDto>) {
    const existing = await this.findOne(id);

    if (dto.categoryId) {
      const category = await this.prisma.expenseCategory.findUnique({
        where: { id: dto.categoryId },
      });
      if (!category) {
        throw new NotFoundException(`Expense category with ID ${dto.categoryId} not found`);
      }
    }

    if (dto.bankAccountId) {
      const account = await this.prisma.bankAccount.findUnique({
        where: { id: dto.bankAccountId },
      });
      if (!account) throw new NotFoundException('Данс олдсонгүй.');
    }

    const data: any = { ...dto };
    if (dto.date) {
      data.date = new Date(dto.date);
    }

    // Данс эсвэл дүн өөрчлөгдвөл хуучин нөлөөг буцаагаад шинийг нь тавина.
    const oldAccountId = existing.bankAccountId;
    const oldAmount = Number(existing.amount);
    const newAccountId = dto.bankAccountId !== undefined ? dto.bankAccountId : oldAccountId;
    const newAmount = dto.amount !== undefined ? Number(dto.amount) : oldAmount;

    return this.prisma.$transaction(async (tx) => {
      if (oldAccountId) {
        await tx.bankAccount.update({
          where: { id: oldAccountId },
          data: { currentBalance: { increment: oldAmount } },
        });
      }
      if (newAccountId) {
        await tx.bankAccount.update({
          where: { id: newAccountId },
          data: { currentBalance: { decrement: newAmount } },
        });
      }

      return tx.expense.update({
        where: { id },
        data,
        include: {
          category: { select: { id: true, name: true } },
          bankAccount: { select: { id: true, bankName: true, accountNumber: true } },
          createdBy: { select: { id: true, firstName: true, lastName: true } },
        },
      });
    });
  }

  async remove(id: string) {
    const existing = await this.findOne(id);

    return this.prisma.$transaction(async (tx) => {
      // Устгахад данснаас хассан дүнг буцааж нэмнэ.
      if (existing.bankAccountId) {
        await tx.bankAccount.update({
          where: { id: existing.bankAccountId },
          data: { currentBalance: { increment: Number(existing.amount) } },
        });
      }
      return tx.expense.delete({ where: { id } });
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
