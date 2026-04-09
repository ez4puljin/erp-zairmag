import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import configuration from './config/configuration';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './modules/auth/auth.module';
import { ProductsModule } from './modules/products/products.module';
import { CategoriesModule } from './modules/categories/categories.module';
import { CustomersModule } from './modules/customers/customers.module';
import { OrdersModule } from './modules/orders/orders.module';
import { InventoryModule } from './modules/inventory/inventory.module';
import { PaymentsModule } from './modules/payments/payments.module';
import { DriversModule } from './modules/drivers/drivers.module';
import { ReportsModule } from './modules/reports/reports.module';
import { SuppliersModule } from './modules/suppliers/suppliers.module';
import { CustomerCategoriesModule } from './modules/customer-categories/customer-categories.module';
import { PurchaseReceiptsModule } from './modules/purchase-receipts/purchase-receipts.module';
import { ReceivablesModule } from './modules/receivables/receivables.module';
import { CashClosingsModule } from './modules/cash-closings/cash-closings.module';
import { SupplierPayablesModule } from './modules/supplier-payables/supplier-payables.module';
import { InventoryCountsModule } from './modules/inventory-counts/inventory-counts.module';
import { ProductLedgerModule } from './modules/product-ledger/product-ledger.module';
import { TruckLoadsModule } from './modules/truck-loads/truck-loads.module';
import { TruckSalesModule } from './modules/truck-sales/truck-sales.module';
import { InvoicesModule } from './modules/invoices/invoices.module';
import { ExpensesModule } from './modules/expenses/expenses.module';
import { SmsModule } from './modules/sms/sms.module';
import { ReceiptSettingsModule } from './modules/receipt-settings/receipt-settings.module';
import { BankAccountsModule } from './modules/bank-accounts/bank-accounts.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [configuration],
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 100,
      },
    ]),
    PrismaModule,
    AuthModule,
    ProductsModule,
    CategoriesModule,
    CustomersModule,
    OrdersModule,
    InventoryModule,
    PaymentsModule,
    DriversModule,
    ReportsModule,
    SuppliersModule,
    CustomerCategoriesModule,
    PurchaseReceiptsModule,
    ReceivablesModule,
    CashClosingsModule,
    SupplierPayablesModule,
    InventoryCountsModule,
    ProductLedgerModule,
    TruckLoadsModule,
    TruckSalesModule,
    InvoicesModule,
    ExpensesModule,
    SmsModule,
    ReceiptSettingsModule,
    BankAccountsModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
