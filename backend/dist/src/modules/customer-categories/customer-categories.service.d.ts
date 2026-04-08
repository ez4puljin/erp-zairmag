import { PrismaService } from '../../prisma/prisma.service';
import { CreateCustomerCategoryDto } from './dto/create-customer-category.dto';
import { UpdateCustomerCategoryDto } from './dto/update-customer-category.dto';
export declare class CustomerCategoriesService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<({
        _count: {
            customers: number;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        description: string | null;
    })[]>;
    findOne(id: string): Promise<{
        _count: {
            customers: number;
        };
    } & {
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        description: string | null;
    }>;
    create(dto: CreateCustomerCategoryDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        description: string | null;
    }>;
    update(id: string, dto: UpdateCustomerCategoryDto): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        description: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        type: string;
        description: string | null;
    }>;
}
