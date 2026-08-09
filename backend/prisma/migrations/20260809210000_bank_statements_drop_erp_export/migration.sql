-- Эрхэт рүү экспортлох боломжийг хассан тул зөвхөн түүнд хэрэглэгдэж байсан
-- багануудыг устгав. Устгах үед бүгд хоосон утгатай байсан.

ALTER TABLE "bank_accounts" DROP COLUMN "erp_account_code";

ALTER TABLE "bank_transactions" DROP COLUMN "export_type";

ALTER TABLE "bank_statement_config"
  DROP COLUMN "settlement_account_code",
  DROP COLUMN "fee_export_type",
  DROP COLUMN "fee_account_code";

-- Эрхэтийн тогтмол кодуудыг анхдагч утгаас хасав.
ALTER TABLE "bank_statement_config"
  ALTER COLUMN "settlement_partner_name" SET DEFAULT '',
  ALTER COLUMN "settlement_description" SET DEFAULT 'Пос орлого',
  ALTER COLUMN "fee_partner_name" SET DEFAULT '',
  ALTER COLUMN "fee_partner_account" SET DEFAULT '';
