-- Зардлыг "төлбөрийн хэлбэр"-ээр биш, зарлага гарсан дансаар бүртгэдэг болгов.

-- AlterTable
ALTER TABLE "expenses" ADD COLUMN     "bank_account_id" UUID;

-- DropColumn
ALTER TABLE "expenses" DROP COLUMN "payment_method";

-- CreateIndex
CREATE INDEX "expenses_bank_account_id_idx" ON "expenses"("bank_account_id");

-- AddForeignKey
ALTER TABLE "expenses" ADD CONSTRAINT "expenses_bank_account_id_fkey" FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;
