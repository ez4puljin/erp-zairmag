export declare class ReturnItemDto {
    productId: string;
    returnedQty: number;
    damagedQty?: number;
}
export declare class SubmitReturnDto {
    items: ReturnItemDto[];
    notes?: string;
}
