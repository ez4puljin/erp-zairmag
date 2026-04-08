import { PrismaService } from '../../prisma/prisma.service';
export declare class DriversService {
    private prisma;
    constructor(prisma: PrismaService);
    findAll(): Promise<{
        id: string;
        email: string;
        phone: string | null;
        firstName: string;
        lastName: string;
        isActive: boolean;
        deliveryAssignments: {
            id: string;
            orderId: string;
            scheduledDate: Date;
        }[];
    }[]>;
    findOne(id: string): Promise<{
        id: string;
        email: string;
        phone: string | null;
        firstName: string;
        lastName: string;
        isActive: boolean;
        createdAt: Date;
    }>;
    getActiveRoutes(): Promise<{
        driverId: string;
        driverName: string;
        phone: string | null;
        activeDeliveries: {
            routeId: string;
            orderId: string;
            orderNumber: number;
            status: import("@prisma/client").$Enums.OrderStatus;
            customer: {
                phone: string;
                storeName: string;
                address: string;
                latitude: import("@prisma/client-runtime-utils").Decimal | null;
                longitude: import("@prisma/client-runtime-utils").Decimal | null;
            };
            stopSequence: number;
            scheduledDate: Date;
        }[];
        totalActiveDeliveries: number;
    }[]>;
    getDriverDeliveries(driverId: string, date?: string): Promise<({
        order: {
            customer: {
                phone: string;
                storeName: string;
                address: string;
                latitude: import("@prisma/client-runtime-utils").Decimal | null;
                longitude: import("@prisma/client-runtime-utils").Decimal | null;
            };
            items: ({
                product: {
                    name: string;
                    unit: import("@prisma/client").$Enums.ProductUnit;
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
    })[]>;
    updateDelivery(driverId: string, orderId: string, data: {
        deliveryNotes?: string;
        proofOfDelivery?: string;
    }): Promise<{
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
    }>;
    createDriver(dto: {
        firstName: string;
        lastName: string;
        phone: string;
        email: string;
        password: string;
    }): Promise<{
        id: string;
        email: string;
        phone: string | null;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
        createdAt: Date;
    }>;
    updateDriver(id: string, dto: {
        firstName?: string;
        lastName?: string;
        phone?: string;
        email?: string;
    }): Promise<{
        id: string;
        email: string;
        phone: string | null;
        firstName: string;
        lastName: string;
        role: import("@prisma/client").$Enums.Role;
        isActive: boolean;
    }>;
    toggleDriverActive(id: string): Promise<{
        id: string;
        firstName: string;
        lastName: string;
        isActive: boolean;
    }>;
    resetPassword(id: string, newPassword: string): Promise<{
        message: string;
    }>;
}
