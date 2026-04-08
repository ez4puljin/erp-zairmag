import { PaymentMethod } from '@prisma/client';
export declare class CreatePaymentDto {
    customerId: string;
    amount: number;
    method: PaymentMethod;
    reference?: string;
    note?: string;
    orderId?: string;
}
