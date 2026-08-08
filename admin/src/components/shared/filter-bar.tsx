'use client';

import type { ReactNode } from 'react';
import { Search } from 'lucide-react';

/** Шүүлтүүрийн мөрийн нэгдсэн байршуулагч. */
export function FilterBar({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <div className={`flex flex-wrap items-end gap-2.5 bg-white rounded-2xl border border-[#E8ECF0]/70 shadow-sm p-3 ${className}`}>
      {children}
    </div>
  );
}

const fieldWrap = 'flex flex-col gap-1';
const labelCls = 'text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide';
const controlCls =
  'h-9 px-3 rounded-xl bg-[#F5F6FA] border border-transparent text-[13px] text-[#1A1D26] outline-none focus:border-[#007AFF]/40 focus:bg-white transition-all';

export function DateField({ label, value, onChange }: { label?: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className={fieldWrap}>
      {label && <span className={labelCls}>{label}</span>}
      <input type="date" value={value} onChange={(e) => onChange(e.target.value)} className={controlCls} />
    </label>
  );
}

export interface SelectOption {
  value: string;
  label: string;
}

export function SelectField({
  label,
  value,
  onChange,
  options,
  placeholder,
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  options: SelectOption[];
  placeholder?: string;
}) {
  return (
    <label className={fieldWrap}>
      {label && <span className={labelCls}>{label}</span>}
      <select value={value} onChange={(e) => onChange(e.target.value)} className={`${controlCls} min-w-[140px]`}>
        {placeholder !== undefined && <option value="">{placeholder}</option>}
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function SearchField({
  label,
  value,
  onChange,
  placeholder = 'Хайх...',
  className = '',
}: {
  label?: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string;
}) {
  return (
    <label className={`${fieldWrap} ${className}`}>
      {label && <span className={labelCls}>{label}</span>}
      <div className="flex items-center gap-2 h-9 px-3 rounded-xl bg-[#F5F6FA] border border-transparent focus-within:border-[#007AFF]/40 focus-within:bg-white transition-all">
        <Search className="w-4 h-4 text-[#8C8FA3] shrink-0" />
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="bg-transparent text-[13px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none flex-1 min-w-0"
        />
      </div>
    </label>
  );
}

/** Primary үйлдлийн товч (шүүлт хэрэглэх г.м). */
export function ActionButton({
  children,
  onClick,
  disabled,
  variant = 'primary',
}: {
  children: ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'ghost';
}) {
  const base = 'h-9 px-4 rounded-xl text-[13px] font-semibold transition-all disabled:opacity-50 inline-flex items-center gap-1.5';
  const styles =
    variant === 'primary'
      ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25 hover:brightness-105'
      : 'bg-white border border-[#E5E5EA] text-[#4A4D5C] hover:bg-[#F2F4F7]';
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${styles}`}>
      {children}
    </button>
  );
}
