'use client';

import { useEffect, useState } from 'react';
import { Landmark, Zap, Check, Undo2 } from 'lucide-react';
import { Money } from '@/components/shared/money';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';
import type { BankTxn } from './types';

const cellInput =
  'h-8 w-full px-2 rounded-lg bg-[#F5F6FA] border border-transparent text-[13px] text-[#1A1D26] ' +
  'placeholder-[#B0B3C0] outline-none focus:border-[#007AFF]/40 focus:bg-white transition-all';

/**
 * Товшиж засах нүд. Фокус алдах эсвэл Enter дарахад л хадгална — товшилт
 * бүрд сервер рүү хүсэлт явуулахгүй.
 */
function EditCell({
  value,
  placeholder,
  disabled,
  onSave,
}: {
  value: string;
  placeholder?: string;
  disabled?: boolean;
  onSave: (v: string) => void;
}) {
  const [draft, setDraft] = useState(value);

  // Гаднаас (жишээ нь "утга нөхөх"-өөр) утга солигдвол оролтыг шинэчилнэ.
  useEffect(() => setDraft(value), [value]);

  if (disabled) {
    return <span className="text-[13px] text-[#4A4D5C]">{value || '—'}</span>;
  }

  return (
    <input
      className={cellInput}
      value={draft}
      placeholder={placeholder}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onSave(draft);
      }}
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

export function TxnTable({
  transactions,
  customers,
  expenseCategories,
  onChange,
  onPost,
  onUnpost,
  busyId,
}: {
  transactions: BankTxn[];
  customers: SelectOption[];
  expenseCategories: SelectOption[];
  onChange: (txnId: string, patch: Partial<BankTxn>) => void;
  onPost: (txnId: string) => void;
  onUnpost: (txnId: string) => void;
  busyId: string | null;
}) {
  if (transactions.length === 0) {
    return <p className="py-10 text-center text-[13px] text-[#8C8FA3]">Гүйлгээ алга</p>;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[13px]">
        <thead>
          <tr className="border-b border-[#F0F2F5]">
            {['Огноо', 'Дүн', 'Банкны утга', 'Харилцагч / Зардлын ангилал', 'Тайлбар', ''].map(
              (h, i) => (
                <th
                  key={i}
                  className="px-3 py-2.5 text-left font-semibold text-[11px] uppercase tracking-wide text-[#8C8FA3] whitespace-nowrap"
                >
                  {h}
                </th>
              ),
            )}
          </tr>
        </thead>
        <tbody>
          {transactions.map((t) => {
            const posted = !!t.postedAt;
            const busy = busyId === t.id;
            // Орлого бол харилцагч, зарлага бол зардлын ангилал сонгоно.
            const ready = t.isIncome ? !!t.customerId : !!t.expenseCategoryId;
            return (
              <tr
                key={t.id}
                className={`border-b border-[#F7F8FA] align-top ${
                  posted ? 'bg-[#F0FDF4]/70' : t.isFee ? 'bg-[#FFFBEB]/60' : ''
                }`}
              >
                <td className="px-3 py-2 whitespace-nowrap text-[#4A4D5C]">
                  {t.txnDate ? t.txnDate.slice(0, 10) : '—'}
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  <Money
                    value={t.isIncome ? t.credit : t.debit}
                    className={t.isIncome ? 'text-[#34C759] font-semibold' : 'text-[#FF3B30] font-semibold'}
                  />
                  <div className="text-[11px] text-[#8C8FA3]">{t.isIncome ? 'Орлого' : 'Зарлага'}</div>
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
                      <span className="px-1.5 py-0.5 rounded-md bg-[#FEF3C7] text-[#B45309] font-medium">
                        Шимтгэл
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 min-w-[200px]">
                  {posted ? (
                    <span className="text-[13px] text-[#4A4D5C]">
                      {t.isIncome ? t.customerName : t.expenseCategoryName}
                    </span>
                  ) : t.isIncome ? (
                    <SearchableSelect
                      value={t.customerId ?? ''}
                      onChange={(v) => onChange(t.id, { customerId: v || null })}
                      options={customers}
                      placeholder="Сонгоогүй"
                      emptyText="Харилцагч сонгох"
                      inputClassName={cellInput}
                      widthClass="w-full"
                      aria-label="Харилцагч"
                    />
                  ) : (
                    <SearchableSelect
                      value={t.expenseCategoryId ?? ''}
                      onChange={(v) => onChange(t.id, { expenseCategoryId: v || null })}
                      options={expenseCategories}
                      placeholder="Сонгоогүй"
                      emptyText="Ангилал сонгох"
                      inputClassName={cellInput}
                      widthClass="w-full"
                      aria-label="Зардлын ангилал"
                    />
                  )}
                </td>
                <td className="px-3 py-2 min-w-[210px]">
                  <EditCell
                    value={t.description}
                    placeholder="Тайлбар"
                    disabled={posted}
                    onSave={(v) => onChange(t.id, { description: v })}
                  />
                </td>
                <td className="px-3 py-2 whitespace-nowrap">
                  {posted ? (
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#DCFCE7] text-[#15803D] text-[12px] font-semibold">
                        <Check className="w-3.5 h-3.5" /> Бүртгэсэн
                      </span>
                      <button
                        onClick={() => onUnpost(t.id)}
                        disabled={busy}
                        className="p-1.5 rounded-lg text-[#8C8FA3] hover:bg-[#F2F4F7] disabled:opacity-40"
                        title="Буцаах"
                      >
                        <Undo2 className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => onPost(t.id)}
                      disabled={!ready || busy}
                      className="h-8 px-3 rounded-lg text-[12px] font-semibold bg-[#007AFF] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-105"
                      title={ready ? 'Бүртгэх' : 'Эхлээд харилцагч/ангилал сонгоно уу'}
                    >
                      Бүртгэх
                    </button>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
