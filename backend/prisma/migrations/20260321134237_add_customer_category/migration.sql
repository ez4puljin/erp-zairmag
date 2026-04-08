-- AlterTable
ALTER TABLE "customers" ADD COLUMN     "customer_category_id" UUID;

-- CreateTable
CREATE TABLE "customer_categories" (
    "id" UUID NOT NULL,
    "name" TEXT NOT NULL,
    "type" TEXT NOT NULL DEFAULT 'KHOROO',
    "description" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_categories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "customer_categories_name_key" ON "customer_categories"("name");

-- CreateIndex
CREATE INDEX "customers_customer_category_id_idx" ON "customers"("customer_category_id");

-- AddForeignKey
ALTER TABLE "customers" ADD CONSTRAINT "customers_customer_category_id_fkey" FOREIGN KEY ("customer_category_id") REFERENCES "customer_categories"("id") ON DELETE SET NULL ON UPDATE CASCADE;
