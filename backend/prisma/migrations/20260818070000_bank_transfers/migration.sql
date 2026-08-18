-- Данс хоорондын мөнгөн шилжүүлэг.
-- Нэг бичилт хоёр дансны үлдэгдлийг зэрэг хөдөлгөнө.

CREATE TABLE "bank_transfers" (
    "id" UUID NOT NULL,
    "from_account_id" UUID NOT NULL,
    "to_account_id" UUID NOT NULL,
    "amount" DECIMAL(14,2) NOT NULL,
    "description" TEXT,
    "date" DATE NOT NULL,
    "created_by_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "bank_transfers_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "bank_transfers_date_idx" ON "bank_transfers"("date");
CREATE INDEX "bank_transfers_from_account_id_idx" ON "bank_transfers"("from_account_id");
CREATE INDEX "bank_transfers_to_account_id_idx" ON "bank_transfers"("to_account_id");

ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_from_account_id_fkey"
  FOREIGN KEY ("from_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_to_account_id_fkey"
  FOREIGN KEY ("to_account_id") REFERENCES "bank_accounts"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "bank_transfers" ADD CONSTRAINT "bank_transfers_created_by_id_fkey"
  FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
