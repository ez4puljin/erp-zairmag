-- CreateEnum
CREATE TYPE "TruckLoadLocation" AS ENUM ('URBAN', 'RURAL');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "bank_account_id" UUID;

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "selling_price_rural" DECIMAL(12,2) NOT NULL DEFAULT 0;

-- AlterTable
ALTER TABLE "supplier_payments" ADD COLUMN     "bank_account_id" UUID;

-- AlterTable
ALTER TABLE "truck_loads" ADD COLUMN     "location_type" "TruckLoadLocation" NOT NULL DEFAULT 'URBAN';

-- CreateTable
CREATE TABLE "bank_accounts" (
    "id" UUID NOT NULL,
    "bank_name" TEXT NOT NULL,
    "account_number" TEXT NOT NULL,
    "holder_name" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MNT',
    "opening_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "current_balance" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "notes" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_accounts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_accounts_is_active_idx" ON "bank_accounts"("is_active");

-- CreateIndex
CREATE INDEX "payments_bank_account_id_idx" ON "payments"("bank_account_id");

-- CreateIndex
CREATE INDEX "supplier_payments_bank_account_id_idx" ON "supplier_payments"("bank_account_id");

-- AddForeignKey
ALTER TABLE "supplier_payments" ADD CONSTRAINT "supplier_payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
