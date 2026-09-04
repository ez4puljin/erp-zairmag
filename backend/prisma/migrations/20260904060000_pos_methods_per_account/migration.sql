-- ПОС-оос данс руу автоматаар бүртгэгдэх төлбөрийн хэлбэрүүд.
-- Өмнөх ганц "орлогын данс" тэмдгийг хэлбэр тус бүрийн тохиргоо болгож өргөтгөв.

ALTER TABLE "bank_accounts" ADD COLUMN "pos_methods" TEXT[] NOT NULL DEFAULT '{}';

-- Хуучин орлогын данс шилжүүлгийг хүлээн авдаг байсан — тэр утгыг хадгална.
UPDATE "bank_accounts" SET "pos_methods" = ARRAY['BANK_TRANSFER']
WHERE "is_income_default" = true;

DROP INDEX IF EXISTS "bank_accounts_single_income_default";
ALTER TABLE "bank_accounts" DROP COLUMN "is_income_default";
