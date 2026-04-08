export declare class PurchaseReceiptItemDto {
    productId: string;
    quantity: number;
    unitPrice: number;
}
export declare class CreatePurchaseReceiptDto {
    supplierId: string;
    items: PurchaseReceiptItemDto[];
    notes?: string;
    receivedAt?: string;
}
