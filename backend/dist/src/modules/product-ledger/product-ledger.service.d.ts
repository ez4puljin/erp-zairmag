import { PrismaService } from '../../prisma/prisma.service';
import { ProductLedgerQueryDto } from './dto/product-ledger-query.dto';
export declare class ProductLedgerService {
    private prisma;
    constructor(prisma: PrismaService);
    getLedger(query: ProductLedgerQueryDto): Promise<{
        products: never[];
        totals: null;
    } | {
        products: {
            product: {
                id: string;
                sku: string;
                name: string;
                unit: import("@prisma/client").$Enums.ProductUnit;
                costPrice: number;
                sellingPrice: number;
            };
            openingQty: number;
            openingAmount: number;
            incomeQty: number;
            incomeAmount: number;
            expenseQty: number;
            expenseAmount: number;
            closingQty: number;
            closingAmount: number;
            unitCost: number;
            transactions: {
                id: string;
                date: Date;
                description: string;
                reason: import("@prisma/client").$Enums.StockMovementReason;
                incomeQty: number;
                incomeAmount: number;
                expenseQty: number;
                expenseAmount: number;
                runningQty: number;
                runningAmount: number;
            }[];
        }[];
        totals: {
            openingQty: number;
            openingAmount: number;
            incomeQty: number;
            incomeAmount: number;
            expenseQty: number;
            expenseAmount: number;
            closingQty: number;
            closingAmount: number;
        };
    }>;
}
