-- AlterTable
ALTER TABLE "receipt_settings" ADD COLUMN     "feedback_phone" TEXT,
ADD COLUMN     "show_item_number" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "show_sale_driver" BOOLEAN NOT NULL DEFAULT true;
