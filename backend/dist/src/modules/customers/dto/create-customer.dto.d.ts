import { PricingTierLevel } from '@prisma/client';
export declare class CreateCustomerDto {
    storeName: string;
    contactName: string;
    phone: string;
    email?: string;
    address: string;
    city?: string;
    latitude?: number;
    longitude?: number;
    creditLimit?: number;
    pricingTier?: PricingTierLevel;
    customerCategoryId?: string;
    openingBalance?: number;
}
