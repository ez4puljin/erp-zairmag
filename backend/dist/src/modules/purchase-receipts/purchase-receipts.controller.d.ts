import { PurchaseReceiptsService } from './purchase-receipts.service';
import { CreatePurchaseReceiptDto } from './dto/create-purchase-receipt.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class PurchaseReceiptsController {
    private readonly service;
    constructor(service: PurchaseReceiptsService);
    create(dto: CreatePurchaseReceiptDto, user: {
        id: string;
    }): Promise<{
        supplier: {
            id: string;
            email: string | null;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            contactName: string | null;
            address: string | null;
            city: string | null;
            deletedAt: Date | null;
            notes: string | null;
            openingBalance: import("@prisma/client-runtime-utils").Decimal;
        };
        createdBy: {
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                deletedAt: Date | null;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
                stockAvailable: number;
                stockReserved: number;
                reorderLevel: number;
                version: number;
                imageUrl: string | null;
                categoryId: string;
                supplierId: string | null;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            lineTotal: import("@prisma/client-runtime-utils").Decimal;
            purchaseReceiptId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        supplierId: string;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        createdById: string;
        receiptNumber: number;
        receivedAt: Date;
    }>;
    findAll(pagination: PaginationDto, supplierId?: string, dateFrom?: string, dateTo?: string): Promise<{
        data: ({
            supplier: {
                id: string;
                name: string;
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
                };
            } & {
                id: string;
                productId: string;
                quantity: number;
                unitPrice: import("@prisma/client-runtime-utils").Decimal;
                lineTotal: import("@prisma/client-runtime-utils").Decimal;
                purchaseReceiptId: string;
            })[];
        } & {
            id: string;
            createdAt: Date;
            notes: string | null;
            supplierId: string;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
            createdById: string;
            receiptNumber: number;
            receivedAt: Date;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        supplier: {
            id: string;
            email: string | null;
            phone: string | null;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            contactName: string | null;
            address: string | null;
            city: string | null;
            deletedAt: Date | null;
            notes: string | null;
            openingBalance: import("@prisma/client-runtime-utils").Decimal;
        };
        createdBy: {
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                isActive: boolean;
                createdAt: Date;
                updatedAt: Date;
                name: string;
                description: string | null;
                deletedAt: Date | null;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
                stockAvailable: number;
                stockReserved: number;
                reorderLevel: number;
                version: number;
                imageUrl: string | null;
                categoryId: string;
                supplierId: string | null;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            lineTotal: import("@prisma/client-runtime-utils").Decimal;
            purchaseReceiptId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        supplierId: string;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        createdById: string;
        receiptNumber: number;
        receivedAt: Date;
    }>;
}
