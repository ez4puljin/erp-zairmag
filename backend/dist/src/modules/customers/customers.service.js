"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.CustomersService = void 0;
const common_1 = require("@nestjs/common");
const client_1 = require("@prisma/client");
const bcrypt = __importStar(require("bcrypt"));
const prisma_service_1 = require("../../prisma/prisma.service");
let CustomersService = class CustomersService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async findAll(pagination, city) {
        const { page = 1, limit = 20, search, order = 'desc' } = pagination;
        const skip = (page - 1) * limit;
        const where = {
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
    async findOne(id) {
        const customer = await this.prisma.customer.findFirst({
            where: { id, deletedAt: null },
            include: { customerCategory: true },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        return customer;
    }
    async create(dto) {
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
    async update(id, dto) {
        await this.findOne(id);
        return this.prisma.customer.update({
            where: { id },
            data: dto,
        });
    }
    async softDelete(id) {
        await this.findOne(id);
        return this.prisma.customer.update({
            where: { id },
            data: {
                deletedAt: new Date(),
                isActive: false,
            },
        });
    }
    async deactivateCustomer(id) {
        const customer = await this.findOne(id);
        const activeOrders = await this.prisma.order.count({
            where: {
                customerId: id,
                status: { in: ['PENDING', 'APPROVED', 'SHIPPING'] },
            },
        });
        if (activeOrders > 0) {
            throw new common_1.BadRequestException('Идэвхтэй захиалгатай тул идэвхгүй болгох боломжгүй');
        }
        return this.prisma.customer.update({
            where: { id },
            data: { isActive: false },
        });
    }
    async activateCustomer(id) {
        const customer = await this.prisma.customer.findFirst({
            where: { id },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${id} not found`);
        }
        return this.prisma.customer.update({
            where: { id },
            data: { isActive: true, deletedAt: null },
        });
    }
    async createCredentials(customerId, data) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId },
            include: { user: true },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${customerId} not found`);
        }
        if (customer.userId) {
            throw new common_1.BadRequestException('Бүртгэл аль хэдийн үүссэн');
        }
        const hashedPassword = await bcrypt.hash(data.password, 10);
        const user = await this.prisma.user.create({
            data: {
                email: data.email,
                password: hashedPassword,
                firstName: customer.contactName,
                lastName: customer.storeName,
                role: client_1.Role.CUSTOMER,
            },
        });
        await this.prisma.customer.update({
            where: { id: customerId },
            data: { userId: user.id },
        });
        return { message: 'Апп бүртгэл амжилттай үүслээ', userId: user.id };
    }
    async resetPassword(customerId, newPassword) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId },
            include: { user: true },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${customerId} not found`);
        }
        if (!customer.user) {
            throw new common_1.BadRequestException('Апп бүртгэл олдсонгүй');
        }
        const hashedPassword = await bcrypt.hash(newPassword, 10);
        await this.prisma.user.update({
            where: { id: customer.user.id },
            data: { password: hashedPassword },
        });
        return { message: 'Нууц үг амжилттай шинэчлэгдлээ' };
    }
    async getBalance(customerId) {
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
    async getOrders(customerId, pagination) {
        await this.findOne(customerId);
        const { page = 1, limit = 20, order = 'desc' } = pagination;
        const skip = (page - 1) * limit;
        const where = { customerId };
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
};
exports.CustomersService = CustomersService;
exports.CustomersService = CustomersService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], CustomersService);
//# sourceMappingURL=customers.service.js.map