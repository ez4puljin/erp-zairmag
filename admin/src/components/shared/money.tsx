/** Мөнгөн дүнг ₮ форматтай гаргана (Decimal/number/string-ийг хүлээнэ). */
export function formatMnt(value: number | string | null | undefined, opts?: { symbol?: boolean }): string {
  const n = Number(value ?? 0);
  const grouped = (Number.isFinite(n) ? n : 0).toLocaleString('mn-MN', { maximumFractionDigits: 2 });
  return opts?.symbol === false ? grouped : `₮${grouped}`;
}

export function Money({ value, className, symbol = true }: { value: number | string | null | undefined; className?: string; symbol?: boolean }) {
  return <span className={className}>{formatMnt(value, { symbol })}</span>;
}
