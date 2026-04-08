import { PaymentMethod } from '@prisma/client';
export declare class TruckSaleItemDto {
    productId: string;
    quantity: number;
    unitPrice: number;
}
export declare class CombinedPaymentDto {
    method: PaymentMethod;
    amount: number;
}
export declare class CreateTruckSaleDto {
    truckLoadId: string;
    customerId: string;
    paymentMethod: PaymentMethod;
    combinedPayments?: CombinedPaymentDto[];
    notes?: string;
    items: TruckSaleItemDto[];
}
