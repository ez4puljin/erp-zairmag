import { SupplierPayablesService } from './supplier-payables.service';
import { CreateSupplierPaymentDto } from './dto/create-supplier-payment.dto';
export declare class SupplierPayablesController {
    private readonly service;
    constructor(service: SupplierPayablesService);
    createPayment(dto: CreateSupplierPaymentDto, req: any): Promise<{
        supplier: {
            name: string;
        };
    } & {
        id: string;
        createdAt: Date;
        type: import("@prisma/client").$Enums.SupplierPaymentType;
        description: string | null;
        supplierId: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        method: import("@prisma/client").$Enums.PaymentMethod | null;
        createdById: string;
        date: Date;
        referenceNo: string | null;
    }>;
    getPayments(supplierId?: string): Promise<({
        supplier: {
            name: string;
        };
        createdBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        type: import("@prisma/client").$Enums.SupplierPaymentType;
        description: string | null;
        supplierId: string;
        amount: import("@prisma/client-runtime-utils").Decimal;
        method: import("@prisma/client").$Enums.PaymentMethod | null;
        createdById: string;
        date: Date;
        referenceNo: string | null;
    })[]>;
    getSummary(startDate: string, endDate: string, supplierId?: string): Promise<{
        id: string;
        name: string;
        openingBalance: number;
        totalCredit: number;
        totalDebit: number;
        closingBalance: number;
    }[]>;
    getLedger(supplierId: string, startDate: string, endDate: string): Promise<{
        supplier: {
            id: string;
            name: string;
            phone: string | null;
        };
        period: {
            startDate: string;
            endDate: string;
        };
        openingBalance: {
            debit: number;
            credit: number;
        };
        entries: {
            date: string;
            referenceNo: string;
            description: string;
            type: string;
            debit: number;
            credit: number;
            runningBalance: number;
        }[];
        totals: {
            debit: number;
            credit: number;
        };
        closingBalance: {
            debit: number;
            credit: number;
        };
    }>;
}
