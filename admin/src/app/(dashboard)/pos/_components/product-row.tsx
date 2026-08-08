'use client';

import { Minus, Plus, Trash2 } from 'lucide-react';
import { formatMnt } from '@/components/shared/money';
import { tapFeedback } from '../_lib/payment-methods';

/**
 * Тоо ширхэг оруулах stepper.
 *
 * Гар утсанд зориулж 44px хүрэх талбартай, төвийн тоо нь шууд засварлагдана.
 * Оролтын үсгийн хэмжээг 16px байлгасан нь iOS Safari дээр focus хийхэд
 * хуудсыг автоматаар томруулахаас сэргийлнэ.
 */
function Stepper({
  label,
  value,
  max,
  accent,
  onChange,
}: {
  label: string;
  value: number;
  max: number;
  accent: string;
  onChange: (next: number) => void;
}) {
  const set = (next: number) => {
    const clamped = Math.max(0, Math.min(next, max));
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
            onChange(Math.max(0, Math.min(parseInt(digits, 10) || 0, max)));
          }}
          onFocus={(e) => e.target.select()}
          className="flex-1 min-w-0 bg-transparent text-center text-[16px] font-bold text-[#1A1D26] tabular-nums outline-none placeholder:text-[#C7C7CC] placeholder:font-medium"
        />
        <button
          type="button"
          aria-label={`${label} нэмэх`}
          onClick={() => set(value + 1)}
          disabled={value >= max}
          className="w-11 flex-shrink-0 grid place-items-center active:scale-[0.88] transition-transform disabled:opacity-25"
        >
          <Plus className="w-4 h-4" style={{ color: accent }} />
        </button>
      </div>
    </div>
  );
}

/**
 * Гар утасны POS-ын барааны мөр.
 *
 * Хайрцаг / ширхэгийг тусад нь stepper-ээр оруулна — жижиг тоон талбар
 * онилохын оронд том товч дарж ажиллах нь машин доторх нөхцөлд илүү найдвартай.
 */
export function PosProductRow({
  name,
  unitPrice,
  remaining,
  unitsPerBox,
  quantity,
  index,
  onChange,
}: {
  name: string;
  unitPrice: number;
  remaining: number;
  unitsPerBox: number;
  /** Сагсанд байгаа тоо (ширхэгээр). */
  quantity: number;
  /** Жагсаалт дахь дараалал — гарч ирэх анимацийг шатлуулна. */
  index: number;
  onChange: (nextQty: number) => void;
}) {
  const inCart = quantity > 0;
  const byBox = unitsPerBox > 1;
  const boxes = byBox ? Math.floor(quantity / unitsPerBox) : 0;
  const pieces = byBox ? quantity % unitsPerBox : quantity;

  return (
    <div
      className="relative rounded-2xl bg-white border transition-colors animate-ios-slide-up"
      style={{
        borderColor: inCart ? '#34C759' : '#E8ECF0',
        boxShadow: inCart ? '0 1px 3px rgba(52,199,89,0.18)' : '0 1px 2px rgba(26,29,38,0.04)',
        animationDelay: `${Math.min(index, 10) * 25}ms`,
        animationDuration: '0.4s',
      }}
    >
      {/* Гарчиг + үнэ */}
      <div className="flex items-start justify-between gap-3 px-3.5 pt-3.5">
        <div className="min-w-0 flex-1">
          <p className="text-[15px] font-semibold text-[#1A1D26] leading-snug">{name}</p>
          <div className="flex items-center flex-wrap gap-x-2 gap-y-0.5 mt-1">
            <span className="text-[12px] text-[#8C8FA3]">
              Үлдэгдэл <span className="font-bold text-[#007AFF] tabular-nums">{remaining}</span>
              {byBox && (
                <span className="text-[#AEAEB2]">
                  {' '}
                  ({Math.floor(remaining / unitsPerBox)}х+{remaining % unitsPerBox}ш)
                </span>
              )}
            </span>
            {byBox && (
              <span className="text-[10px] font-semibold text-[#8C8FA3] bg-[#F2F4F7] rounded-md px-1.5 py-0.5">
                {unitsPerBox}ш/хайрцаг
              </span>
            )}
          </div>
        </div>
        <span className="text-[15px] font-bold text-[#1A1D26] tabular-nums flex-shrink-0">
          {formatMnt(unitPrice)}
        </span>
      </div>

      {/* Тоо оруулах */}
      <div className="flex items-end gap-2 px-3.5 pt-2.5 pb-3.5">
        {byBox ? (
          <>
            <Stepper
              label="Хайрцаг"
              value={boxes}
              max={Math.floor(remaining / unitsPerBox)}
              accent="#007AFF"
              onChange={(nextBoxes) => onChange(Math.min(nextBoxes * unitsPerBox + pieces, remaining))}
            />
            <Stepper
              label="Ширхэг"
              value={pieces}
              max={unitsPerBox - 1}
              accent="#FF9500"
              onChange={(nextPieces) =>
                onChange(Math.min(boxes * unitsPerBox + nextPieces, remaining))
              }
            />
          </>
        ) : (
          <Stepper
            label="Тоо ширхэг"
            value={quantity}
            max={remaining}
            accent="#34C759"
            onChange={onChange}
          />
        )}
        {inCart && (
          <button
            type="button"
            aria-label="Сагснаас хасах"
            onClick={() => {
              tapFeedback([12, 40, 12]);
              onChange(0);
            }}
            className="w-11 h-11 flex-shrink-0 rounded-xl bg-[#FF3B30]/10 grid place-items-center active:scale-[0.88] transition-transform"
          >
            <Trash2 className="w-4 h-4 text-[#FF3B30]" />
          </button>
        )}
      </div>

      {/* Сагсанд орсон дүн */}
      {inCart && (
        <div className="flex items-center justify-between gap-2 px-3.5 py-2 rounded-b-2xl bg-[#34C759]/8 border-t border-[#34C759]/15">
          <span className="text-[12px] font-semibold text-[#248A3D] tabular-nums">
            {byBox ? `${boxes}х${pieces > 0 ? ` + ${pieces}ш` : ''} = ${quantity}ш` : `${quantity}ш`}
          </span>
          <span className="text-[14px] font-bold text-[#248A3D] tabular-nums">
            {formatMnt(quantity * unitPrice)}
          </span>
        </div>
      )}
    </div>
  );
}
