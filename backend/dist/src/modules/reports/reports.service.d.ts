import { PrismaService } from '../../prisma/prisma.service';
export declare class ReportsService {
    private prisma;
    constructor(prisma: PrismaService);
    getDailySales(from: string, to: string): Promise<{
        summary: {
            totalRevenue: number;
            totalOrders: number;
            totalItemsSold: number;
            averageOrderValue: number;
        };
        daily: {
            date: string;
            revenue: number;
            orderCount: number;
            itemsSold: number;
            cost: number;
            profit: number;
        }[];
    }>;
    getProfitReport(from: string, to: string): Promise<{
        totalRevenue: number;
        totalCost: number;
        grossProfit: number;
        margin: number;
        byProduct: {
            profit: number;
            productName: string;
            revenue: number;
            cost: number;
            unitsSold: number;
            productId: string;
        }[];
    }>;
    getSalesByCategory(): Promise<{
        id: string;
        name: string;
        type: string;
        customerCount: number;
        totalSales: number;
        thisMonthSales: number;
    }[]>;
    getCustomerDebtReport(): Promise<{
        totalOutstandingDebt: number;
        customerCount: number;
        customers: {
            id: string;
            storeName: string;
            contactName: string;
            phone: string;
            outstandingDebt: number;
            creditLimit: number;
            creditUsagePercent: number | null;
            lastPayment: {
                createdAt: Date;
                amount: import("@prisma/client-runtime-utils").Decimal;
            };
            pendingOrders: number;
        }[];
    }>;
    getDriverReport(from: string, to: string, driverId?: string): Promise<{
        summary: {
            totalLoads: number;
            totalLoadedQty: number;
            totalSoldQty: number;
            totalReturnedQty: number;
            totalDamagedQty: number;
            totalSalesRevenue: number;
            totalSaleCount: number;
            paymentBreakdown: Record<string, {
                count: number;
                amount: number;
            }>;
        };
        drivers: {
            driverId: string;
            driverName: string;
            phone: string | null;
            loads: Array<any>;
            summary: {
                totalLoads: number;
                loaded: number;
                sold: number;
                returned: number;
                damaged: number;
                totalRevenue: number;
                saleCount: number;
                paymentBreakdown: Record<string, {
                    count: number;
                    amount: number;
                }>;
            };
        }[];
    }>;
}
