/** Мөнгөн дүнг ₮ форматтай гаргана (Decimal/number/string-ийг хүлээнэ). */
export function formatMnt(value: number | string | null | undefined, opts?: { symbol?: boolean }): string {
  const n = Number(value ?? 0);
  const grouped = (Number.isFinite(n) ? n : 0).toLocaleString('mn-MN', { maximumFractionDigits: 2 });
  return opts?.symbol === false ? grouped : `₮${grouped}`;
}

export function Money({ value, className, symbol = true }: { value: number | string | null | undefined; className?: string; symbol?: boolean }) {
  return <span className={className}>{formatMnt(value, { symbol })}</span>;
}

/**
 * Жинг уншихад тохиромжтой хэлбэрээр харуулна.
 *
 * Барааны жин граммаар хадгалагддаг (нэг ширхэгт). Ачилтын нийт жин
 * хэдэн зуун килограмм болдог тул 1 кг-аас дээш бол кг-аар харуулна.
 */
export function formatWeight(grams: number): string {
  if (!grams || grams <= 0) return '—';
  if (grams < 1000) return `${Math.round(grams)} гр`;
  const kg = grams / 1000;
  return `${kg.toLocaleString('en-US', { minimumFractionDigits: kg < 10 ? 2 : 1, maximumFractionDigits: kg < 10 ? 2 : 1 })} кг`;
}

/**
 * Тоо хэмжээг хайрцаг + ширхгээр харуулна.
 *
 * Агуулах, түгээлтэд бараа хайрцгаар яригддаг тул "90ш" гэхээс
 * "2 хайрцаг 10ш" гэсэн нь шууд ойлгомжтой.
 */
export function formatQty(quantity: number, unitsPerBox?: number | null): string {
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  const per = Math.max(1, Math.round(Number(unitsPerBox) || 1));
  if (per <= 1 || qty < per) return `${qty}ш`;
  const boxes = Math.floor(qty / per);
  const rest = qty % per;
  return rest > 0 ? `${boxes} хайрцаг ${rest}ш` : `${boxes} хайрцаг`;
}

/** Хайрцаг/ширхэг + нийт ширхэг. Дэлгэрэнгүй харагдацад. */
export function formatQtyFull(quantity: number, unitsPerBox?: number | null): string {
  const qty = Math.max(0, Math.round(Number(quantity) || 0));
  const per = Math.max(1, Math.round(Number(unitsPerBox) || 1));
  const short = formatQty(qty, per);
  return per > 1 && qty >= per ? `${short} · ${qty}ш` : short;
}
