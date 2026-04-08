import { PrismaService } from '../../prisma/prisma.service';
import { CreateCashClosingDto } from './dto/create-cash-closing.dto';
export declare class CashClosingsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    create(dto: CreateCashClosingDto, userId: string): Promise<{
        closedBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
        closingDate: Date;
        totalCashIn: import("@prisma/client-runtime-utils").Decimal;
        totalCashOut: import("@prisma/client-runtime-utils").Decimal;
        totalBankIn: import("@prisma/client-runtime-utils").Decimal;
        closingBalance: import("@prisma/client-runtime-utils").Decimal;
        closedById: string;
    }>;
    findAll(dateFrom?: string, dateTo?: string): Promise<({
        closedBy: {
            firstName: string;
            lastName: string;
        };
    } & {
        id: string;
        createdAt: Date;
        notes: string | null;
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
        closingDate: Date;
        totalCashIn: import("@prisma/client-runtime-utils").Decimal;
        totalCashOut: import("@prisma/client-runtime-utils").Decimal;
        totalBankIn: import("@prisma/client-runtime-utils").Decimal;
        closingBalance: import("@prisma/client-runtime-utils").Decimal;
        closedById: string;
    })[]>;
    getLatest(): Promise<{
        id: string;
        createdAt: Date;
        notes: string | null;
        openingBalance: import("@prisma/client-runtime-utils").Decimal;
        closingDate: Date;
        totalCashIn: import("@prisma/client-runtime-utils").Decimal;
        totalCashOut: import("@prisma/client-runtime-utils").Decimal;
        totalBankIn: import("@prisma/client-runtime-utils").Decimal;
        closingBalance: import("@prisma/client-runtime-utils").Decimal;
        closedById: string;
    } | null>;
    getDailySummary(date: string): Promise<{
        date: string;
        openingBalance: number;
        totalCashIn: number;
        totalBankIn: number;
        totalCashOut: number;
        suggestedClosingBalance: number;
        cashPayments: {
            id: string;
            customer: string;
            amount: number;
            ref: string | null;
        }[];
        bankPayments: {
            id: string;
            customer: string;
            amount: number;
            ref: string | null;
        }[];
        purchases: {
            id: string;
            supplier: string;
            amount: number;
        }[];
    }>;
}
