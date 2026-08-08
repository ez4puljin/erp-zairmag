-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "register_no" TEXT;

-- CreateIndex
CREATE INDEX "customers_register_no_idx" ON "customers"("register_no");
