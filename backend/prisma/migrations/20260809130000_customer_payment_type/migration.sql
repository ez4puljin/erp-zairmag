-- Харилцагчийн төлбөрт чиглэл нэмэв: хүлээн авсан (RECEIPT) / олгосон (PAYOUT).
-- Одоо байгаа бүх мөр хүлээн авсан төлбөр тул RECEIPT утгатай болно.

-- CreateEnum
CREATE TYPE "CustomerPaymentType" AS ENUM ('RECEIPT', 'PAYOUT');

-- AlterTable
ALTER TABLE "payments" ADD COLUMN     "type" "CustomerPaymentType" NOT NULL DEFAULT 'RECEIPT';
