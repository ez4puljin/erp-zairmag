-- AlterTable
ALTER TABLE "bank_accounts" ADD COLUMN     "erp_account_code" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "is_fee_default" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "bank_statements" (
    "id" UUID NOT NULL,
    "account_number" TEXT NOT NULL,
    "currency" TEXT NOT NULL DEFAULT 'MNT',
    "date_from" DATE,
    "date_to" DATE,
    "filename" TEXT NOT NULL DEFAULT '',
    "uploaded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "uploaded_by_id" UUID,

    CONSTRAINT "bank_statements_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_transactions" (
    "id" UUID NOT NULL,
    "statement_id" UUID NOT NULL,
    "txn_date" TIMESTAMP(3),
    "debit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "credit" DECIMAL(14,2) NOT NULL DEFAULT 0,
    "bank_description" TEXT NOT NULL DEFAULT '',
    "bank_counterpart" TEXT NOT NULL DEFAULT '',
    "is_fee" BOOLEAN NOT NULL DEFAULT false,
    "partner_name" TEXT NOT NULL DEFAULT '',
    "partner_code" TEXT NOT NULL DEFAULT '',
    "partner_account" TEXT NOT NULL DEFAULT '',
    "custom_description" TEXT NOT NULL DEFAULT '',
    "action" TEXT NOT NULL DEFAULT '',
    "export_type" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "bank_transactions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "cross_account_presets" (
    "id" UUID NOT NULL,
    "code" TEXT NOT NULL DEFAULT '',
    "label" TEXT NOT NULL DEFAULT '',
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cross_account_presets_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "bank_statement_config" (
    "id" UUID NOT NULL,
    "settlement_partner_name" TEXT NOT NULL DEFAULT '30000',
    "settlement_partner_account" TEXT NOT NULL DEFAULT '',
    "settlement_description" TEXT NOT NULL DEFAULT '',
    "settlement_action" TEXT NOT NULL DEFAULT 'close',
    "settlement_account_code" TEXT NOT NULL DEFAULT '120105',
    "fee_partner_name" TEXT NOT NULL DEFAULT '30000',
    "fee_partner_account" TEXT NOT NULL DEFAULT '703012',
    "fee_description" TEXT NOT NULL DEFAULT 'Банкны шимтгэл',
    "fee_action" TEXT NOT NULL DEFAULT 'close',
    "fee_export_type" TEXT NOT NULL DEFAULT 'hariltsah',
    "fee_account_code" TEXT NOT NULL DEFAULT '',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "bank_statement_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "bank_statements_account_number_idx" ON "bank_statements"("account_number");

-- CreateIndex
CREATE INDEX "bank_statements_date_from_idx" ON "bank_statements"("date_from");

-- CreateIndex
CREATE INDEX "bank_transactions_statement_id_idx" ON "bank_transactions"("statement_id");

-- CreateIndex
CREATE INDEX "bank_transactions_txn_date_idx" ON "bank_transactions"("txn_date");

-- AddForeignKey
ALTER TABLE "bank_statements" ADD CONSTRAINT "bank_statements_uploaded_by_id_fkey" FOREIGN KEY ("uploaded_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "bank_transactions" ADD CONSTRAINT "bank_transactions_statement_id_fkey" FOREIGN KEY ("statement_id") REFERENCES "bank_statements"("id") ON DELETE CASCADE ON UPDATE CASCADE;
