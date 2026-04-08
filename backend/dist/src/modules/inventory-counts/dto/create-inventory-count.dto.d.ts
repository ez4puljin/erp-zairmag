export declare class CountItemDto {
    productId: string;
    countedQty: number;
}
export declare class CreateInventoryCountDto {
    countDate: string;
    notes?: string;
}
export declare class UpdateCountItemsDto {
    items: CountItemDto[];
}
