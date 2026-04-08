import { InventoryCountsService } from './inventory-counts.service';
import { CreateInventoryCountDto, UpdateCountItemsDto } from './dto/create-inventory-count.dto';
export declare class InventoryCountsController {
    private readonly service;
    constructor(service: InventoryCountsService);
    create(dto: CreateInventoryCountDto, req: any): Promise<{
        createdBy: {
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
            };
        } & {
            id: string;
            productId: string;
            systemQty: number;
            countedQty: number | null;
            difference: number;
            inventoryCountId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.InventoryCountStatus;
        createdById: string;
        countNumber: number;
        countDate: Date;
        finalizedAt: Date | null;
    }>;
    findAll(): Promise<({
        _count: {
            items: number;
        };
        createdBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.InventoryCountStatus;
        createdById: string;
        countNumber: number;
        countDate: Date;
        finalizedAt: Date | null;
    })[]>;
    findOne(id: string): Promise<{
        createdBy: {
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
                stockAvailable: number;
            };
        } & {
            id: string;
            productId: string;
            systemQty: number;
            countedQty: number | null;
            difference: number;
            inventoryCountId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.InventoryCountStatus;
        createdById: string;
        countNumber: number;
        countDate: Date;
        finalizedAt: Date | null;
    }>;
    getReport(id: string): Promise<{
        summary: {
            totalItems: number;
            countedItems: number;
            discrepancyCount: number;
            gainCount: number;
            lossCount: number;
            totalGain: number;
            totalLoss: number;
            totalGainAmount: number;
            totalLossAmount: number;
            totalDiscrepancyAmount: number;
        };
        createdBy: {
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
                stockAvailable: number;
            };
        } & {
            id: string;
            productId: string;
            systemQty: number;
            countedQty: number | null;
            difference: number;
            inventoryCountId: string;
        })[];
        id: string;
        createdAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.InventoryCountStatus;
        createdById: string;
        countNumber: number;
        countDate: Date;
        finalizedAt: Date | null;
    }>;
    updateItems(id: string, dto: UpdateCountItemsDto): Promise<{
        createdBy: {
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
                stockAvailable: number;
            };
        } & {
            id: string;
            productId: string;
            systemQty: number;
            countedQty: number | null;
            difference: number;
            inventoryCountId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.InventoryCountStatus;
        createdById: string;
        countNumber: number;
        countDate: Date;
        finalizedAt: Date | null;
    }>;
    finalize(id: string, req: any): Promise<{
        createdBy: {
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
                stockAvailable: number;
            };
        } & {
            id: string;
            productId: string;
            systemQty: number;
            countedQty: number | null;
            difference: number;
            inventoryCountId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.InventoryCountStatus;
        createdById: string;
        countNumber: number;
        countDate: Date;
        finalizedAt: Date | null;
    }>;
}
