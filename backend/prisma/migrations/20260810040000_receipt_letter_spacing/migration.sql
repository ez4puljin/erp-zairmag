-- Баримт дээрх бүх текстийн үсэг хоорондын зай.
-- Бутархай утга зөвшөөрөхийн тулд Float. 0 = өөрчлөлтгүй (одоогийн байдал).

ALTER TABLE "receipt_settings"
  ADD COLUMN "letter_spacing" DOUBLE PRECISION NOT NULL DEFAULT 0;
