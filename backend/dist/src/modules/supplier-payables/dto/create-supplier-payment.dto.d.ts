import { SupplierPaymentType, PaymentMethod } from '@prisma/client';
export declare class CreateSupplierPaymentDto {
    supplierId: string;
    type?: SupplierPaymentType;
    amount: number;
    method?: PaymentMethod;
    description?: string;
    referenceNo?: string;
    date: string;
}
