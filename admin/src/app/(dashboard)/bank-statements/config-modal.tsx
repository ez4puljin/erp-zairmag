'use client';

import { useEffect, useState } from 'react';
import { X, Zap, Percent } from 'lucide-react';
import api from '@/lib/api';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';
import { ActionButton } from '@/components/shared/filter-bar';
import type { StatementConfig } from './types';

const inputCls =
  'h-9 w-full px-3 rounded-xl bg-[#F5F6FA] border border-transparent text-[13px] text-[#1A1D26] ' +
  'placeholder-[#8C8FA3] outline-none focus:border-[#007AFF]/40 focus:bg-white transition-all';

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-[12px] font-medium text-[#8C8FA3] mb-1">{label}</span>
      {children}
    </label>
  );
}

/**
 * Хуулга оруулах үед ПОС орлого болон банкны шимтгэлийн мөрийг автоматаар
 * бөглөх дүрэм. Тохиргоо нь дараагийн импортод хэрэгжинэ.
 */
export function ConfigModal({
  open,
  customers,
  expenseCategories,
  onClose,
}: {
  open: boolean;
  customers: SelectOption[];
  expenseCategories: SelectOption[];
  onClose: () => void;
}) {
  const [config, setConfig] = useState<StatementConfig | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void api
      .get('/api/bank-statements/config')
      .then((r) => setConfig(r.data))
      .catch(() => {});
  }, [open]);

  if (!open) return null;

  const patch = (data: Partial<StatementConfig>) => setConfig((c) => (c ? { ...c, ...data } : c));

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await api.patch('/api/bank-statements/config', {
        settlementCustomerId: config.settlementCustomerId ?? '',
        settlementDescription: config.settlementDescription,
        feeExpenseCategoryId: config.feeExpenseCategoryId ?? '',
        feeDescription: config.feeDescription,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-ios-scale-in">
        <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4 bg-white border-b border-[#F0F2F5]">
          <h3 className="text-[17px] font-bold text-[#1A1D26]">Автомат бөглөлт</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg text-[#8C8FA3] hover:bg-[#F2F4F7]">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-6">
          <p className="text-[12px] text-[#8C8FA3]">
            Эдгээр дүрэм нь <b>дараа оруулах</b> хуулганд хэрэгжинэ. Оруулсан хуулгын мөрүүдийг
            хүснэгтээс шууд засна.
          </p>

          {config && (
            <>
              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-[13px] font-semibold text-[#1A1D26]">
                  <Zap className="w-4 h-4 text-[#5856D6]" /> ПОС орлого (SETTLEMENT)
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Харилцагч">
                    <SearchableSelect
                      value={config.settlementCustomerId ?? ''}
                      onChange={(v) => patch({ settlementCustomerId: v || null })}
                      options={customers}
                      placeholder="Сонгоогүй"
                      emptyText="Сонгоогүй"
                      inputClassName={inputCls}
                      widthClass="w-full"
                      aria-label="ПОС харилцагч"
                    />
                  </Field>
                  <Field label="Тайлбар">
                    <input
                      className={inputCls}
                      value={config.settlementDescription}
                      onChange={(e) => patch({ settlementDescription: e.target.value })}
                      placeholder="Пос орлого"
                    />
                  </Field>
                </div>
                <p className="text-[11px] text-[#8C8FA3]">
                  Банкны утгад SETTLEMENT гэж байвал ПОС орлого гэж таньж, тайлбар дээр банкны
                  утгыг залгаж бөглөнө.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-[13px] font-semibold text-[#1A1D26]">
                  <Percent className="w-4 h-4 text-[#F59E0B]" /> Банкны шимтгэл
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Зардлын ангилал">
                    <SearchableSelect
                      value={config.feeExpenseCategoryId ?? ''}
                      onChange={(v) => patch({ feeExpenseCategoryId: v || null })}
                      options={expenseCategories}
                      placeholder="Сонгоогүй"
                      emptyText="Сонгоогүй"
                      inputClassName={inputCls}
                      widthClass="w-full"
                      aria-label="Шимтгэлийн ангилал"
                    />
                  </Field>
                  <Field label="Тайлбар">
                    <input
                      className={inputCls}
                      value={config.feeDescription}
                      onChange={(e) => patch({ feeDescription: e.target.value })}
                      placeholder="Банкны шимтгэл"
                    />
                  </Field>
                </div>
                <p className="text-[11px] text-[#8C8FA3]">
                  Банкны утгад "хураамж", "commission" гэх мэт үг байвал шимтгэл гэж танина.
                </p>
              </section>
            </>
          )}
        </div>

        <div className="sticky bottom-0 flex justify-end gap-2 px-5 py-4 bg-white border-t border-[#F0F2F5]">
          <ActionButton variant="ghost" onClick={onClose}>
            Хаах
          </ActionButton>
          <ActionButton onClick={() => void save()} disabled={saving || !config}>
            {saving ? 'Хадгалж…' : 'Хадгалах'}
          </ActionButton>
        </div>
      </div>
    </div>
  );
}
