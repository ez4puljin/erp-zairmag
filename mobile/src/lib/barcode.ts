/**
 * Барааны баркодтой ажиллах туслахууд (админ вэбтэй ижил дүрэм).
 *
 * Нэг бараа олон баркодтой байж болно, мөн нэг баркодыг хэд хэдэн бараа
 * хуваалцаж болно. Тиймээс уншуулсан кодоор хайхад нэгээс олон бараа
 * гарч ирж болно — тэр үед хэрэглэгчээс сонгуулна.
 */

export type WithBarcodes = { barcodes?: { code: string }[] | null };

/** Жагсаалт/баримт дээр харуулах үндсэн (эхний) баркод. */
export function primaryBarcode(product: WithBarcodes | null | undefined): string | null {
  return product?.barcodes?.[0]?.code ?? null;
}

export function allBarcodes(product: WithBarcodes | null | undefined): string[] {
  return (product?.barcodes ?? []).map((b) => b.code);
}

/**
 * Зураасан кодыг харьцуулахад тоо болон үсгээс бусдыг хаяна.
 * (Өмнө ProductPicker дотор байсан хувилбартай ижил — нормчлол нэг байх ёстой,
 *  эс бөгөөс скан болон хайлт өөр өөр үр дүн өгнө.)
 */
export function normalizeCode(code: string): string {
  return (code || '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
}

/** Уншуулсан код энэ бараанд харьяалагдах эсэх. */
export function hasBarcode(product: WithBarcodes | null | undefined, code: string): boolean {
  const target = normalizeCode(code);
  if (!target) return false;
  return allBarcodes(product).some((c) => normalizeCode(c) === target);
}

/** Нэр эсвэл аль нэг баркодоор хайх. */
export function matchesSearch(
  product: (WithBarcodes & { name?: string | null }) | null | undefined,
  query: string,
): boolean {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return true;
  if ((product?.name ?? '').toLowerCase().includes(q)) return true;
  return allBarcodes(product).some((c) => c.toLowerCase().includes(q));
}
