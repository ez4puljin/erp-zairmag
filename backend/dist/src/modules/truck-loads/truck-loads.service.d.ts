import { PrismaService } from '../../prisma/prisma.service';
import { CreateTruckLoadDto } from './dto/create-truck-load.dto';
import { UpdateTruckLoadDto } from './dto/update-truck-load.dto';
import { SubmitReturnDto } from './dto/submit-return.dto';
import { Prisma } from '@prisma/client';
export declare class TruckLoadsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateTruckLoadDto, createdById: string): Promise<{
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
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
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }>;
    update(id: string, dto: UpdateTruckLoadDto): Promise<({
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
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
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }) | null>;
    dispatch(id: string, userId: string): Promise<{
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
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
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }>;
    submitReturn(id: string, dto: SubmitReturnDto, userId: string): Promise<{
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
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
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }>;
    verifyReturn(id: string, userId: string): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
        driver: {
            id: string;
            phone: string | null;
            firstName: string;
            lastName: string;
        };
        returnVerifiedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }>;
    requestCompletion(id: string, userId: string): Promise<{
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
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
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
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }>;
    approveCompletion(id: string, dto: SubmitReturnDto, userId: string): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
        driver: {
            id: string;
            phone: string | null;
            firstName: string;
            lastName: string;
        };
        returnVerifiedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }>;
    addItems(id: string, items: {
        productId: string;
        loadedQty: number;
    }[], userId: string): Promise<({
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
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
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }) | null>;
    findAll(query: {
        status?: string;
        driverId?: string;
        dateFrom?: string;
        dateTo?: string;
        page?: number;
        limit?: number;
    }): Promise<{
        data: ({
            _count: {
                sales: number;
            };
            items: ({
                product: {
                    id: string;
                    name: string;
                    sku: string;
                    unit: import("@prisma/client").$Enums.ProductUnit;
                    unitsPerBox: number;
                    sellingPrice: Prisma.Decimal;
                };
            } & {
                id: string;
                productId: string;
                returnedQty: number;
                truckLoadId: string;
                loadedQty: number;
                soldQty: number;
                damagedQty: number;
            })[];
            driver: {
                id: string;
                phone: string | null;
                firstName: string;
                lastName: string;
            };
            sales: {
                id: string;
                customerId: string;
                totalAmount: Prisma.Decimal;
                saleNumber: number;
            }[];
        } & {
            id: string;
            createdAt: Date;
            updatedAt: Date;
            notes: string | null;
            status: import("@prisma/client").$Enums.TruckLoadStatus;
            createdById: string;
            driverId: string;
            completedAt: Date | null;
            loadNumber: number;
            loadDate: Date;
            vehicleInfo: string | null;
            dispatchedAt: Date | null;
            returnVerifiedById: string | null;
            returnVerifiedAt: Date | null;
            returnNotes: string | null;
        })[];
        meta: {
            total: number;
            page: number;
            limit: number;
            totalPages: number;
        };
    }>;
    findOne(id: string): Promise<{
        createdBy: {
            id: string;
            firstName: string;
            lastName: string;
        };
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
                imageUrl: string | null;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
        driver: {
            id: string;
            phone: string | null;
            firstName: string;
            lastName: string;
        };
        returnVerifiedBy: {
            id: string;
            firstName: string;
            lastName: string;
        } | null;
        sales: ({
            customer: {
                id: string;
                storeName: string;
                contactName: string;
            };
            items: ({
                product: {
                    id: string;
                    name: string;
                    sku: string;
                    unitsPerBox: number;
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
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }>;
    getAnyActiveLoad(): Promise<({
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
                imageUrl: string | null;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
        driver: {
            id: string;
            phone: string | null;
            firstName: string;
            lastName: string;
        };
        sales: ({
            customer: {
                id: string;
                storeName: string;
                contactName: string;
            };
            items: ({
                product: {
                    id: string;
                    name: string;
                    sku: string;
                    unitsPerBox: number;
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
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }) | null>;
    getDriverActiveLoad(driverId: string): Promise<({
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                costPrice: Prisma.Decimal;
                sellingPrice: Prisma.Decimal;
                imageUrl: string | null;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
        driver: {
            id: string;
            phone: string | null;
            firstName: string;
            lastName: string;
        };
        sales: ({
            customer: {
                id: string;
                storeName: string;
                contactName: string;
            };
            items: ({
                product: {
                    id: string;
                    name: string;
                    sku: string;
                    unitsPerBox: number;
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
        })[];
    } & {
        id: string;
        createdAt: Date;
        updatedAt: Date;
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }) | null>;
    cancel(id: string, userId: string): Promise<{
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                sellingPrice: Prisma.Decimal;
            };
        } & {
            id: string;
            productId: string;
            returnedQty: number;
            truckLoadId: string;
            loadedQty: number;
            soldQty: number;
            damagedQty: number;
        })[];
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
        notes: string | null;
        status: import("@prisma/client").$Enums.TruckLoadStatus;
        createdById: string;
        driverId: string;
        completedAt: Date | null;
        loadNumber: number;
        loadDate: Date;
        vehicleInfo: string | null;
        dispatchedAt: Date | null;
        returnVerifiedById: string | null;
        returnVerifiedAt: Date | null;
        returnNotes: string | null;
    }>;
}
