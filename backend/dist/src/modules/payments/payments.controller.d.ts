import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class PaymentsController {
    private readonly paymentsService;
    constructor(paymentsService: PaymentsService);
    recordPayment(dto: CreatePaymentDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        customerId: string;
        orderId: string | null;
        amount: import("@prisma/client-runtime-utils").Decimal;
        method: import("@prisma/client").$Enums.PaymentMethod;
        status: import("@prisma/client").$Enums.PaymentStatus;
        externalRef: string | null;
        paidAt: Date | null;
    }>;
    findAll(pagination: PaginationDto, customerId?: string, status?: string, method?: string): Promise<import("../../common/dto/pagination.dto").PaginatedResponse<any>>;
    findByCustomer(id: string, pagination: PaginationDto, user: any): Promise<import("../../common/dto/pagination.dto").PaginatedResponse<any>>;
}
