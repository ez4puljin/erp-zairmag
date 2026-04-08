import { PrismaService } from '../../prisma/prisma.service';
import { RestockDto, AdjustStockDto } from './dto/restock.dto';
import { StockMovementReason } from '@prisma/client';
export declare class InventoryService {
    private prisma;
    constructor(prisma: PrismaService);
    getOverview(): Promise<{
        totalStock: number;
        isLowStock: boolean;
        id: string;
        name: string;
        category: {
            name: string;
        };
        sku: string;
        unit: import("@prisma/client").$Enums.ProductUnit;
        costPrice: import("@prisma/client-runtime-utils").Decimal;
        sellingPrice: import("@prisma/client-runtime-utils").Decimal;
        stockAvailable: number;
        stockReserved: number;
        reorderLevel: number;
    }[]>;
    restock(dto: RestockDto, userId: string): Promise<{
        movements: any[];
        itemCount: number;
    }>;
    adjustStock(dto: AdjustStockDto, userId: string): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        productId: string;
        orderId: string | null;
        createdById: string;
        quantity: number;
        batchId: string | null;
        reason: import("@prisma/client").$Enums.StockMovementReason;
        transactionId: string | null;
        locationCode: string | null;
    }>;
    getMovements(query: {
        productId?: string;
        reason?: StockMovementReason;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            product: {
                name: string;
                sku: string;
            };
            createdBy: {
                firstName: string;
                lastName: string;
            };
        } & {
            id: string;
            createdAt: Date;
            notes: string | null;
            productId: string;
            orderId: string | null;
            createdById: string;
            quantity: number;
            batchId: string | null;
            reason: import("@prisma/client").$Enums.StockMovementReason;
            transactionId: string | null;
            locationCode: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    getLowStock(threshold?: number): Promise<{
        id: string;
        name: string;
        sku: string;
        stockAvailable: number;
        stockReserved: number;
        reorderLevel: number;
    }[]>;
}
