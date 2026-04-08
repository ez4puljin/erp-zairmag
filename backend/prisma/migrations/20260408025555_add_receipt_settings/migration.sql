-- CreateTable
CREATE TABLE "receipt_settings" (
    "id" UUID NOT NULL,
    "company_name" TEXT NOT NULL DEFAULT 'ЗАЙРМАГ ТҮГЭЭЛТ',
    "subtitle" TEXT NOT NULL DEFAULT 'БОРЛУУЛАЛТЫН БАРИМТ',
    "phone" TEXT,
    "address" TEXT,
    "footer_message" TEXT NOT NULL DEFAULT 'Баярлалаа!',
    "paper_width" INTEGER NOT NULL DEFAULT 58,
    "font_size" INTEGER NOT NULL DEFAULT 20,
    "show_customer" BOOLEAN NOT NULL DEFAULT true,
    "show_phone" BOOLEAN NOT NULL DEFAULT true,
    "show_signatures" BOOLEAN NOT NULL DEFAULT true,
    "show_footer" BOOLEAN NOT NULL DEFAULT true,
    "show_driver" BOOLEAN NOT NULL DEFAULT true,
    "print_two_copies" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "receipt_settings_pkey" PRIMARY KEY ("id")
);
