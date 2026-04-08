import { TruckSalesService } from './truck-sales.service';
import { CreateTruckSaleDto } from './dto/create-truck-sale.dto';
export declare class TruckSalesController {
    private readonly service;
    constructor(service: TruckSalesService);
    create(dto: CreateTruckSaleDto, req: any): Promise<{
        customer: {
            id: string;
            phone: string;
            storeName: string;
            contactName: string;
            address: string;
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
            truckSaleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        customerId: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        truckLoadId: string;
        saleNumber: number;
    }>;
    findByTruckLoad(truckLoadId: string): Promise<({
        customer: {
            id: string;
            phone: string;
            storeName: string;
            contactName: string;
            address: string;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitPrice: import("@prisma/client-runtime-utils").Decimal;
            lineTotal: import("@prisma/client-runtime-utils").Decimal;
            truckSaleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        customerId: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        truckLoadId: string;
        saleNumber: number;
    })[]>;
    findOne(id: string): Promise<{
        customer: {
            id: string;
            phone: string;
            storeName: string;
            contactName: string;
            address: string;
        };
        truckLoad: {
            driver: {
                phone: string | null;
                firstName: string;
                lastName: string;
            };
            loadNumber: number;
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
            truckSaleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        customerId: string;
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        truckLoadId: string;
        saleNumber: number;
    }>;
    voidSale(id: string, req: any): Promise<{
        message: string;
    }>;
}
