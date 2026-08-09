/**
 * Барааны баркодтой ажиллах туслахууд.
 *
 * Нэг бараа олон баркодтой байж болно, мөн нэг баркодыг хэд хэдэн бараа
 * хуваалцаж болно (үйлдвэрлэгч ижил кодыг өөр амтанд өгдөг). Тиймээс
 * уншуулсан кодоор хайхад үргэлж жагсаалт гарч ирнэ.
 */

export type WithBarcodes = { barcodes?: { code: string }[] | null };

/** Жагсаалт/баримт дээр харуулах үндсэн (эхний) баркод. */
export function primaryBarcode(product: WithBarcodes | null | undefined): string | null {
  return product?.barcodes?.[0]?.code ?? null;
}

/** Бүх баркодыг нэг мөрөнд (жишээ нь tooltip-д). */
export function allBarcodes(product: WithBarcodes | null | undefined): string[] {
  return (product?.barcodes ?? []).map((b) => b.code);
}

/** Скайнер болон гараар оруулсан кодыг харьцуулахад бэлдэнэ. */
export function normalizeCode(code: string): string {
  return String(code ?? '').trim().replace(/\s+/g, '').toLowerCase();
}

/** Уншуулсан код энэ бараанд харьяалагдах эсэх. */
export function hasBarcode(product: WithBarcodes | null | undefined, code: string): boolean {
  const target = normalizeCode(code);
  if (!target) return false;
  return allBarcodes(product).some((c) => normalizeCode(c) === target);
}

/** Нэр эсвэл аль нэг баркодоор хайх (жагсаалтын хайлтад). */
export function matchesSearch(
  product: (WithBarcodes & { name?: string | null }) | null | undefined,
  query: string,
): boolean {
  const q = String(query ?? '').trim().toLowerCase();
  if (!q) return true;
  if ((product?.name ?? '').toLowerCase().includes(q)) return true;
  return allBarcodes(product).some((c) => c.toLowerCase().includes(q));
}
