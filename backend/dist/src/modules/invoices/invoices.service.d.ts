import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { PaginationDto, PaginatedResponse } from '../../common/dto/pagination.dto';
export declare class InvoicesService {
    private prisma;
    constructor(prisma: PrismaService);
    generate(orderId: string): Promise<{
        order: {
            customer: {
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
                latitude: Prisma.Decimal | null;
                longitude: Prisma.Decimal | null;
                creditLimit: Prisma.Decimal;
                outstandingDebt: Prisma.Decimal;
                pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
                deletedAt: Date | null;
                userId: string | null;
                customerCategoryId: string | null;
            };
            items: ({
                product: {
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
                };
            } & {
                id: string;
                productId: string;
                orderId: string;
                quantity: number;
                unitPrice: Prisma.Decimal;
                lineTotal: Prisma.Decimal;
                productVersion: number;
                deliveredQty: number | null;
                returnedQty: number;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            customerId: string;
            status: import("@prisma/client").$Enums.OrderStatus;
            orderNumber: number;
            subtotal: Prisma.Decimal;
            taxAmount: Prisma.Decimal;
            totalAmount: Prisma.Decimal;
            createdById: string;
            approvedById: string | null;
            approvedAt: Date | null;
            deliveredAt: Date | null;
            cancellationRequestedAt: Date | null;
            cancellationRequestNote: string | null;
            cancelledAt: Date | null;
            cancellationNote: string | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            receiptPrintedAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        orderId: string;
        subtotal: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
        invoiceNumber: number;
        issuedAt: Date;
        dueDate: Date | null;
    }>;
    findAll(pagination: PaginationDto, search?: string): Promise<PaginatedResponse<any>>;
    findOne(id: string): Promise<{
        order: {
            customer: {
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
                latitude: Prisma.Decimal | null;
                longitude: Prisma.Decimal | null;
                creditLimit: Prisma.Decimal;
                outstandingDebt: Prisma.Decimal;
                pricingTier: import("@prisma/client").$Enums.PricingTierLevel;
                deletedAt: Date | null;
                userId: string | null;
                customerCategoryId: string | null;
            };
            deliveryRoute: ({
                driver: {
                    id: string;
                    phone: string | null;
                    firstName: string;
                    lastName: string;
                };
            } & {
                id: string;
                createdAt: Date;
                updatedAt: Date;
                orderId: string;
                driverId: string;
                scheduledDate: Date;
                stopSequence: number;
                departedAt: Date | null;
                arrivedAt: Date | null;
                completedAt: Date | null;
                deliveryNotes: string | null;
                proofOfDelivery: string | null;
            }) | null;
            createdBy: {
                id: string;
                email: string;
                firstName: string;
                lastName: string;
            };
            items: ({
                product: {
                    id: string;
                    name: string;
                    sku: string;
                    unit: import("@prisma/client").$Enums.ProductUnit;
                    imageUrl: string | null;
                };
            } & {
                id: string;
                productId: string;
                orderId: string;
                quantity: number;
                unitPrice: Prisma.Decimal;
                lineTotal: Prisma.Decimal;
                productVersion: number;
                deliveredQty: number | null;
                returnedQty: number;
            })[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            customerId: string;
            status: import("@prisma/client").$Enums.OrderStatus;
            orderNumber: number;
            subtotal: Prisma.Decimal;
            taxAmount: Prisma.Decimal;
            totalAmount: Prisma.Decimal;
            createdById: string;
            approvedById: string | null;
            approvedAt: Date | null;
            deliveredAt: Date | null;
            cancellationRequestedAt: Date | null;
            cancellationRequestNote: string | null;
            cancelledAt: Date | null;
            cancellationNote: string | null;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            receiptPrintedAt: Date | null;
        };
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        orderId: string;
        subtotal: Prisma.Decimal;
        taxAmount: Prisma.Decimal;
        totalAmount: Prisma.Decimal;
        invoiceNumber: number;
        issuedAt: Date;
        dueDate: Date | null;
    }>;
}
