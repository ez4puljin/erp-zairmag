-- Орлогын данс: ПОС дээр "Шилжүүлэг"-ээр хийсэн борлуулалтын төлбөр шууд
-- энэ данс дээр бүртгэгдэнэ. Зөвхөн нэг данс ийм байж болно.

ALTER TABLE "bank_accounts"
  ADD COLUMN "is_income_default" BOOLEAN NOT NULL DEFAULT false;

-- Ганц л данс байхыг өгөгдлийн санд түвшинд баталгаажуулна.
CREATE UNIQUE INDEX "bank_accounts_single_income_default"
  ON "bank_accounts" (("is_income_default")) WHERE "is_income_default";
