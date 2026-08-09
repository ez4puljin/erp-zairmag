-- Хуулгын гүйлгээг манай бүртгэлд шууд бичдэг болгов: орлого нь харилцагчийн
-- төлбөр, зарлага нь зардал болно. Эрхэтийн "харьцсан данс"/"үйлдэл" гэсэн
-- ойлголт энэ системд байхгүй тул холбогдох талбаруудыг хасав.

DROP TABLE "cross_account_presets";

ALTER TABLE "bank_transactions"
  DROP COLUMN "partner_name",
  DROP COLUMN "partner_code",
  DROP COLUMN "partner_account",
  DROP COLUMN "action";

ALTER TABLE "bank_transactions" RENAME COLUMN "custom_description" TO "description";

ALTER TABLE "bank_transactions"
  ADD COLUMN "customer_id" UUID,
  ADD COLUMN "expense_category_id" UUID,
  ADD COLUMN "payment_id" UUID,
  ADD COLUMN "expense_id" UUID,
  ADD COLUMN "posted_at" TIMESTAMP(3);

CREATE UNIQUE INDEX "bank_transactions_payment_id_key" ON "bank_transactions"("payment_id");
CREATE UNIQUE INDEX "bank_transactions_expense_id_key" ON "bank_transactions"("expense_id");

ALTER TABLE "bank_transactions"
  ADD CONSTRAINT "bank_transactions_customer_id_fkey"
    FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "bank_transactions_expense_category_id_fkey"
    FOREIGN KEY ("expense_category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "bank_transactions_payment_id_fkey"
    FOREIGN KEY ("payment_id") REFERENCES "payments"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "bank_transactions_expense_id_fkey"
    FOREIGN KEY ("expense_id") REFERENCES "expenses"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bank_statements" ADD COLUMN "bank_account_id" UUID;
ALTER TABLE "bank_statements"
  ADD CONSTRAINT "bank_statements_bank_account_id_fkey"
    FOREIGN KEY ("bank_account_id") REFERENCES "bank_accounts"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "bank_statement_config"
  DROP COLUMN "settlement_partner_name",
  DROP COLUMN "settlement_partner_account",
  DROP COLUMN "settlement_action",
  DROP COLUMN "fee_partner_name",
  DROP COLUMN "fee_partner_account",
  DROP COLUMN "fee_action",
  ADD COLUMN "settlement_customer_id" UUID,
  ADD COLUMN "fee_expense_category_id" UUID;

ALTER TABLE "bank_statement_config"
  ADD CONSTRAINT "bank_statement_config_settlement_customer_id_fkey"
    FOREIGN KEY ("settlement_customer_id") REFERENCES "customers"("id") ON DELETE SET NULL ON UPDATE CASCADE,
  ADD CONSTRAINT "bank_statement_config_fee_expense_category_id_fkey"
    FOREIGN KEY ("fee_expense_category_id") REFERENCES "expense_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
