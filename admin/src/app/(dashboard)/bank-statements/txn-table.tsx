'use client';

import { useEffect, useState } from 'react';
import { Landmark, Zap } from 'lucide-react';
import { Money } from '@/components/shared/money';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';
import { ACTION_OPTIONS, type BankTxn, type CrossAccount } from './types';

const cellInput =
  'h-8 w-full px-2 rounded-lg bg-[#F5F6FA] border border-transparent text-[13px] text-[#1A1D26] ' +
  'placeholder-[#B0B3C0] outline-none focus:border-[#007AFF]/40 focus:bg-white transition-all';

/**
 * Товшиж засах нүд. Утгыг фокус алдах эсвэл Enter дарахад л хадгална —
 * товшилт бүрд сервер рүү хүсэлт явуулахгүй.
 */
function EditCell({
  value,
  placeholder,
  onSave,
}: {
  value: string;
  placeholder?: string;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  // Гаднаас (жишээ нь "утга нөхөх"-өөр) утга солигдвол оролтыг шинэчилнэ.
  useEffect(() => setDraft(value), [value]);

  const commit = () => {
    if (draft !== value) onSave(draft);
  };

  return (
    <input
      className={cellInput}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === 'Enter') e.currentTarget.blur();
        if (e.key === 'Escape') {
          setDraft(value);
          e.currentTarget.blur();
        }
      }}
    />
  );
}

/**
 * Харьцсан данс — бэлэн жагсаалтаас сонгох боловч гараас шинэ код бичих
 * боломжтой байх ёстой тул энгийн оролт + бэлэн сонголтын хослол.
 */
function CrossAccountCell({
  value,
  presets,
  onSave,
}: {
  value: string;
  presets: CrossAccount[];
  onSave: (v: string) => void;
}) {
  const options: SelectOption[] = presets.map((p) => ({
    value: p.code,
    label: p.label ? `${p.code} · ${p.label}` : p.code,
  }));
  // Бэлэн жагсаалтад байхгүй кодыг гараар бичсэн бол сонголт болгон нэмнэ.
  if (value && !options.some((o) => o.value === value)) {
    options.unshift({ value, label: value });
  }

  if (presets.length === 0) {
    return <EditCell value={value} placeholder="Код" onSave={onSave} />;
  }

  return (
    <SearchableSelect
      value={value}
      onChange={onSave}
      options={options}
      placeholder="Сонгоогүй"
      emptyText="Сонгоогүй"
      inputClassName={cellInput}
      widthClass="w-full"
      aria-label="Харьцсан данс"
    />
  );
}

export function TxnTable({
  transactions,
  customers,
  crossAccounts,
  onChange,
}: {
  transactions: BankTxn[];
  customers: SelectOption[];
  crossAccounts: CrossAccount[];
  onChange: (txnId: string, patch: Partial<BankTxn>) => void;
}) {
  if (transactions.length === 0) {
    return <p className="py-10 text-center text-[13px] text-[#8C8FA3]">Гүйлгээ алга</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#F0F2F5]">
            {['Огноо', 'Дүн', 'Банкны утга', 'Харилцагч', 'Харьцсан данс', 'Гүйлгээний утга', 'Үйлдэл'].map((h) => (
              <th
                key={h}
                className="px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wide text-[#8C8FA3] whitespace-nowrap"
              >
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const isIncome = t.credit > 0;
            return (
              <tr
                key={t.id}
                className={`border-b border-[#F7F8FA] align-top ${t.isFee ? 'bg-[#FFFBEB]/60' : ''}`}
              >
                <td className="px-3 py-2 whitespace-nowrap text-[#4A4D5C]">
                  {t.txnDate ? t.txnDate.slice(0, 10) : '—'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Money
                    value={isIncome ? t.credit : t.debit}
                    className={isIncome ? 'text-[#34C759] font-semibold' : 'text-[#FF3B30] font-semibold'}
                  />
                  <div className="text-[11px] text-[#8C8FA3]">{isIncome ? 'Орлого' : 'Зарлага'}</div>
                </td>
                <td className="px-3 py-2 min-w-[220px] max-w-[320px]">
                  <div className="text-[#1A1D26] break-words">{t.bankDescription || '—'}</div>
                  <div className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-[#8C8FA3]">
                    {t.bankCounterpart && (
                      <span className="inline-flex items-center gap-1">
                        <Landmark className="w-3 h-3" />
                        {t.bankCounterpart}
                      </span>
                    )}
                    {t.isSettlement && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-[#EEF2FF] text-[#5856D6] font-medium">
                        <Zap className="w-3 h-3" /> ПОС
                      </span>
                    )}
                    {t.isFee && (
                      <span className="px-1.5 py-0.5 rounded-md bg-[#FEF3C7] text-[#B45309] font-medium">Шимтгэл</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 min-w-[190px]">
                  <SearchableSelect
                    value={t.partnerName}
                    onChange={(v) => onChange(t.id, { partnerName: v })}
                    options={customers}
                    placeholder="Сонгоогүй"
                    emptyText="Сонгоогүй"
                    inputClassName={cellInput}
                    widthClass="w-full"
                    aria-label="Харилцагч"
                  />
                </td>
                <td className="px-3 py-2 min-w-[160px]">
                  <CrossAccountCell
                    value={t.partnerAccount}
                    presets={crossAccounts}
                    onSave={(v) => onChange(t.id, { partnerAccount: v })}
                  />
                </td>
                <td className="px-3 py-2 min-w-[220px]">
                  <EditCell
                    value={t.customDescription}
                    placeholder="Гүйлгээний утга"
                    onSave={(v) => onChange(t.id, { customDescription: v })}
                  />
                </td>
                <td className="px-3 py-2 min-w-[150px]">
                  <SearchableSelect
                    value={t.action}
                    onChange={(v) => onChange(t.id, { action: v })}
                    options={ACTION_OPTIONS}
                    placeholder="Сонгоогүй"
                    emptyText="Сонгоогүй"
                    inputClassName={cellInput}
                    widthClass="w-full"
                    aria-label="Үйлдэл"
                  />
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
