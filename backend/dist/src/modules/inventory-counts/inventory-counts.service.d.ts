import { PrismaService } from '../../prisma/prisma.service';
import { CreateInventoryCountDto, CountItemDto } from './dto/create-inventory-count.dto';
export declare class InventoryCountsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateInventoryCountDto, userId: string): Promise<{
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
    updateItems(id: string, items: CountItemDto[]): Promise<{
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
    finalize(id: string, userId: string): Promise<{
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
}
