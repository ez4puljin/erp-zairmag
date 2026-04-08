export declare class TruckLoadItemDto {
    productId: string;
    loadedQty: number;
}
export declare class CreateTruckLoadDto {
    driverId: string;
    loadDate: string;
    notes?: string;
    vehicleInfo?: string;
    items: TruckLoadItemDto[];
}
