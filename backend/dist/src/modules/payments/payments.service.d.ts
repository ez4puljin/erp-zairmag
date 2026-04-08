import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
import { CreatePaymentDto } from './dto/create-payment.dto';
export declare class PaymentsService {
    private prisma;
    constructor(prisma: PrismaService);
    recordPayment(dto: CreatePaymentDto, recordedById: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        customerId: string;
        orderId: string | null;
        amount: Prisma.Decimal;
        method: import("@prisma/client").$Enums.PaymentMethod;
        status: import("@prisma/client").$Enums.PaymentStatus;
        externalRef: string | null;
        paidAt: Date | null;
    }>;
    findAll(pagination: PaginationDto, customerId?: string, status?: string, method?: string): Promise<PaginatedResponse<any>>;
    findByCustomer(customerId: string, pagination: PaginationDto): Promise<PaginatedResponse<any>>;
}
