-- CreateTable
CREATE TABLE "sms_settings" (
    "id" UUID NOT NULL,
    "api_url" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "password" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "sms_settings_pkey" PRIMARY KEY ("id")
);
