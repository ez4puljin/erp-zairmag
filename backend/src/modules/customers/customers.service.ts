import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { Prisma, Role } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';

@Injectable()
export class CustomersService {
  constructor(private prisma: PrismaService) {}

  async findAll(
    pagination: PaginationDto,
    city?: string,
  ): Promise<PaginatedResponse<any>> {
    const { page = 1, limit = 20, search, order = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.CustomerWhereInput = {
      deletedAt: null,
    };

    if (search) {
      where.OR = [
        { storeName: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (city) {
      where.city = { equals: city, mode: 'insensitive' };
    }

    const [data, total] = await Promise.all([
      this.prisma.customer.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: order },
        include: { customerCategory: true },
      }),
      this.prisma.customer.count({ where }),
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
    const customer = await this.prisma.customer.findFirst({
      where: { id, deletedAt: null },
      include: { customerCategory: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return customer;
  }

  async create(dto: CreateCustomerDto) {
    const openingBalance = dto.openingBalance ?? 0;

    if (openingBalance > 0) {
      return this.prisma.$transaction(async (tx) => {
        const customer = await tx.customer.create({
          data: {
            storeName: dto.storeName,
            contactName: dto.contactName,
            phone: dto.phone,
            email: dto.email,
            address: dto.address,
            city: dto.city,
            latitude: dto.latitude,
            longitude: dto.longitude,
            creditLimit: dto.creditLimit ?? 0,
            outstandingDebt: openingBalance,
            pricingTier: dto.pricingTier,
            customerCategoryId: dto.customerCategoryId,
          },
        });

        await tx.customerLedgerEntry.create({
          data: {
            customerId: customer.id,
            amount: openingBalance,
            balanceAfter: openingBalance,
            description: 'Эхний үлдэгдэл',
          },
        });

        return customer;
      });
    }

    return this.prisma.customer.create({
      data: {
        storeName: dto.storeName,
        contactName: dto.contactName,
        phone: dto.phone,
        email: dto.email,
        address: dto.address,
        city: dto.city,
        latitude: dto.latitude,
        longitude: dto.longitude,
        creditLimit: dto.creditLimit ?? 0,
        pricingTier: dto.pricingTier,
        customerCategoryId: dto.customerCategoryId,
      },
    });
  }

  async update(id: string, dto: UpdateCustomerDto) {
    await this.findOne(id);

    return this.prisma.customer.update({
      where: { id },
      data: dto,
    });
  }

  async softDelete(id: string) {
    await this.findOne(id);

    return this.prisma.customer.update({
      where: { id },
      data: {
        deletedAt: new Date(),
        isActive: false,
      },
    });
  }

  async deactivateCustomer(id: string) {
    const customer = await this.findOne(id);

    const activeOrders = await this.prisma.order.count({
      where: {
        customerId: id,
        status: { in: ['PENDING', 'APPROVED', 'SHIPPING'] },
      },
    });

    if (activeOrders > 0) {
      throw new BadRequestException(
        'Идэвхтэй захиалгатай тул идэвхгүй болгох боломжгүй',
      );
    }

    return this.prisma.customer.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activateCustomer(id: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${id} not found`);
    }

    return this.prisma.customer.update({
      where: { id },
      data: { isActive: true, deletedAt: null },
    });
  }

  async createCredentials(
    customerId: string,
    data: { email: string; password: string },
  ) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    if (customer.userId) {
      throw new BadRequestException('Бүртгэл аль хэдийн үүссэн');
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);

    const user = await this.prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        firstName: customer.contactName,
        lastName: customer.storeName,
        role: Role.CUSTOMER,
      },
    });

    await this.prisma.customer.update({
      where: { id: customerId },
      data: { userId: user.id },
    });

    return { message: 'Апп бүртгэл амжилттай үүслээ', userId: user.id };
  }

  async resetPassword(customerId: string, newPassword: string) {
    const customer = await this.prisma.customer.findFirst({
      where: { id: customerId },
      include: { user: true },
    });

    if (!customer) {
      throw new NotFoundException(`Customer with ID ${customerId} not found`);
    }

    if (!customer.user) {
      throw new BadRequestException('Апп бүртгэл олдсонгүй');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id: customer.user.id },
      data: { password: hashedPassword },
    });

    return { message: 'Нууц үг амжилттай шинэчлэгдлээ' };
  }

  async getBalance(customerId: string) {
    const customer = await this.findOne(customerId);

    const lastPayment = await this.prisma.payment.findFirst({
      where: { customerId, status: 'COMPLETED' },
      orderBy: { paidAt: 'desc' },
      select: { paidAt: true },
    });

    const outstandingOrders = await this.prisma.order.count({
      where: {
        customerId,
        status: { in: ['PENDING', 'APPROVED', 'SHIPPING'] },
      },
    });

    return {
      totalDebt: customer.outstandingDebt,
      creditLimit: customer.creditLimit,
      lastPaymentDate: lastPayment?.paidAt ?? null,
      outstandingOrders,
    };
  }

  async getOrders(customerId: string, pagination: PaginationDto): Promise<PaginatedResponse<any>> {
    await this.findOne(customerId);

    const { page = 1, limit = 20, order = 'desc' } = pagination;
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = { customerId };

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        skip,
        take: limit,
        orderBy: { createdAt: order },
        include: { items: true },
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
}
