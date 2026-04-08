-- AlterTable
ALTER TABLE "receipt_settings" ADD COLUMN     "city_tax_rate" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "show_vat" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "vat_rate" INTEGER NOT NULL DEFAULT 10;
