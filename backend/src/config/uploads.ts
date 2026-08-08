import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';

/**
 * Байршуулсан файлуудын үндсэн хавтас.
 *
 * Локал дээр төслийн `uploads/` хавтас руу бичнэ. Render зэрэг үүлэн орчинд
 * контейнерын файл систем нь deploy бүрд шинэчлэгддэг тул байнгын диск
 * (persistent disk) залгаад `UPLOADS_DIR`-ээр түүний замыг зааж өгнө.
 * Ж: UPLOADS_DIR=/var/data/uploads
 */
export const UPLOADS_ROOT =
  process.env.UPLOADS_DIR?.trim() || join(process.cwd(), 'uploads');

/** Барааны зургийн хавтас. */
export const PRODUCTS_UPLOAD_DIR = join(UPLOADS_ROOT, 'products');

/** Хавтас байхгүй бол үүсгэнэ (шинэ диск хоосон ирдэг). */
export function ensureUploadDirs(): void {
  for (const dir of [UPLOADS_ROOT, PRODUCTS_UPLOAD_DIR]) {
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
  }
}
