import type { Response } from 'express';
import { ProductsService } from './products.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
export declare class ProductsController {
    private readonly productsService;
    constructor(productsService: ProductsService);
    findAll(query: QueryProductDto): Promise<import("../../common/dto/pagination.dto").PaginatedResponse<any>>;
    getImportTemplate(res: Response): Promise<void>;
    findOne(id: string): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        };
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
        } | null;
        batches: {
            id: string;
            createdAt: Date;
            productId: string;
            expiryDate: Date;
            batchNumber: string;
            manufactureDate: Date | null;
            quantityRemaining: number;
            quantityInitial: number;
        }[];
        tierPrices: {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            productId: string;
            tier: import("@prisma/client").$Enums.PricingTierLevel;
            price: import("@prisma/client-runtime-utils").Decimal;
        }[];
    } & {
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
    }>;
    getPrice(id: string, customerId?: string): Promise<{
        price: import("@prisma/client-runtime-utils").Decimal;
        source: string;
    }>;
    create(dto: CreateProductDto): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        };
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
        } | null;
    } & {
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
    }>;
    update(id: string, dto: UpdateProductDto): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        };
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
        } | null;
    } & {
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
    }>;
    remove(id: string): Promise<{
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
    }>;
    bulkImport(file: Express.Multer.File): Promise<{
        created: number;
        updated: number;
        errors: {
            row: number;
            message: string;
        }[];
    }>;
    uploadImage(id: string, file: Express.Multer.File): Promise<{
        category: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        };
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
        } | null;
    } & {
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
    }>;
}
