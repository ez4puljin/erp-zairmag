/*
  Warnings:

  - You are about to drop the column `product_sku` on the `daily_product_sales` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "daily_product_sales" DROP COLUMN "product_sku",
ADD COLUMN     "product_barcode" TEXT;
