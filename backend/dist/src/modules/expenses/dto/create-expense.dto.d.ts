import { PaymentMethod } from '@prisma/client';
export declare class CreateExpenseDto {
    categoryId: string;
    amount: number;
    description: string;
    date: string;
    paymentMethod?: PaymentMethod;
    referenceNo?: string;
    notes?: string;
}
