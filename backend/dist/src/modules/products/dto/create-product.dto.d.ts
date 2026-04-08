import { ProductUnit } from '@prisma/client';
export declare class CreateProductDto {
    name: string;
    sku: string;
    description?: string;
    categoryId: string;
    unit?: ProductUnit;
    unitsPerBox?: number;
    costPrice: number;
    sellingPrice: number;
    reorderLevel?: number;
    imageUrl?: string;
    supplierId?: string;
}
