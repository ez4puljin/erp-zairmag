import { PaymentMethod } from '@prisma/client';
export declare class CreateOrderItemDto {
    productId: string;
    quantity: number;
}
export declare class CreateOrderDto {
    items: CreateOrderItemDto[];
    notes?: string;
    paymentMethod?: PaymentMethod;
}
export declare class AdminCreateOrderDto extends CreateOrderDto {
    customerId: string;
}
