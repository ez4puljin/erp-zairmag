import { PrismaService } from '../../prisma/prisma.service';
import { CreateTruckSaleDto } from './dto/create-truck-sale.dto';
import { Prisma } from '@prisma/client';
export declare class TruckSalesService {
    private prisma;
    constructor(prisma: PrismaService);
    createSale(dto: CreateTruckSaleDto, userId: string): Promise<{
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
            unitPrice: Prisma.Decimal;
            lineTotal: Prisma.Decimal;
            truckSaleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        customerId: string;
        subtotal: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        truckLoadId: string;
        saleNumber: number;
    }>;
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
            unitPrice: Prisma.Decimal;
            lineTotal: Prisma.Decimal;
            truckSaleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        customerId: string;
        subtotal: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
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
                sellingPrice: Prisma.Decimal;
            };
        } & {
            id: string;
            productId: string;
            quantity: number;
            unitPrice: Prisma.Decimal;
            lineTotal: Prisma.Decimal;
            truckSaleId: string;
        })[];
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        customerId: string;
        subtotal: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
        paymentMethod: import("@prisma/client").$Enums.PaymentMethod;
        truckLoadId: string;
        saleNumber: number;
    })[]>;
    voidSale(id: string, userId: string): Promise<{
        message: string;
    }>;
}
