-- Банкны шимтгэлийг мөр бүрээр нь биш, хуулга тус бүрд нийлбэрээр нь
-- нэг зардал болгож хаана.

ALTER TABLE "bank_statements" ADD COLUMN "fee_expense_id" UUID;

CREATE UNIQUE INDEX "bank_statements_fee_expense_id_key" ON "bank_statements"("fee_expense_id");

ALTER TABLE "bank_statements"
  ADD CONSTRAINT "bank_statements_fee_expense_id_fkey"
    FOREIGN KEY ("fee_expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;
