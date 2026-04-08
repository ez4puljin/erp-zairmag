import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
import { PaginatedResponse } from '../../common/dto/pagination.dto';
export declare class SuppliersService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(query: QuerySupplierDto): Promise<PaginatedResponse<any>>;
    findOne(id: string): Promise<{
        products: {
            id: string;
            isActive: boolean;
            name: string;
            sku: string;
            sellingPrice: Prisma.Decimal;
            stockAvailable: number;
        }[];
    } & {
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
    }>;
    create(dto: CreateSupplierDto): Promise<{
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
    }>;
    update(id: string, dto: UpdateSupplierDto): Promise<{
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
    }>;
    remove(id: string): Promise<{
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
    }>;
}
