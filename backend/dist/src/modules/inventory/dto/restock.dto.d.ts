declare class RestockItemDto {
    productId: string;
    quantity: number;
    costPerUnit?: number;
}
export declare class RestockDto {
    items: RestockItemDto[];
    supplier?: string;
    note?: string;
}
export declare class AdjustStockDto {
    productId: string;
    adjustment: number;
    reason: string;
}
export {};
