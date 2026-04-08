export declare class UpdateOrderStatusDto {
    status: 'APPROVED' | 'SHIPPING' | 'DELIVERED';
    driverId?: string;
    deliveryNotes?: string;
    paymentMethod?: string;
}
export declare class CancelOrderDto {
    cancellationNote?: string;
}
