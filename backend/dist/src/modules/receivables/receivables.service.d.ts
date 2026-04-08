import { PrismaService } from '../../prisma/prisma.service';
export declare class ReceivablesService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getCustomerLedger(customerId: string, dateFrom?: string, dateTo?: string): Promise<{
        customer: {
            id: string;
            phone: string;
            storeName: string;
            contactName: string;
            creditLimit: import("@prisma/client-runtime-utils").Decimal;
            outstandingDebt: import("@prisma/client-runtime-utils").Decimal;
        } | null;
        openingBalance: number;
        closingBalance: number;
        totalDebit: number;
        totalCredit: number;
        entries: {
            id: string;
            date: Date;
            description: string;
            debit: number;
            credit: number;
            balance: number;
            paymentMethod: import("@prisma/client").$Enums.PaymentMethod | null;
            paymentRef: string | null;
        }[];
    }>;
    getReceivablesSummary(dateFrom?: string, dateTo?: string, customerId?: string, categoryId?: string): Promise<{
        id: string;
        storeName: string;
        contactName: string;
        phone: string;
        outstandingDebt: number;
        creditLimit: number;
        openingBalance: number;
        periodDebit: number;
        periodCredit: number;
        closingBalance: number;
        category: string | null;
    }[]>;
    getDebtAging(): Promise<any[]>;
}
