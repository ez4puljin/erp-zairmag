'use client';

import { Plus, X } from 'lucide-react';

/**
 * Нэг бараанд олон баркод оруулах талбар.
 *
 * Нэг бараа хэд хэдэн баркодтой байж болно (өөр багц, өөр ханган нийлүүлэгч).
 * Код нь өөр бараатай давхардаж болно — үйлдвэрлэгч ижил кодыг хэд хэдэн
 * амтанд өгдөг тул. Уншуулахад олон бараа таарвал POS дээр сонгуулна.
 */
export function BarcodeListInput({
  value,
  onChange,
  inputClass,
  labelClass,
  label = 'Баркод',
}: {
  value: string[];
  onChange: (next: string[]) => void;
  inputClass: string;
  labelClass: string;
  label?: string;
}) {
  const rows = value.length > 0 ? value : [''];

  const setAt = (i: number, v: string) => {
    const next = [...rows];
    next[i] = v;
    onChange(next);
  };

  const removeAt = (i: number) => {
    const next = rows.filter((_, idx) => idx !== i);
    onChange(next.length > 0 ? next : ['']);
  };

  return (
    <div>
      <label className={labelClass}>{label}</label>
      <div className="space-y-2">
        {rows.map((code, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              type="text"
              value={code}
              onChange={(e) => setAt(i, e.target.value)}
              placeholder="8656021315078"
              className={inputClass}
              inputMode="numeric"
            />
            {rows.length > 1 && (
              <button
                type="button"
                onClick={() => removeAt(i)}
                aria-label="Баркод хасах"
                className="shrink-0 w-9 h-9 rounded-xl flex items-center justify-center text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 transition-colors active:scale-[0.97]"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={() => onChange([...rows, ''])}
        className="mt-2 inline-flex items-center gap-1 text-[13px] font-semibold text-[#007AFF] hover:text-[#0066D6] transition-colors active:scale-[0.97]"
      >
        <Plus className="w-3.5 h-3.5" /> Баркод нэмэх
      </button>
    </div>
  );
}

/** Формын утгыг API руу илгээхэд бэлдэнэ — хоосон болон давхардлыг хасна. */
export function cleanBarcodes(codes: string[]): string[] {
  const seen = new Set<string>();
  for (const c of codes) {
    const t = String(c ?? '').trim();
    if (t) seen.add(t);
  }
  return [...seen];
}
