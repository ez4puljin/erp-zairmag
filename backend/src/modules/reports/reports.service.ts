import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus } from '@prisma/client';

@Injectable()
export class ReportsService {
  constructor(private prisma: PrismaService) {}

  async getDailySales(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { gte: fromDate, lte: toDate },
      },
      include: {
        items: {
          include: {
            product: { select: { costPrice: true } },
          },
        },
      },
    });

    // Also fetch truck sales for the same date range
    const truckSales = await this.prisma.truckSale.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        items: {
          include: {
            product: { select: { costPrice: true } },
          },
        },
      },
    });

    // Aggregate by day
    const dailyMap = new Map<
      string,
      { revenue: number; orderCount: number; itemsSold: number; cost: number }
    >();

    let totalRevenue = 0;
    let totalOrders = 0;
    let totalItemsSold = 0;

    for (const order of orders) {
      const day = order.deliveredAt!.toISOString().split('T')[0];

      if (!dailyMap.has(day)) {
        dailyMap.set(day, { revenue: 0, orderCount: 0, itemsSold: 0, cost: 0 });
      }

      const dayData = dailyMap.get(day)!;
      dayData.orderCount++;
      dayData.revenue += Number(order.totalAmount);
      totalOrders++;
      totalRevenue += Number(order.totalAmount);

      for (const item of order.items) {
        dayData.itemsSold += item.quantity;
        // Use lineTotal (snapshotted revenue) and current costPrice as best approximation
        // Note: For accurate cost tracking, costPrice should be snapshotted at order time
        dayData.cost += Number(item.product.costPrice) * (item.deliveredQty ?? item.quantity);
        totalItemsSold += (item.deliveredQty ?? item.quantity);
      }
    }

    // Include truck sales in the daily aggregation
    for (const sale of truckSales) {
      const day = sale.createdAt.toISOString().split('T')[0];

      if (!dailyMap.has(day)) {
        dailyMap.set(day, { revenue: 0, orderCount: 0, itemsSold: 0, cost: 0 });
      }

      const dayData = dailyMap.get(day)!;
      dayData.orderCount++;
      dayData.revenue += Number(sale.totalAmount);
      totalOrders++;
      totalRevenue += Number(sale.totalAmount);

      for (const item of sale.items) {
        dayData.itemsSold += item.quantity;
        dayData.cost += Number(item.product.costPrice) * item.quantity;
        totalItemsSold += item.quantity;
      }
    }

    const daily = Array.from(dailyMap.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([date, data]) => ({
        date,
        revenue: data.revenue,
        orderCount: data.orderCount,
        itemsSold: data.itemsSold,
        cost: data.cost,
        profit: data.revenue - data.cost,
      }));

    return {
      summary: {
        totalRevenue,
        totalOrders,
        totalItemsSold,
        averageOrderValue: totalOrders > 0 ? totalRevenue / totalOrders : 0,
      },
      daily,
    };
  }

  async getProfitReport(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const orders = await this.prisma.order.findMany({
      where: {
        status: OrderStatus.DELIVERED,
        deliveredAt: { gte: fromDate, lte: toDate },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, costPrice: true } },
          },
        },
      },
    });

    // Also fetch truck sales for profit calculation
    const truckSales = await this.prisma.truckSale.findMany({
      where: {
        createdAt: { gte: fromDate, lte: toDate },
      },
      include: {
        items: {
          include: {
            product: { select: { id: true, name: true, costPrice: true } },
          },
        },
      },
    });

    const productMap = new Map<
      string,
      {
        productName: string;
        revenue: number;
        cost: number;
        unitsSold: number;
      }
    >();

    let totalRevenue = 0;
    let totalCost = 0;

    for (const order of orders) {
      for (const item of order.items) {
        const pid = item.productId;
        if (!productMap.has(pid)) {
          productMap.set(pid, {
            productName: item.product.name,
            revenue: 0,
            cost: 0,
            unitsSold: 0,
          });
        }

        const pData = productMap.get(pid)!;
        const deliveredQty = item.deliveredQty ?? item.quantity;
        const lineRevenue = Number(item.unitPrice) * deliveredQty;
        const lineCost = Number(item.product.costPrice) * deliveredQty;

        pData.revenue += lineRevenue;
        pData.cost += lineCost;
        pData.unitsSold += deliveredQty;
        totalRevenue += lineRevenue;
        totalCost += lineCost;
      }
    }

    // Include truck sale items in profit calculation
    for (const sale of truckSales) {
      for (const item of sale.items) {
        const pid = item.productId;
        if (!productMap.has(pid)) {
          productMap.set(pid, {
            productName: item.product.name,
            revenue: 0,
            cost: 0,
            unitsSold: 0,
          });
        }

        const pData = productMap.get(pid)!;
        const lineRevenue = Number(item.unitPrice) * item.quantity;
        const lineCost = Number(item.product.costPrice) * item.quantity;

        pData.revenue += lineRevenue;
        pData.cost += lineCost;
        pData.unitsSold += item.quantity;
        totalRevenue += lineRevenue;
        totalCost += lineCost;
      }
    }

    const grossProfit = totalRevenue - totalCost;

    return {
      totalRevenue,
      totalCost,
      grossProfit,
      margin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      byProduct: Array.from(productMap.entries())
        .map(([productId, data]) => ({
          productId,
          ...data,
          profit: data.revenue - data.cost,
        }))
        .sort((a, b) => b.profit - a.profit),
    };
  }

  async getSalesByCategory() {
    const categories = await this.prisma.customerCategory.findMany({
      include: {
        customers: {
          include: {
            orders: {
              where: { status: OrderStatus.DELIVERED },
              select: { totalAmount: true, createdAt: true },
            },
          },
        },
      },
    });

    return categories.map((cat) => ({
      id: cat.id,
      name: cat.name,
      type: cat.type,
      customerCount: cat.customers.length,
      totalSales: cat.customers.reduce(
        (sum, c) =>
          sum + c.orders.reduce((s, o) => s + Number(o.totalAmount), 0),
        0,
      ),
      thisMonthSales: cat.customers.reduce(
        (sum, c) =>
          sum +
          c.orders
            .filter((o) => {
              const d = new Date(o.createdAt);
              const now = new Date();
              return (
                d.getMonth() === now.getMonth() &&
                d.getFullYear() === now.getFullYear()
              );
            })
            .reduce((s, o) => s + Number(o.totalAmount), 0),
        0,
      ),
    }));
  }

  async getCustomerDebtReport() {
    const customers = await this.prisma.customer.findMany({
      where: { isActive: true, deletedAt: null },
      select: {
        id: true,
        storeName: true,
        contactName: true,
        phone: true,
        outstandingDebt: true,
        creditLimit: true,
        payments: {
          orderBy: { createdAt: 'desc' },
          take: 1,
          select: { createdAt: true, amount: true },
        },
        _count: {
          select: {
            orders: {
              where: {
                status: { in: [OrderStatus.APPROVED, OrderStatus.SHIPPING] },
              },
            },
          },
        },
      },
      orderBy: { outstandingDebt: 'desc' },
    });

    const totalDebt = customers.reduce(
      (sum, c) => sum + Number(c.outstandingDebt),
      0,
    );

    return {
      totalOutstandingDebt: totalDebt,
      customerCount: customers.length,
      customers: customers.map((c) => ({
        id: c.id,
        storeName: c.storeName,
        contactName: c.contactName,
        phone: c.phone,
        outstandingDebt: Number(c.outstandingDebt),
        creditLimit: Number(c.creditLimit),
        creditUsagePercent:
          Number(c.creditLimit) > 0
            ? (Number(c.outstandingDebt) / Number(c.creditLimit)) * 100
            : null,
        lastPayment: c.payments[0] || null,
        pendingOrders: c._count.orders,
      })),
    };
  }

  async getDriverReport(from: string, to: string, driverId?: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const truckLoads = await this.prisma.truckLoad.findMany({
      where: {
        loadDate: { gte: fromDate, lte: toDate },
        status: { in: ['DISPATCHED', 'COMPLETED'] },
        ...(driverId ? { driverId } : {}),
      },
      include: {
        driver: { select: { id: true, firstName: true, lastName: true, phone: true } },
        items: {
          select: { loadedQty: true, soldQty: true, returnedQty: true, damagedQty: true },
        },
        sales: {
          select: {
            id: true,
            saleNumber: true,
            totalAmount: true,
            paymentMethod: true,
            notes: true,
            createdAt: true,
            customer: { select: { id: true, storeName: true, phone: true } },
            items: {
              select: {
                quantity: true,
                unitPrice: true,
                lineTotal: true,
                product: { select: { id: true, name: true, sku: true } },
              },
            },
          },
        },
      },
      orderBy: [{ driverId: 'asc' }, { loadDate: 'asc' }],
    });

    // Helper: parse combined payments from notes field
    // Format: "COMBINED:CASH:5000,CARD:3000" optionally prefixed/suffixed by other notes
    const parseCombined = (notes: string | null | undefined): Array<{ method: string; amount: number }> => {
      if (!notes) return [];
      const m = notes.match(/COMBINED:([^|]+)/);
      if (!m) return [];
      const segments = m[1].trim().split(',');
      return segments
        .map((p) => {
          const [method, amount] = p.split(':').map((s) => s.trim());
          return { method, amount: Number(amount) || 0 };
        })
        .filter((p) => p.method && p.amount > 0);
    };

    type Breakdown = Record<string, { count: number; amount: number }>;
    const initBreakdown = (): Breakdown => ({
      CASH: { count: 0, amount: 0 },
      BANK_TRANSFER: { count: 0, amount: 0 },
      MOBILE_MONEY: { count: 0, amount: 0 },
      CARD: { count: 0, amount: 0 },
      CHECK: { count: 0, amount: 0 },
      CREDIT: { count: 0, amount: 0 },
      COMBINED: { count: 0, amount: 0 },
    });

    const addToBreakdown = (b: Breakdown, method: string, amount: number) => {
      if (!b[method]) b[method] = { count: 0, amount: 0 };
      b[method].count += 1;
      b[method].amount += amount;
    };

    // Aggregate per load
    const driversMap = new Map<
      string,
      {
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
          paymentBreakdown: Breakdown;
        };
      }
    >();

    let overallLoaded = 0;
    let overallSold = 0;
    let overallReturned = 0;
    let overallDamaged = 0;
    let overallRevenue = 0;
    let overallSaleCount = 0;
    const overallBreakdown = initBreakdown();

    for (const load of truckLoads) {
      const driverIdKey = load.driverId;
      const driverName =
        load.driver
          ? `${load.driver.lastName ?? ''} ${load.driver.firstName ?? ''}`.trim() || 'Жолооч'
          : 'Жолооч';

      if (!driversMap.has(driverIdKey)) {
        driversMap.set(driverIdKey, {
          driverId: driverIdKey,
          driverName,
          phone: load.driver?.phone ?? null,
          loads: [],
          summary: {
            totalLoads: 0,
            loaded: 0,
            sold: 0,
            returned: 0,
            damaged: 0,
            totalRevenue: 0,
            saleCount: 0,
            paymentBreakdown: initBreakdown(),
          },
        });
      }
      const d = driversMap.get(driverIdKey)!;

      // Per-load metrics
      let loaded = 0, sold = 0, returned = 0, damaged = 0;
      for (const it of load.items) {
        loaded += it.loadedQty ?? 0;
        sold += it.soldQty ?? 0;
        returned += it.returnedQty ?? 0;
        damaged += it.damagedQty ?? 0;
      }

      let salesRevenue = 0;
      const loadBreakdown = initBreakdown();

      for (const sale of load.sales) {
        const amount = Number(sale.totalAmount ?? 0);
        salesRevenue += amount;
        overallRevenue += amount;
        overallSaleCount += 1;
        d.summary.saleCount += 1;
        d.summary.totalRevenue += amount;

        const method = sale.paymentMethod;
        if (method === 'COMBINED') {
          const parsed = parseCombined(sale.notes);
          if (parsed.length > 0) {
            // Distribute amounts to individual methods
            for (const p of parsed) {
              addToBreakdown(loadBreakdown, p.method, p.amount);
              addToBreakdown(d.summary.paymentBreakdown, p.method, p.amount);
              addToBreakdown(overallBreakdown, p.method, p.amount);
            }
          } else {
            // Fallback - count as COMBINED
            addToBreakdown(loadBreakdown, 'COMBINED', amount);
            addToBreakdown(d.summary.paymentBreakdown, 'COMBINED', amount);
            addToBreakdown(overallBreakdown, 'COMBINED', amount);
          }
        } else {
          addToBreakdown(loadBreakdown, method, amount);
          addToBreakdown(d.summary.paymentBreakdown, method, amount);
          addToBreakdown(overallBreakdown, method, amount);
        }
      }

      d.loads.push({
        loadId: load.id,
        loadNumber: load.loadNumber,
        loadDate: load.loadDate.toISOString().split('T')[0],
        status: load.status,
        loaded, sold, returned, damaged,
        salesCount: load.sales.length,
        salesRevenue,
        paymentBreakdown: loadBreakdown,
        sales: load.sales.map((s: any) => ({
          id: s.id,
          saleNumber: s.saleNumber,
          totalAmount: Number(s.totalAmount ?? 0),
          paymentMethod: s.paymentMethod,
          notes: s.notes,
          createdAt: s.createdAt,
          customer: s.customer,
          items: (s.items ?? []).map((i: any) => ({
            productName: i.product?.name ?? '-',
            sku: i.product?.sku,
            quantity: i.quantity,
            unitPrice: Number(i.unitPrice ?? 0),
            lineTotal: Number(i.lineTotal ?? 0),
          })),
        })),
      });

      d.summary.totalLoads += 1;
      d.summary.loaded += loaded;
      d.summary.sold += sold;
      d.summary.returned += returned;
      d.summary.damaged += damaged;

      overallLoaded += loaded;
      overallSold += sold;
      overallReturned += returned;
      overallDamaged += damaged;
    }

    const drivers = Array.from(driversMap.values()).sort(
      (a, b) => b.summary.totalRevenue - a.summary.totalRevenue,
    );

    return {
      summary: {
        totalLoads: truckLoads.length,
        totalLoadedQty: overallLoaded,
        totalSoldQty: overallSold,
        totalReturnedQty: overallReturned,
        totalDamagedQty: overallDamaged,
        totalSalesRevenue: overallRevenue,
        totalSaleCount: overallSaleCount,
        paymentBreakdown: overallBreakdown,
      },
      drivers,
    };
  }
}
