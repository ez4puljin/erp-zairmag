-- CreateTable
CREATE TABLE "truck_load_batches" (
    "id" UUID NOT NULL,
    "truck_load_id" UUID NOT NULL,
    "sequence" INTEGER NOT NULL,
    "note" TEXT,
    "created_by_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "truck_load_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "truck_load_batch_items" (
    "id" UUID NOT NULL,
    "batch_id" UUID NOT NULL,
    "product_id" UUID NOT NULL,
    "quantity" INTEGER NOT NULL,

    CONSTRAINT "truck_load_batch_items_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "truck_load_batches_truck_load_id_idx" ON "truck_load_batches"("truck_load_id");

-- CreateIndex
CREATE UNIQUE INDEX "truck_load_batches_truck_load_id_sequence_key" ON "truck_load_batches"("truck_load_id", "sequence");

-- CreateIndex
CREATE INDEX "truck_load_batch_items_batch_id_idx" ON "truck_load_batch_items"("batch_id");

-- CreateIndex
CREATE INDEX "truck_load_batch_items_product_id_idx" ON "truck_load_batch_items"("product_id");

-- AddForeignKey
ALTER TABLE "truck_load_batches" ADD CONSTRAINT "truck_load_batches_truck_load_id_fkey" FOREIGN KEY ("truck_load_id") REFERENCES "truck_loads"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_load_batches" ADD CONSTRAINT "truck_load_batches_created_by_id_fkey" FOREIGN KEY ("created_by_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_load_batch_items" ADD CONSTRAINT "truck_load_batch_items_batch_id_fkey" FOREIGN KEY ("batch_id") REFERENCES "truck_load_batches"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "truck_load_batch_items" ADD CONSTRAINT "truck_load_batch_items_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
