-- Баримтын байршлын тохиргоо. Эдгээрийг нэмснээр мөрийн зай, захын зай зэргийг
-- тохиргооны хуудсаас өөрчилдөг болно — APK дахин build хийх шаардлагагүй.
-- Анхны утга нь одоогийн кодод бичигдсэн утгуудтай яг ижил тул хэвлэлт өөрчлөгдөхгүй.

ALTER TABLE "receipt_settings"
  ADD COLUMN "margin_x"           INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN "margin_y"           INTEGER NOT NULL DEFAULT 4,
  ADD COLUMN "line_spacing"       INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "section_spacing"    INTEGER NOT NULL DEFAULT 2,
  ADD COLUMN "signature_spacing"  INTEGER NOT NULL DEFAULT 6,
  ADD COLUMN "item_font_boost"    INTEGER NOT NULL DEFAULT 2;
