'use client';

import { useId } from 'react';

/**
 * Мөнгөн дүн оруулах талбар — бичиж байхад мянгатыг таслалаар тусгаарлаж харуулна
 * (1000000 -> 1,000,000).
 *
 * Гаднаа энгийн тоон утга (string) дамжуулна — таслал нь зөвхөн харагдац.
 * `type="text"` ашигласан шалтгаан: `type="number"` таслалыг зөвшөөрдөггүй тул
 * форматлах боломжгүй.
 */

/** "1,234.5" -> "1234.5". Тоо болон нэг цэгээс бусдыг хаяна. */
export function parseMoney(display: string): string {
  const cleaned = String(display ?? '').replace(/[^\d.]/g, '');
  const firstDot = cleaned.indexOf('.');
  if (firstDot === -1) return cleaned;
  // Хоёр дахь цэгээс хойшхыг хаяна.
  return cleaned.slice(0, firstDot + 1) + cleaned.slice(firstDot + 1).replace(/\./g, '');
}

/** "1234.5" -> "1,234.5". Бутархай хэсгийг хөндөхгүй. */
export function formatMoney(raw: string): string {
  const value = parseMoney(raw);
  if (value === '') return '';
  const [int, frac] = value.split('.');
  const withCommas = int.replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return frac !== undefined ? `${withCommas}.${frac}` : withCommas;
}

export function MoneyInput({
  value,
  onChange,
  className,
  placeholder = '0',
  required,
  disabled,
  min,
  'aria-label': ariaLabel,
}: {
  /** Түүхий тоон утга, жишээ нь "1000000". */
  value: string;
  /** Түүхий тоон утгыг буцаана (таслалгүй). */
  onChange: (raw: string) => void;
  className?: string;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  'aria-label'?: string;
}) {
  const id = useId();
  const num = Number(parseMoney(value));
  const belowMin = min !== undefined && value !== '' && !Number.isNaN(num) && num < min;

  return (
    <>
      <input
        id={id}
        type="text"
        inputMode="decimal"
        autoComplete="off"
        value={formatMoney(value)}
        onChange={(e) => onChange(parseMoney(e.target.value))}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        aria-label={ariaLabel}
        aria-invalid={belowMin || undefined}
        className={className}
      />
      {belowMin && (
        <p className="mt-1 text-[12px] font-medium text-[#FF3B30]">
          Дүн {min}-с багагүй байх ёстой.
        </p>
      )}
    </>
  );
}
