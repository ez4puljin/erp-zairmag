import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { OrderStatus, PaymentStatus, Prisma } from '@prisma/client';

export interface SalesRegisterParams {
  from: string;
  to: string;
  customerId?: string;
  productId?: string;
  paymentMethod?: string;
  channel?: 'ALL' | 'ORDER' | 'TRUCK';
  driverId?: string;
}

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
                product: { select: { id: true, name: true, barcodes: { select: { code: true } } } },
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
            barcode: i.product?.barcodes?.[0]?.code ?? null,
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

  /**
   * Sales register — unified per-transaction list of DELIVERED Orders + TruckSales
   * over a date range, filterable by customer/product/payment method/channel/driver.
   * Returns each sale with its line breakdown plus totals and by-method/product/customer
   * aggregates (computed over the FULL matched set, not the capped items list).
   */
  async getSalesRegister(params: SalesRegisterParams) {
    const { from, to, customerId, productId, paymentMethod, channel = 'ALL', driverId } = params;
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const includeOrders = channel === 'ALL' || channel === 'ORDER';
    const includeTruck = channel === 'ALL' || channel === 'TRUCK';
    // driverId filters truck sales (orders have no driver); when set, suppress orders.
    const ordersEnabled = includeOrders && !driverId;

    const orderWhere: Prisma.OrderWhereInput = {
      status: OrderStatus.DELIVERED,
      deliveredAt: { gte: fromDate, lte: toDate },
      ...(customerId ? { customerId } : {}),
      ...(paymentMethod ? { paymentMethod: paymentMethod as any } : {}),
      ...(productId ? { items: { some: { productId } } } : {}),
    };
    const truckWhere: Prisma.TruckSaleWhereInput = {
      createdAt: { gte: fromDate, lte: toDate },
      ...(customerId ? { customerId } : {}),
      ...(paymentMethod ? { paymentMethod: paymentMethod as any } : {}),
      ...(productId ? { items: { some: { productId } } } : {}),
      ...(driverId ? { truckLoad: { driverId } } : {}),
    };

    const [orders, truckSales] = await Promise.all([
      ordersEnabled
        ? this.prisma.order.findMany({
            where: orderWhere,
            include: {
              customer: { select: { id: true, storeName: true } },
              createdBy: { select: { firstName: true, lastName: true } },
              items: { include: { product: { select: { id: true, name: true, barcodes: { select: { code: true } } } } } },
            },
            orderBy: { deliveredAt: 'asc' },
          })
        : Promise.resolve([]),
      includeTruck
        ? this.prisma.truckSale.findMany({
            where: truckWhere,
            include: {
              customer: { select: { id: true, storeName: true } },
              truckLoad: { select: { driver: { select: { firstName: true, lastName: true } } } },
              items: { include: { product: { select: { id: true, name: true, barcodes: { select: { code: true } } } } } },
            },
            orderBy: { createdAt: 'asc' },
          })
        : Promise.resolve([]),
    ]);

    type Row = {
      id: string;
      channel: 'ORDER' | 'TRUCK';
      number: string;
      date: Date;
      customerId: string | null;
      customerName: string;
      sellerName: string;
      paymentMethod: string | null;
      itemCount: number;
      subtotal: number;
      total: number;
      /** Түгээлтийн борлуулалтын ачилт — тайлангаас засвар руу шилжихэд хэрэгтэй. */
      truckLoadId?: string;
      lines: Array<{ productId: string; productName: string; barcode: string | null; quantity: number; unitPrice: number; lineTotal: number }>;
    };

    const rows: Row[] = [];

    for (const o of orders) {
      const lines = o.items.map((i) => ({
        productId: i.productId,
        productName: i.product?.name ?? '-',
        barcode: (i.product as any)?.barcodes?.[0]?.code ?? null,
        quantity: i.deliveredQty ?? i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.unitPrice) * (i.deliveredQty ?? i.quantity),
      }));
      rows.push({
        id: o.id,
        channel: 'ORDER',
        number: `#${o.orderNumber}`,
        date: o.deliveredAt ?? o.createdAt,
        customerId: o.customerId,
        customerName: o.customer?.storeName ?? '-',
        sellerName: `${o.createdBy?.lastName ?? ''} ${o.createdBy?.firstName ?? ''}`.trim() || '-',
        paymentMethod: o.paymentMethod ?? null,
        itemCount: lines.reduce((s, l) => s + l.quantity, 0),
        subtotal: Number(o.subtotal),
        total: Number(o.totalAmount),
        lines,
      });
    }

    for (const s of truckSales) {
      const lines = s.items.map((i) => ({
        productId: i.productId,
        productName: i.product?.name ?? '-',
        barcode: (i.product as any)?.barcodes?.[0]?.code ?? null,
        quantity: i.quantity,
        unitPrice: Number(i.unitPrice),
        lineTotal: Number(i.lineTotal),
      }));
      const drv = s.truckLoad?.driver;
      rows.push({
        id: s.id,
        channel: 'TRUCK',
        number: `T#${s.saleNumber}`,
        date: s.createdAt,
        customerId: s.customerId,
        customerName: s.customer?.storeName ?? '-',
        sellerName: drv ? `${drv.lastName ?? ''} ${drv.firstName ?? ''}`.trim() || '-' : '-',
        paymentMethod: s.paymentMethod,
        itemCount: lines.reduce((sum, l) => sum + l.quantity, 0),
        subtotal: Number(s.subtotal),
        total: Number(s.totalAmount),
        truckLoadId: s.truckLoadId,
        lines,
      });
    }

    rows.sort((a, b) => a.date.getTime() - b.date.getTime());

    // Aggregates over the FULL matched set
    let revenue = 0;
    let itemCount = 0;
    const byMethod: Record<string, { count: number; amount: number }> = {};
    const byProduct = new Map<string, { name: string; barcode: string | null; qty: number; revenue: number }>();
    const byCustomer = new Map<string, { storeName: string; count: number; amount: number }>();

    for (const r of rows) {
      revenue += r.total;
      itemCount += r.itemCount;
      const m = r.paymentMethod ?? 'UNKNOWN';
      if (!byMethod[m]) byMethod[m] = { count: 0, amount: 0 };
      byMethod[m].count += 1;
      byMethod[m].amount += r.total;
      if (r.customerId) {
        const c = byCustomer.get(r.customerId) ?? { storeName: r.customerName, count: 0, amount: 0 };
        c.count += 1;
        c.amount += r.total;
        byCustomer.set(r.customerId, c);
      }
      for (const l of r.lines) {
        const p = byProduct.get(l.productId) ?? { name: l.productName, barcode: l.barcode, qty: 0, revenue: 0 };
        p.qty += l.quantity;
        p.revenue += l.lineTotal;
        byProduct.set(l.productId, p);
      }
    }

    const CAP = 2000;
    return {
      from,
      to,
      filters: { customerId: customerId ?? null, productId: productId ?? null, paymentMethod: paymentMethod ?? null, channel, driverId: driverId ?? null },
      truncated: rows.length > CAP,
      totals: { count: rows.length, revenue, itemCount, byMethod },
      byProduct: Array.from(byProduct.entries())
        .map(([productId, v]) => ({ productId, ...v }))
        .sort((a, b) => b.revenue - a.revenue),
      byCustomer: Array.from(byCustomer.entries())
        .map(([id, v]) => ({ customerId: id, ...v }))
        .sort((a, b) => b.amount - a.amount),
      items: rows.slice(0, CAP),
    };
  }

  /**
   * VAT (НӨАТ) report — output VAT over a date range. Prices are treated as
   * VAT-inclusive at the configured rate (ReceiptSettings.vatRate, default 10%):
   * outputVat = total * rate / (100 + rate). Order.taxAmount (when recorded) is
   * reported separately for reference.
   */
  async getVatReport(from: string, to: string) {
    const fromDate = new Date(from);
    const toDate = new Date(to);
    toDate.setHours(23, 59, 59, 999);

    const settings = await this.prisma.receiptSettings.findFirst({ select: { vatRate: true } });
    const rate = Number(settings?.vatRate ?? 10);

    const [orderAgg, truckAgg] = await Promise.all([
      this.prisma.order.aggregate({
        where: { status: OrderStatus.DELIVERED, deliveredAt: { gte: fromDate, lte: toDate } },
        _sum: { totalAmount: true, taxAmount: true },
        _count: true,
      }),
      this.prisma.truckSale.aggregate({
        where: { createdAt: { gte: fromDate, lte: toDate } },
        _sum: { totalAmount: true },
        _count: true,
      }),
    ]);

    const orderSales = Number(orderAgg._sum.totalAmount ?? 0);
    const truckSalesTotal = Number(truckAgg._sum.totalAmount ?? 0);
    const recordedOrderTax = Number(orderAgg._sum.taxAmount ?? 0);
    const totalSales = orderSales + truckSalesTotal;

    const outputVat = rate > 0 ? Math.round((totalSales * rate) / (100 + rate)) : 0;
    const taxableBase = totalSales - outputVat;

    return {
      from,
      to,
      vatRate: rate,
      vatInclusiveAssumed: true,
      salesCount: orderAgg._count + truckAgg._count,
      orderSales,
      truckSales: truckSalesTotal,
      totalSales,
      taxableBase,
      outputVat,
      recordedOrderTax,
    };
  }
}
