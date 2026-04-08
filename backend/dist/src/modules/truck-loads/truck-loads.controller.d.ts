import { TruckLoadsService } from './truck-loads.service';
import { CreateTruckLoadDto } from './dto/create-truck-load.dto';
import { UpdateTruckLoadDto } from './dto/update-truck-load.dto';
import { SubmitReturnDto } from './dto/submit-return.dto';
export declare class TruckLoadsController {
    private readonly service;
    constructor(service: TruckLoadsService);
    create(dto: CreateTruckLoadDto, req: any): Promise<{
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
    dispatch(id: string, req: any): Promise<{
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
    addItems(id: string, body: {
        items: {
            productId: string;
            loadedQty: number;
        }[];
    }, req: any): Promise<({
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
    submitReturn(id: string, dto: SubmitReturnDto, req: any): Promise<{
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
    verifyReturn(id: string, req: any): Promise<{
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
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
    requestCompletion(id: string, req: any): Promise<{
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
    approveCompletion(id: string, dto: SubmitReturnDto, req: any): Promise<{
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
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
    cancel(id: string, req: any): Promise<{
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
    findAll(status?: string, driverId?: string, dateFrom?: string, dateTo?: string, page?: string, limit?: string): Promise<{
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
                    sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
                totalAmount: import("@prisma/client-runtime-utils").Decimal;
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
    getDriverActiveLoad(req: any): Promise<({
        items: ({
            product: {
                id: string;
                name: string;
                sku: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                unitsPerBox: number;
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
                costPrice: import("@prisma/client-runtime-utils").Decimal;
                sellingPrice: import("@prisma/client-runtime-utils").Decimal;
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
}
