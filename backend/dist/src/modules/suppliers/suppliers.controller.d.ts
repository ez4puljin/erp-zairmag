import { SuppliersService } from './suppliers.service';
import { CreateSupplierDto } from './dto/create-supplier.dto';
import { UpdateSupplierDto } from './dto/update-supplier.dto';
import { QuerySupplierDto } from './dto/query-supplier.dto';
export declare class SuppliersController {
    private readonly suppliersService;
    constructor(suppliersService: SuppliersService);
    findAll(query: QuerySupplierDto): Promise<import("../../common/dto/pagination.dto").PaginatedResponse<any>>;
    findOne(id: string): Promise<{
        products: {
            id: string;
            isActive: boolean;
            name: string;
            sku: string;
            sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
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
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
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
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
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
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
    }>;
}
