import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { QueryProductDto } from './dto/query-product.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
export declare class ProductsService {
    private prisma;
    constructor(prisma: PrismaService);
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
            openingBalance: Prisma.Decimal;
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
        costPrice: Prisma.Decimal;
        sellingPrice: Prisma.Decimal;
        stockAvailable: number;
        stockReserved: number;
        reorderLevel: number;
        version: number;
        imageUrl: string | null;
        categoryId: string;
        supplierId: string | null;
    }>;
    private static readonly VALID_SORT_FIELDS;
    findAll(query: QueryProductDto): Promise<PaginatedResponse<any>>;
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
            openingBalance: Prisma.Decimal;
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
            price: Prisma.Decimal;
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
        costPrice: Prisma.Decimal;
        sellingPrice: Prisma.Decimal;
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
            openingBalance: Prisma.Decimal;
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
        costPrice: Prisma.Decimal;
        sellingPrice: Prisma.Decimal;
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
        costPrice: Prisma.Decimal;
        sellingPrice: Prisma.Decimal;
        stockAvailable: number;
        stockReserved: number;
        reorderLevel: number;
        version: number;
        imageUrl: string | null;
        categoryId: string;
        supplierId: string | null;
    }>;
    getPrice(productId: string, customerId?: string): Promise<{
        price: Prisma.Decimal;
        source: string;
    }>;
    bulkImport(buffer: Buffer): Promise<{
        created: number;
        updated: number;
        errors: {
            row: number;
            message: string;
        }[];
    }>;
    generateImportTemplate(): any;
}
