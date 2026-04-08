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
exports.DriversService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
const client_1 = require("@prisma/client");
let DriversService = class DriversService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll() {
        return this.prisma.user.findMany({
            where: { role: client_1.Role.DRIVER },
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
    async findOne(id) {
        const user = await this.prisma.user.findFirst({
            where: { id, role: client_1.Role.DRIVER },
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
                role: client_1.Role.DRIVER,
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
    async getDriverDeliveries(driverId, date) {
        const driver = await this.prisma.user.findFirst({
            where: { id: driverId, role: client_1.Role.DRIVER },
        });
        if (!driver) {
            throw new common_1.NotFoundException('Driver not found');
        }
        const where = { driverId };
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
    async updateDelivery(driverId, orderId, data) {
        const route = await this.prisma.deliveryRoute.findFirst({
            where: { driverId, orderId },
        });
        if (!route) {
            throw new common_1.NotFoundException('Delivery route not found');
        }
        return this.prisma.deliveryRoute.update({
            where: { id: route.id },
            data: {
                deliveryNotes: data.deliveryNotes,
                proofOfDelivery: data.proofOfDelivery,
            },
        });
    }
    async createDriver(dto) {
        const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
        if (existing)
            throw new common_1.BadRequestException('Энэ имэйл бүртгэлтэй байна.');
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
    async updateDriver(id, dto) {
        const driver = await this.prisma.user.findUnique({ where: { id } });
        if (!driver || driver.role !== 'DRIVER')
            throw new common_1.NotFoundException('Жолооч олдсонгүй.');
        if (dto.email && dto.email !== driver.email) {
            const existing = await this.prisma.user.findUnique({ where: { email: dto.email } });
            if (existing)
                throw new common_1.BadRequestException('Энэ имэйл бүртгэлтэй байна.');
        }
        return this.prisma.user.update({
            where: { id },
            data: { ...dto },
            select: { id: true, email: true, firstName: true, lastName: true, phone: true, role: true, isActive: true },
        });
    }
    async toggleDriverActive(id) {
        const driver = await this.prisma.user.findUnique({ where: { id } });
        if (!driver || driver.role !== 'DRIVER')
            throw new common_1.NotFoundException('Жолооч олдсонгүй.');
        return this.prisma.user.update({
            where: { id },
            data: { isActive: !driver.isActive },
            select: { id: true, isActive: true, firstName: true, lastName: true },
        });
    }
    async resetPassword(id, newPassword) {
        const driver = await this.prisma.user.findUnique({ where: { id } });
        if (!driver || driver.role !== 'DRIVER')
            throw new common_1.NotFoundException('Жолооч олдсонгүй.');
        const bcrypt = require('bcrypt');
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id },
            data: { password: hashedPassword },
        });
        return { message: 'Нууц үг амжилттай шинэчлэгдлээ.' };
    }
};
exports.DriversService = DriversService;
exports.DriversService = DriversService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], DriversService);
//# sourceMappingURL=drivers.service.js.map