'use client';

import { useState } from 'react';
import { Percent, Check, Undo2, ChevronDown, ChevronRight } from 'lucide-react';
import { Money } from '@/components/shared/money';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';
import type { BankStatement, BankTxn } from './types';

/**
 * Банкны шимтгэл — олон бага дүнтэй мөрийг үндсэн жагсаалтад холилдуулахгүй,
 * нийлбэрээр нь ганц зардал болгож хаана. Задаргааг нь хүсвэл дэлгэж харна.
 */
export function FeeCard({
  statement,
  feeTxns,
  expenseCategories,
  defaultCategoryId,
  busy,
  onPost,
  onUnpost,
}: {
  statement: BankStatement;
  feeTxns: BankTxn[];
  expenseCategories: SelectOption[];
  defaultCategoryId: string | null;
  busy: boolean;
  onPost: (categoryId: string) => void;
  onUnpost: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [categoryId, setCategoryId] = useState(defaultCategoryId ?? '');

  const { fee } = statement;
  if (fee.count === 0) return null;

  return (
    <div className="rounded-2xl border border-[#FDE68A] bg-[#FFFBEB] overflow-hidden">
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <div className="w-9 h-9 rounded-xl bg-[#F59E0B]/15 flex items-center justify-center shrink-0">
          <Percent className="w-4 h-4 text-[#B45309]" />
        </div>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-[#1A1D26]">
            Банкны шимтгэл · <Money value={fee.total} />
          </p>
          <p className="text-[12px] text-[#8C6A1F]">
            {fee.count} гүйлгээг нэгтгэж нэг зардал болгоно
            {fee.posted && fee.expenseNumber ? ` · Зардал #${fee.expenseNumber}` : ''}
          </p>
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {fee.posted ? (
            <>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#DCFCE7] text-[#15803D] text-[12px] font-semibold">
                <Check className="w-3.5 h-3.5" /> Бүртгэсэн
              </span>
              <button
                onClick={onUnpost}
                disabled={busy}
                className="inline-flex items-center gap-1 h-8 px-3 rounded-lg text-[12px] font-semibold bg-white border border-[#E5E5EA] text-[#4A4D5C] hover:bg-[#F2F4F7] disabled:opacity-40"
              >
                <Undo2 className="w-3.5 h-3.5" /> Буцаах
              </button>
            </>
          ) : (
            <>
              <SearchableSelect
                value={categoryId}
                onChange={setCategoryId}
                options={expenseCategories}
                placeholder="Сонгоогүй"
                emptyText="Зардлын ангилал"
                widthClass="min-w-[190px]"
                aria-label="Шимтгэлийн зардлын ангилал"
              />
              <button
                onClick={() => onPost(categoryId)}
                disabled={!categoryId || busy}
                className="h-8 px-3 rounded-lg text-[12px] font-semibold bg-[#B45309] text-white disabled:opacity-30 disabled:cursor-not-allowed hover:brightness-110"
              >
                Зардал болгож хаах
              </button>
            </>
          )}
          <button
            onClick={() => setOpen((v) => !v)}
            className="inline-flex items-center gap-1 h-8 px-2 rounded-lg text-[12px] font-medium text-[#8C6A1F] hover:bg-white/60"
          >
            {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            Задаргаа
          </button>
        </div>
      </div>

      {open && (
        <div className="border-t border-[#FDE68A] bg-white/60 px-4 py-2">
          {feeTxns.map((t) => (
            <div
              key={t.id}
              className="flex items-center justify-between gap-3 py-1.5 text-[12px] border-b border-[#FDE68A]/50 last:border-0"
            >
              <span className="text-[#8C6A1F] w-20 shrink-0">
                {t.txnDate ? t.txnDate.slice(0, 10) : '—'}
              </span>
              <span className="flex-1 truncate text-[#4A4D5C]">{t.bankDescription || '—'}</span>
              <Money value={t.debit} className="font-semibold text-[#1A1D26]" />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
