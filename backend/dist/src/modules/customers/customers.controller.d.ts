import { CustomersService } from './customers.service';
import { CreateCustomerDto } from './dto/create-customer.dto';
import { UpdateCustomerDto } from './dto/update-customer.dto';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class CustomersController {
    private readonly customersService;
    constructor(customersService: CustomersService);
    findAll(pagination: PaginationDto, city?: string): Promise<import("../../common/dto/pagination.dto").PaginatedResponse<any>>;
    getMyProfile(user: any): Promise<{
        customerCategory: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: string;
            description: string | null;
        } | null;
    } & {
        id: string;
        email: string | null;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        storeName: string;
        contactName: string;
        address: string;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        creditLimit: import("@prisma/client-runtime-utils").Decimal;
        outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
        pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
        deletedAt: Date | null;
        userId: string | null;
        customerCategoryId: string | null;
    }>;
    findOne(id: string, user: any): Promise<{
        customerCategory: {
            id: string;
            isActive: boolean;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            type: string;
            description: string | null;
        } | null;
    } & {
        id: string;
        email: string | null;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        storeName: string;
        contactName: string;
        address: string;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        creditLimit: import("@prisma/client-runtime-utils").Decimal;
        outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
        pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
        deletedAt: Date | null;
        userId: string | null;
        customerCategoryId: string | null;
    }>;
    create(dto: CreateCustomerDto): Promise<{
        id: string;
        email: string | null;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        storeName: string;
        contactName: string;
        address: string;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        creditLimit: import("@prisma/client-runtime-utils").Decimal;
        outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
        pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
        deletedAt: Date | null;
        userId: string | null;
        customerCategoryId: string | null;
    }>;
    update(id: string, dto: UpdateCustomerDto): Promise<{
        id: string;
        email: string | null;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        storeName: string;
        contactName: string;
        address: string;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        creditLimit: import("@prisma/client-runtime-utils").Decimal;
        outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
        pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
        deletedAt: Date | null;
        userId: string | null;
        customerCategoryId: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        email: string | null;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        storeName: string;
        contactName: string;
        address: string;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        creditLimit: import("@prisma/client-runtime-utils").Decimal;
        outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
        pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
        deletedAt: Date | null;
        userId: string | null;
        customerCategoryId: string | null;
    }>;
    deactivate(id: string): Promise<{
        id: string;
        email: string | null;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        storeName: string;
        contactName: string;
        address: string;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        creditLimit: import("@prisma/client-runtime-utils").Decimal;
        outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
        pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
        deletedAt: Date | null;
        userId: string | null;
        customerCategoryId: string | null;
    }>;
    activate(id: string): Promise<{
        id: string;
        email: string | null;
        phone: string;
        isActive: boolean;
        createdAt: Date;
        updatedAt: Date;
        storeName: string;
        contactName: string;
        address: string;
        city: string | null;
        latitude: import("@prisma/client-runtime-utils").Decimal | null;
        longitude: import("@prisma/client-runtime-utils").Decimal | null;
        creditLimit: import("@prisma/client-runtime-utils").Decimal;
        outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
        pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
        deletedAt: Date | null;
        userId: string | null;
        customerCategoryId: string | null;
    }>;
    createCredentials(id: string, body: {
        email: string;
        password: string;
    }): Promise<{
        message: string;
        userId: string;
    }>;
    resetPassword(id: string, body: {
        password: string;
    }): Promise<{
        message: string;
    }>;
    getBalance(id: string, user: any): Promise<{
        totalDebt: import("@prisma/client-runtime-utils").Decimal;
        creditLimit: import("@prisma/client-runtime-utils").Decimal;
        lastPaymentDate: Date | null;
        outstandingOrders: number;
    }>;
    getOrders(id: string, pagination: PaginationDto, user: any): Promise<import("../../common/dto/pagination.dto").PaginatedResponse<any>>;
    private assertAdminOrSelf;
}
