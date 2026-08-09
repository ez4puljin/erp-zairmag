import { Controller, Get, Query, Res, UseGuards } from '@nestjs/common';
import type { Response } from 'express';
import { ReportsService } from './reports.service';
import { Roles } from '../../common/decorators/roles.decorator';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Role } from '@prisma/client';
import { ExcelService } from '../../common/excel/excel.service';

@Controller('api/reports')
@UseGuards(RolesGuard)
@Roles(Role.ADMIN)
export class ReportsController {
  constructor(
    private reportsService: ReportsService,
    private excel: ExcelService,
  ) {}

  @Get('daily-sales')
  getDailySales(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getDailySales(from || startDate, to || endDate);
  }

  @Get('daily-sales/export')
  async exportDailySales(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const f = from || startDate;
    const t = to || endDate;
    const data = await this.reportsService.getDailySales(f, t);
    const buf = this.excel.build([
      {
        name: 'Өдрийн борлуулалт',
        title: 'Өдрийн борлуулалтын тайлан',
        meta: [`Хугацаа: ${f} — ${t}`, `Нийт орлого: ${data.summary.totalRevenue}`],
        columns: [
          { header: 'Огноо', key: 'date', width: 14 },
          { header: 'Захиалга', key: 'orderCount', width: 12 },
          { header: 'Тоо ширхэг', key: 'itemsSold', width: 14 },
          { header: 'Орлого', key: 'revenue', width: 16 },
          { header: 'Өртөг', key: 'cost', width: 16 },
          { header: 'Ашиг', key: 'profit', width: 16 },
        ],
        rows: data.daily,
        totals: { date: 'НИЙТ', orderCount: data.summary.totalOrders, itemsSold: data.summary.totalItemsSold, revenue: data.summary.totalRevenue },
      },
    ]);
    res.set(this.excel.headers(`odriin-borluulalt-${f}_${t}`)).end(buf);
  }

  @Get('profit')
  getProfitReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
  ) {
    return this.reportsService.getProfitReport(from || startDate, to || endDate);
  }

  @Get('profit/export')
  async exportProfit(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('startDate') startDate: string,
    @Query('endDate') endDate: string,
    @Res() res: Response,
  ) {
    const f = from || startDate;
    const t = to || endDate;
    const data = await this.reportsService.getProfitReport(f, t);
    const buf = this.excel.build([
      {
        name: 'Ашиг',
        title: 'Ашгийн тайлан (бүтээгдэхүүнээр)',
        meta: [`Хугацаа: ${f} — ${t}`, `Нийт ашиг: ${data.grossProfit} (${data.margin.toFixed(1)}%)`],
        columns: [
          { header: 'Бүтээгдэхүүн', key: 'productName', width: 28 },
          { header: 'Тоо', key: 'unitsSold', width: 10 },
          { header: 'Орлого', key: 'revenue', width: 16 },
          { header: 'Өртөг', key: 'cost', width: 16 },
          { header: 'Ашиг', key: 'profit', width: 16 },
        ],
        rows: data.byProduct,
        totals: { productName: 'НИЙТ', revenue: data.totalRevenue, cost: data.totalCost, profit: data.grossProfit },
      },
    ]);
    res.set(this.excel.headers(`ashig-${f}_${t}`)).end(buf);
  }

  @Get('sales-by-category')
  getSalesByCategory() {
    return this.reportsService.getSalesByCategory();
  }

  @Get('customer-debt')
  getCustomerDebtReport() {
    return this.reportsService.getCustomerDebtReport();
  }

  // ── Sales register (Борлуулалтын бүртгэл) ──
  @Get('sales-register')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  getSalesRegister(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('customerId') customerId?: string,
    @Query('productId') productId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('channel') channel?: 'ALL' | 'ORDER' | 'TRUCK',
    @Query('driverId') driverId?: string,
  ) {
    return this.reportsService.getSalesRegister({ from, to, customerId, productId, paymentMethod, channel, driverId });
  }

  @Get('sales-register/export')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async exportSalesRegister(
    @Query('from') from: string,
    @Query('to') to: string,
    @Res() res?: Response,
    @Query('customerId') customerId?: string,
    @Query('productId') productId?: string,
    @Query('paymentMethod') paymentMethod?: string,
    @Query('channel') channel?: 'ALL' | 'ORDER' | 'TRUCK',
    @Query('driverId') driverId?: string,
  ) {
    const data = await this.reportsService.getSalesRegister({ from, to, customerId, productId, paymentMethod, channel, driverId });
    const buf = this.excel.build([
      {
        name: 'Борлуулалт',
        title: 'Борлуулалтын бүртгэл',
        meta: [`Хугацаа: ${from} — ${to}`, `Нийт гүйлгээ: ${data.totals.count}`, `Нийт орлого: ${data.totals.revenue}`],
        columns: [
          { header: 'Огноо', key: 'date', width: 18 },
          { header: 'Дугаар', key: 'number', width: 12 },
          { header: 'Суваг', key: 'channelLabel', width: 12 },
          { header: 'Харилцагч', key: 'customerName', width: 24 },
          { header: 'Худалдагч', key: 'sellerName', width: 18 },
          { header: 'Төлбөр', key: 'paymentMethod', width: 14 },
          { header: 'Тоо', key: 'itemCount', width: 8 },
          { header: 'Дүн', key: 'total', width: 16 },
        ],
        rows: data.items.map((r) => ({
          ...r,
          date: new Date(r.date).toLocaleString('mn-MN'),
          channelLabel: r.channel === 'ORDER' ? 'Захиалга' : 'Машин',
        })),
        totals: { date: 'НИЙТ', total: data.totals.revenue },
      },
      {
        name: 'Бүтээгдэхүүнээр',
        columns: [
          { header: 'Бүтээгдэхүүн', key: 'name', width: 28 },
          { header: 'Баркод', key: 'barcode', width: 16 },
          { header: 'Тоо', key: 'qty', width: 10 },
          { header: 'Орлого', key: 'revenue', width: 16 },
        ],
        rows: data.byProduct,
      },
    ]);
    res!.set(this.excel.headers(`borluulalt-${from}_${to}`)).end(buf);
  }

  // ── VAT (НӨАТ) ──
  @Get('vat')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  getVat(@Query('from') from: string, @Query('to') to: string) {
    return this.reportsService.getVatReport(from, to);
  }

  @Get('vat/export')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  async exportVat(@Query('from') from: string, @Query('to') to: string, @Res() res: Response) {
    const d = await this.reportsService.getVatReport(from, to);
    const buf = this.excel.build([
      {
        name: 'НӨАТ',
        title: 'НӨАТ-ын тайлан',
        meta: [`Хугацаа: ${from} — ${to}`, `НӨАТ-ын хувь: ${d.vatRate}% (үнэд багтсан)`],
        columns: [
          { header: 'Үзүүлэлт', key: 'label', width: 32 },
          { header: 'Дүн', key: 'value', width: 18 },
        ],
        rows: [
          { label: 'Нийт борлуулалт', value: d.totalSales },
          { label: 'Захиалгын борлуулалт', value: d.orderSales },
          { label: 'Машины борлуулалт', value: d.truckSales },
          { label: 'НӨАТ-гүй суурь', value: d.taxableBase },
          { label: `Гарсан НӨАТ (${d.vatRate}%)`, value: d.outputVat },
          { label: 'Захиалгад бүртгэсэн татвар', value: d.recordedOrderTax },
        ],
      },
    ]);
    res.set(this.excel.headers(`noat-${from}_${to}`)).end(buf);
  }

  @Get('drivers')
  @Roles(Role.ADMIN, Role.WAREHOUSE_MANAGER)
  getDriverReport(
    @Query('from') from: string,
    @Query('to') to: string,
    @Query('driverId') driverId?: string,
  ) {
    return this.reportsService.getDriverReport(from, to, driverId);
  }
}
