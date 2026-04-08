import { CategoriesService, CreateCategoryDto, UpdateCategoryDto } from './categories.service';
export declare class CategoriesController {
    private readonly categoriesService;
    constructor(categoriesService: CategoriesService);
    findAll(): Promise<({
        parent: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        }[];
        _count: {
            products: number;
        };
    } & {
        id: string;
        createdAt: Date;
        name: string;
        parentId: string | null;
    })[]>;
    findOne(id: string): Promise<{
        parent: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        }[];
        products: {
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
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        parentId: string | null;
    }>;
    create(dto: CreateCategoryDto): Promise<{
        parent: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        parentId: string | null;
    }>;
    update(id: string, dto: UpdateCategoryDto): Promise<{
        parent: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        } | null;
        children: {
            id: string;
            createdAt: Date;
            name: string;
            parentId: string | null;
        }[];
    } & {
        id: string;
        createdAt: Date;
        name: string;
        parentId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        createdAt: Date;
        name: string;
        parentId: string | null;
    }>;
}
