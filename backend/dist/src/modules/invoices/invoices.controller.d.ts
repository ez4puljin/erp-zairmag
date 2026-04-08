import { InvoicesService } from './invoices.service';
import { PaginationDto } from '../../common/dto/pagination.dto';
export declare class InvoicesController {
    private readonly invoicesService;
    constructor(invoicesService: InvoicesService);
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
                latitude: import("@prisma/client-runtime-utils").Decimal | null;
                longitude: import("@prisma/client-runtime-utils").Decimal | null;
                creditLimit: import("@prisma/client-runtime-utils").Decimal;
                outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
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
                    costPrice: import("@prisma/client-runtime-utils").Decimal;
                    sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
                unitPrice: import("@prisma/client-runtime-utils").Decimal;
                lineTotal: import("@prisma/client-runtime-utils").Decimal;
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
            subtotal: import("@prisma/client-runtime-utils").Decimal;
            taxAmount: import("@prisma/client-runtime-utils").Decimal;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
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
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        taxAmount: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        invoiceNumber: number;
        issuedAt: Date;
        dueDate: Date | null;
    }>;
    findAll(pagination: PaginationDto, search?: string): Promise<import("../../common/dto/pagination.dto").PaginatedResponse<any>>;
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
                latitude: import("@prisma/client-runtime-utils").Decimal | null;
                longitude: import("@prisma/client-runtime-utils").Decimal | null;
                creditLimit: import("@prisma/client-runtime-utils").Decimal;
                outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
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
                unitPrice: import("@prisma/client-runtime-utils").Decimal;
                lineTotal: import("@prisma/client-runtime-utils").Decimal;
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
            subtotal: import("@prisma/client-runtime-utils").Decimal;
            taxAmount: import("@prisma/client-runtime-utils").Decimal;
            totalAmount: import("@prisma/client-runtime-utils").Decimal;
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
        subtotal: import("@prisma/client-runtime-utils").Decimal;
        taxAmount: import("@prisma/client-runtime-utils").Decimal;
        totalAmount: import("@prisma/client-runtime-utils").Decimal;
        invoiceNumber: number;
        issuedAt: Date;
        dueDate: Date | null;
    }>;
}
