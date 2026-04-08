export declare class UpdateTruckLoadItemDto {
    productId: string;
    loadedQty: number;
}
export declare class UpdateTruckLoadDto {
    notes?: string;
    items?: UpdateTruckLoadItemDto[];
}
