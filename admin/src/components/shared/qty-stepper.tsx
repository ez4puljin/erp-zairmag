'use client';

import { Minus, Plus } from 'lucide-react';

/** Богино хүрэлцэх мэдрэмж — гар утсан дээр товч дарсныг батламжилна. */
export function tapFeedback(pattern: number | number[] = 8) {
  if (typeof navigator !== 'undefined' && navigator.vibrate) navigator.vibrate(pattern);
}

/**
 * Тоо ширхэг оруулах stepper.
 *
 * Гар утсанд зориулж 44px хүрэх талбартай, төвийн тоо нь шууд засварлагдана.
 * Оролтын үсгийн хэмжээг 16px байлгасан нь iOS Safari дээр focus хийхэд
 * хуудсыг автоматаар томруулахаас сэргийлнэ.
 *
 * `max` заагаагүй бол дээд хязгааргүй — орлого авахад ирж буй тоо нь
 * агуулахын үлдэгдлээр хязгаарлагдахгүй.
 */
export function QtyStepper({
  label,
  value,
  max,
  accent = '#007AFF',
  onChange,
}: {
  label: string;
  value: number;
  max?: number;
  accent?: string;
  onChange: (next: number) => void;
}) {
  const cap = (next: number) => (max === undefined ? Math.max(0, next) : Math.max(0, Math.min(next, max)));

  const set = (next: number) => {
    const clamped = cap(next);
    if (clamped === value) return;
    tapFeedback();
    onChange(clamped);
  };

  return (
    <div className="flex-1 min-w-0">
      <span className="block text-[10px] font-bold uppercase tracking-[0.06em] text-[#AEAEB2] mb-1">
        {label}
      </span>
      <div
        className="flex items-stretch h-11 rounded-xl border overflow-hidden transition-colors"
        style={{
          borderColor: value > 0 ? `${accent}55` : '#E8ECF0',
          background: value > 0 ? `${accent}0D` : '#F5F6FA',
        }}
      >
        <button
          type="button"
          aria-label={`${label} хасах`}
          onClick={() => set(value - 1)}
          disabled={value <= 0}
          className="w-11 flex-shrink-0 grid place-items-center active:scale-[0.88] transition-transform disabled:opacity-25"
        >
          <Minus className="w-4 h-4" style={{ color: accent }} />
        </button>
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value === 0 ? '' : String(value)}
          placeholder="0"
          aria-label={label}
          onChange={(e) => {
            const digits = e.target.value.replace(/\D/g, '');
            onChange(cap(parseInt(digits, 10) || 0));
          }}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 bg-transparent text-center text-[16px] font-bold text-[#1A1D26] tabular-nums outline-none placeholder:text-[#C7C7CC] placeholder:font-medium"
        />
        <button
          type="button"
          aria-label={`${label} нэмэх`}
          onClick={() => set(value + 1)}
          disabled={max !== undefined && value >= max}
          className="w-11 flex-shrink-0 grid place-items-center active:scale-[0.88] transition-transform disabled:opacity-25"
        >
          <Plus className="w-4 h-4" style={{ color: accent }} />
        </button>
      </div>
    </div>
  );
}
