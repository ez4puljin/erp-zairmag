/*
  Warnings:

  - The `unit` column on the `products` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "ProductUnit" AS ENUM ('PIECE', 'BOX', 'KG', 'LITER', 'PACK');

-- CreateEnum
CREATE TYPE "InventoryCountStatus" AS ENUM ('DRAFT', 'FINALIZED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TruckLoadStatus" AS ENUM ('LOADING', 'DISPATCHED', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "TruckReturnStatus" AS ENUM ('PENDING', 'VERIFIED');

-- CreateEnum
CREATE TYPE "SupplierPaymentType" AS ENUM ('PAYMENT', 'RETURN', 'ADJUSTMENT');

-- AlterEnum
ALTER TYPE "OrderStatus" ADD VALUE 'CANCELLATION_REQUESTED';

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "PaymentMethod" ADD VALUE 'CARD';
ALTER TYPE "PaymentMethod" ADD VALUE 'COMBINED';

-- AlterTable
ALTER TABLE "orders" ADD COLUMN     "cancellation_request_note" TEXT,
ADD COLUMN     "cancellation_requested_at" TIMESTAMP(3),
ADD COLUMN     "payment_method" "PaymentMethod",
ADD COLUMN     "receipt_printed_at" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "units_per_box" INTEGER NOT NULL DEFAULT 1,
DROP COLUMN "unit",
ADD COLUMN     "unit" "ProductUnit" NOT NULL DEFAULT 'PIECE';

-- AlterTable
ALTER TABLE "suppliers" ADD COLUMN     "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE "supplier_payments" (
    "id" UUID NOT NULL,
    "supplier_id" UUID NOT NULL,
    "type" "SupplierPaymentType" NOT NULL DEFAULT 'PAYMENT',
    "amount" DECIMAL(14,2) NOT NULL,
    "method" "PaymentMethod",
    "description" TEXT,
    "reference_no" TEXT,
    "date" DATE NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "supplier_payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipts" (
    "id" UUID NOT NULL,
    "receipt_number" SERIAL NOT NULL,
    "supplier_id" UUID NOT NULL,
    "total_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "received_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "purchase_receipts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "purchase_receipt_items" (
    "id" UUID NOT NULL,
    "purchase_receipt_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "purchase_receipt_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cash_closings" (
    "id" UUID NOT NULL,
    "closing_date" DATE NOT NULL,
    "opening_balance" DECIMAL(14,2) NOT NULL,
    "total_cash_in" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_cash_out" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_bank_in" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "closing_balance" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "closed_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cash_closings_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expense_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "expense_categories_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "expenses" (
    "id" UUID NOT NULL,
    "expense_number" SERIAL NOT NULL,
    "category_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "payment_method" "PaymentMethod",
    "reference_no" TEXT,
    "notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "expenses_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "invoices" (
    "id" UUID NOT NULL,
    "invoice_number" SERIAL NOT NULL,
    "order_id" UUID NOT NULL,
    "issued_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "due_date" DATE,
    "subtotal" DECIMAL(14,2) NOT NULL,
    "tax_amount" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(14,2) NOT NULL,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invoices_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_counts" (
    "id" UUID NOT NULL,
    "count_number" SERIAL NOT NULL,
    "count_date" DATE NOT NULL,
    "status" "InventoryCountStatus" NOT NULL DEFAULT 'DRAFT',
    "notes" TEXT,
    "finalized_at" TIMESTAMP(3),
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "inventory_counts_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "inventory_count_items" (
    "id" UUID NOT NULL,
    "inventory_count_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "system_qty" INTEGER NOT NULL,
    "counted_qty" INTEGER,
    "difference" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "inventory_count_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_loads" (
    "id" UUID NOT NULL,
    "load_number" SERIAL NOT NULL,
    "driver_id" UUID NOT NULL,
    "load_date" DATE NOT NULL,
    "status" "TruckLoadStatus" NOT NULL DEFAULT 'LOADING',
    "notes" TEXT,
    "vehicle_info" TEXT,
    "dispatched_at" TIMESTAMP(3),
    "completed_at" TIMESTAMP(3),
    "return_verified_by_id" UUID,
    "return_verified_at" TIMESTAMP(3),
    "return_notes" TEXT,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "truck_loads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_load_items" (
    "id" UUID NOT NULL,
    "truck_load_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "loaded_qty" INTEGER NOT NULL,
    "sold_qty" INTEGER NOT NULL DEFAULT 0,
    "returned_qty" INTEGER NOT NULL DEFAULT 0,
    "damaged_qty" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "truck_load_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_sales" (
    "id" UUID NOT NULL,
    "sale_number" SERIAL NOT NULL,
    "truck_load_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "payment_method" "PaymentMethod" NOT NULL,
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total_amount" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_sales_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_sale_items" (
    "id" UUID NOT NULL,
    "truck_sale_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,
    "unit_price" DECIMAL(12,2) NOT NULL,
    "line_total" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "truck_sale_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "supplier_payments_supplier_id_idx" ON "supplier_payments"("supplier_id");

-- CreateIndex
CREATE INDEX "supplier_payments_date_idx" ON "supplier_payments"("date");

-- CreateIndex
CREATE UNIQUE INDEX "purchase_receipts_receipt_number_key" ON "purchase_receipts"("receipt_number");

-- CreateIndex
CREATE INDEX "purchase_receipts_supplier_id_idx" ON "purchase_receipts"("supplier_id");

-- CreateIndex
CREATE INDEX "purchase_receipts_received_at_idx" ON "purchase_receipts"("received_at");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_purchase_receipt_id_idx" ON "purchase_receipt_items"("purchase_receipt_id");

-- CreateIndex
CREATE INDEX "purchase_receipt_items_product_id_idx" ON "purchase_receipt_items"("product_id");

-- CreateIndex
CREATE INDEX "cash_closings_closing_date_idx" ON "cash_closings"("closing_date");

-- CreateIndex
CREATE UNIQUE INDEX "cash_closings_closing_date_key" ON "cash_closings"("closing_date");

-- CreateIndex
CREATE UNIQUE INDEX "expense_categories_name_key" ON "expense_categories"("name");

-- CreateIndex
CREATE UNIQUE INDEX "expenses_expense_number_key" ON "expenses"("expense_number");

-- CreateIndex
CREATE INDEX "expenses_category_id_idx" ON "expenses"("category_id");

-- CreateIndex
CREATE INDEX "expenses_date_idx" ON "expenses"("date");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_invoice_number_key" ON "invoices"("invoice_number");

-- CreateIndex
CREATE UNIQUE INDEX "invoices_order_id_key" ON "invoices"("order_id");

-- CreateIndex
CREATE INDEX "invoices_order_id_idx" ON "invoices"("order_id");

-- CreateIndex
CREATE INDEX "invoices_issued_at_idx" ON "invoices"("issued_at");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_counts_count_number_key" ON "inventory_counts"("count_number");

-- CreateIndex
CREATE INDEX "inventory_counts_count_date_idx" ON "inventory_counts"("count_date");

-- CreateIndex
CREATE INDEX "inventory_count_items_inventory_count_id_idx" ON "inventory_count_items"("inventory_count_id");

-- CreateIndex
CREATE INDEX "inventory_count_items_product_id_idx" ON "inventory_count_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "inventory_count_items_inventory_count_id_product_id_key" ON "inventory_count_items"("inventory_count_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "truck_loads_load_number_key" ON "truck_loads"("load_number");

-- CreateIndex
CREATE INDEX "truck_loads_driver_id_load_date_idx" ON "truck_loads"("driver_id", "load_date");

-- CreateIndex
CREATE INDEX "truck_loads_status_idx" ON "truck_loads"("status");

-- CreateIndex
CREATE INDEX "truck_loads_load_date_idx" ON "truck_loads"("load_date");

-- CreateIndex
CREATE INDEX "truck_load_items_truck_load_id_idx" ON "truck_load_items"("truck_load_id");

-- CreateIndex
CREATE INDEX "truck_load_items_product_id_idx" ON "truck_load_items"("product_id");

-- CreateIndex
CREATE UNIQUE INDEX "truck_load_items_truck_load_id_product_id_key" ON "truck_load_items"("truck_load_id", "product_id");

-- CreateIndex
CREATE UNIQUE INDEX "truck_sales_sale_number_key" ON "truck_sales"("sale_number");

-- CreateIndex
CREATE INDEX "truck_sales_truck_load_id_idx" ON "truck_sales"("truck_load_id");

-- CreateIndex
CREATE INDEX "truck_sales_customer_id_idx" ON "truck_sales"("customer_id");

-- CreateIndex
CREATE INDEX "truck_sales_created_at_idx" ON "truck_sales"("created_at");

-- CreateIndex
CREATE INDEX "truck_sale_items_truck_sale_id_idx" ON "truck_sale_items"("truck_sale_id");

-- CreateIndex
CREATE INDEX "truck_sale_items_product_id_idx" ON "truck_sale_items"("product_id");

-- CreateIndex
CREATE INDEX "orders_customer_id_created_at_idx" ON "orders"("customer_id", "created_at");

-- CreateIndex
CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements"("product_id");

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_supplier_id_fkey" FOREIGN KEY ("supplier_id") REFERENCES "suppliers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipts" ADD CONSTRAINT "purchase_receipts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_purchase_receipt_id_fkey" FOREIGN KEY ("purchase_receipt_id") REFERENCES "purchase_receipts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "purchase_receipt_items" ADD CONSTRAINT "purchase_receipt_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cash_closings" ADD CONSTRAINT "cash_closings_closed_by_id_fkey" FOREIGN KEY ("closed_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_category_id_fkey" FOREIGN KEY ("category_id") REFERENCES "expense_categories"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_counts" ADD CONSTRAINT "inventory_counts_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_inventory_count_id_fkey" FOREIGN KEY ("inventory_count_id") REFERENCES "inventory_counts"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "inventory_count_items" ADD CONSTRAINT "inventory_count_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_loads" ADD CONSTRAINT "truck_loads_driver_id_fkey" FOREIGN KEY ("driver_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_loads" ADD CONSTRAINT "truck_loads_return_verified_by_id_fkey" FOREIGN KEY ("return_verified_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_loads" ADD CONSTRAINT "truck_loads_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_load_items" ADD CONSTRAINT "truck_load_items_truck_load_id_fkey" FOREIGN KEY ("truck_load_id") REFERENCES "truck_loads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_load_items" ADD CONSTRAINT "truck_load_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_sales" ADD CONSTRAINT "truck_sales_truck_load_id_fkey" FOREIGN KEY ("truck_load_id") REFERENCES "truck_loads"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_sales" ADD CONSTRAINT "truck_sales_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_sale_items" ADD CONSTRAINT "truck_sale_items_truck_sale_id_fkey" FOREIGN KEY ("truck_sale_id") REFERENCES "truck_sales"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_sale_items" ADD CONSTRAINT "truck_sale_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
