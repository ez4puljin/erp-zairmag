"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const core_1 = require("@nestjs/core");
const throttler_1 = require("@nestjs/throttler");
const configuration_1 = __importDefault(require("./config/configuration"));
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./modules/auth/auth.module");
const products_module_1 = require("./modules/products/products.module");
const categories_module_1 = require("./modules/categories/categories.module");
const customers_module_1 = require("./modules/customers/customers.module");
const orders_module_1 = require("./modules/orders/orders.module");
const inventory_module_1 = require("./modules/inventory/inventory.module");
const payments_module_1 = require("./modules/payments/payments.module");
const drivers_module_1 = require("./modules/drivers/drivers.module");
const reports_module_1 = require("./modules/reports/reports.module");
const suppliers_module_1 = require("./modules/suppliers/suppliers.module");
const customer_categories_module_1 = require("./modules/customer-categories/customer-categories.module");
const purchase_receipts_module_1 = require("./modules/purchase-receipts/purchase-receipts.module");
const receivables_module_1 = require("./modules/receivables/receivables.module");
const cash_closings_module_1 = require("./modules/cash-closings/cash-closings.module");
const supplier_payables_module_1 = require("./modules/supplier-payables/supplier-payables.module");
const inventory_counts_module_1 = require("./modules/inventory-counts/inventory-counts.module");
const product_ledger_module_1 = require("./modules/product-ledger/product-ledger.module");
const truck_loads_module_1 = require("./modules/truck-loads/truck-loads.module");
const truck_sales_module_1 = require("./modules/truck-sales/truck-sales.module");
const invoices_module_1 = require("./modules/invoices/invoices.module");
const expenses_module_1 = require("./modules/expenses/expenses.module");
const sms_module_1 = require("./modules/sms/sms.module");
const receipt_settings_module_1 = require("./modules/receipt-settings/receipt-settings.module");
const jwt_auth_guard_1 = require("./common/guards/jwt-auth.guard");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
                load: [configuration_1.default],
            }),
            throttler_1.ThrottlerModule.forRoot([
                {
                    ttl: 60000,
                    limit: 100,
                },
            ]),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            products_module_1.ProductsModule,
            categories_module_1.CategoriesModule,
            customers_module_1.CustomersModule,
            orders_module_1.OrdersModule,
            inventory_module_1.InventoryModule,
            payments_module_1.PaymentsModule,
            drivers_module_1.DriversModule,
            reports_module_1.ReportsModule,
            suppliers_module_1.SuppliersModule,
            customer_categories_module_1.CustomerCategoriesModule,
            purchase_receipts_module_1.PurchaseReceiptsModule,
            receivables_module_1.ReceivablesModule,
            cash_closings_module_1.CashClosingsModule,
            supplier_payables_module_1.SupplierPayablesModule,
            inventory_counts_module_1.InventoryCountsModule,
            product_ledger_module_1.ProductLedgerModule,
            truck_loads_module_1.TruckLoadsModule,
            truck_sales_module_1.TruckSalesModule,
            invoices_module_1.InvoicesModule,
            expenses_module_1.ExpensesModule,
            sms_module_1.SmsModule,
            receipt_settings_module_1.ReceiptSettingsModule,
        ],
        providers: [
            {
                provide: core_1.APP_GUARD,
                useClass: jwt_auth_guard_1.JwtAuthGuard,
            },
            {
                provide: core_1.APP_GUARD,
                useClass: throttler_1.ThrottlerGuard,
            },
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map