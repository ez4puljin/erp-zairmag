import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Role } from '@prisma/client';

@Injectable()
export class DriversService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    return this.prisma.user.findMany({
      where: { role: Role.DRIVER },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        isActive: true,
        deliveryAssignments: {
          where: { completedAt: null },
          select: { id: true, orderId: true, scheduledDate: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const user = await this.prisma.user.findFirst({
      where: { id, role: Role.DRIVER },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        isActive: true,
        createdAt: true,
      },
    });
    if (!user) {
      throw new Error('Driver not found');
    }
    return user;
  }

  async getActiveRoutes() {
    const drivers = await this.prisma.user.findMany({
      where: {
        role: Role.DRIVER,
        isActive: true,
        deliveryAssignments: { some: { completedAt: null } },
      },
      select: {
        id: true,
        firstName: true,
        lastName: true,
        phone: true,
        deliveryAssignments: {
          where: { completedAt: null },
          orderBy: { stopSequence: 'asc' },
          include: {
            order: {
              include: {
                customer: {
                  select: {
                    storeName: true,
                    address: true,
                    latitude: true,
                    longitude: true,
                    phone: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    return drivers.map((driver) => ({
      driverId: driver.id,
      driverName: `${driver.firstName} ${driver.lastName}`,
      phone: driver.phone,
      activeDeliveries: driver.deliveryAssignments.map((route) => ({
        routeId: route.id,
        orderId: route.order.id,
        orderNumber: route.order.orderNumber,
        status: route.order.status,
        customer: route.order.customer,
        stopSequence: route.stopSequence,
        scheduledDate: route.scheduledDate,
      })),
      totalActiveDeliveries: driver.deliveryAssignments.length,
    }));
  }

  async getDriverDeliveries(driverId: string, date?: string) {
    const driver = await this.prisma.user.findFirst({
      where: { id: driverId, role: Role.DRIVER },
    });

    if (!driver) {
      throw new NotFoundException('Driver not found');
    }

    const where: any = { driverId };
    if (date) {
      where.scheduledDate = new Date(date);
    }

    return this.prisma.deliveryRoute.findMany({
      where,
      orderBy: { stopSequence: 'asc' },
      include: {
        order: {
          include: {
            customer: {
              select: {
                storeName: true,
                address: true,
                latitude: true,
                longitude: true,
                phone: true,
              },
            },
            items: {
              include: {
                product: { select: { name: true, unit: true } },
              },
            },
          },
        },
      },
    });
  }

  async updateDelivery(
    driverId: string,
    orderId: string,
    data: { deliveryNotes?: string; proofOfDelivery?: string },
  ) {
    const route = await this.prisma.deliveryRoute.findFirst({
      where: { driverId, orderId },
    });

    if (!route) {
      throw new NotFoundException('Delivery route not found');
    }

    return this.prisma.deliveryRoute.update({
      where: { id: route.id },
      data: {
        deliveryNotes: data.deliveryNotes,
        proofOfDelivery: data.proofOfDelivery,
      },
    });
  }

  async createDriver(dto: { firstName: string; lastName: string; phone: string; email: string; password: string }) {
    const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
    if (existing) throw new BadRequestException('Энэ имэйл бүртгэлтэй байна.');

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(dto.password, 10);

    return this.prisma.user.create({
      data: {
        email: dto.email,
        password: hashedPassword,
        firstName: dto.firstName,
        lastName: dto.lastName,
        phone: dto.phone,
        role: 'DRIVER',
        isActive: true,
      },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true, createdAt: true },
    });
  }

  async updateDriver(id: string, dto: { firstName?: string; lastName?: string; phone?: string; email?: string }) {
    const driver = await this.prisma.user.findUnique({ where: { id } });
    if (!driver || driver.role !== 'DRIVER') throw new NotFoundException('Жолооч олдсонгүй.');

    if (dto.email && dto.email !== driver.email) {
      const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
      if (existing) throw new BadRequestException('Энэ имэйл бүртгэлтэй байна.');
    }

    return this.prisma.user.update({
      where: { id },
      data: { ...dto },
      select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true },
    });
  }

  async toggleDriverActive(id: string) {
    const driver = await this.prisma.user.findUnique({ where: { id } });
    if (!driver || driver.role !== 'DRIVER') throw new NotFoundException('Жолооч олдсонгүй.');

    return this.prisma.user.update({
      where: { id },
      data: { isActive: !driver.isActive },
      select: { id: true, isActive: true, firstName: true, lastName: true },
    });
  }

  async resetPassword(id: string, newPassword: string) {
    const driver = await this.prisma.user.findUnique({ where: { id } });
    if (!driver || driver.role !== 'DRIVER') throw new NotFoundException('Жолооч олдсонгүй.');

    const bcrypt = require('bcrypt');
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await this.prisma.user.update({
      where: { id },
      data: { password: hashedPassword },
    });

    return { message: 'Нууц үг амжилттай шинэчлэгдлээ.' };
  }
}
