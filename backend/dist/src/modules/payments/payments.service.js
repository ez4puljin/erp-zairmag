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
exports.PaymentsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../../prisma/prisma.service");
let PaymentsService = class PaymentsService {
    prisma;
    constructor(prisma) {
        this.prisma = prisma;
    }
    async recordPayment(dto, recordedById) {
        if (dto.amount <= 0) {
            throw new common_1.BadRequestException('Payment amount must be positive.');
        }
        return this.prisma.$transaction(async (tx) => {
            const customer = await tx.customer.findUnique({
                where: { id: dto.customerId },
            });
            if (!customer) {
                throw new common_1.NotFoundException(`Customer with ID ${dto.customerId} not found`);
            }
            const currentDebt = Number(customer.outstandingDebt);
            const payment = await tx.payment.create({
                data: {
                    customerId: dto.customerId,
                    amount: dto.amount,
                    method: dto.method,
                    status: 'COMPLETED',
                    externalRef: dto.reference,
                    notes: dto.note,
                    orderId: dto.orderId,
                    paidAt: new Date(),
                },
            });
            const newBalance = currentDebt - dto.amount;
            await tx.customer.update({
                where: { id: dto.customerId },
                data: {
                    outstandingDebt: newBalance,
                },
            });
            await tx.customerLedgerEntry.create({
                data: {
                    customerId: dto.customerId,
                    amount: -dto.amount,
                    balanceAfter: newBalance,
                    description: `Payment received via ${dto.method}${dto.reference ? ` (Ref: ${dto.reference})` : ''}`,
                    paymentId: payment.id,
                },
            });
            return payment;
        });
    }
    async findAll(pagination, customerId, status, method) {
        const { page = 1, limit = 20, order = 'desc' } = pagination;
        const skip = (page - 1) * limit;
        const where = {};
        if (customerId) {
            where.customerId = customerId;
        }
        if (status) {
            where.status = status;
        }
        if (method) {
            where.method = method;
        }
        const [data, total] = await Promise.all([
            this.prisma.payment.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: order },
                include: {
                    customer: {
                        select: { id: true, storeName: true, contactName: true },
                    },
                },
            }),
            this.prisma.payment.count({ where }),
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
    async findByCustomer(customerId, pagination) {
        const customer = await this.prisma.customer.findFirst({
            where: { id: customerId, deletedAt: null },
        });
        if (!customer) {
            throw new common_1.NotFoundException(`Customer with ID ${customerId} not found`);
        }
        return this.findAll(pagination, customerId);
    }
};
exports.PaymentsService = PaymentsService;
exports.PaymentsService = PaymentsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], PaymentsService);
//# sourceMappingURL=payments.service.js.map