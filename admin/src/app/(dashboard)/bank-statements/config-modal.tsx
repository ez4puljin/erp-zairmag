'use client';

import { useEffect, useState } from 'react';
import { X, Plus, Trash2, Zap, Percent } from 'lucide-react';
import api from '@/lib/api';
import { SearchableSelect, type SelectOption } from '@/components/shared/searchable-select';
import { ActionButton } from '@/components/shared/filter-bar';
import { ACTION_OPTIONS, type CrossAccount, type StatementConfig } from './types';

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
 * Хуулга оруулах үед автоматаар бөглөгдөх дүрмүүд, мөн харьцсан дансны
 * бэлэн жагсаалтыг удирдана. Тохиргоо нь дараагийн импортод хэрэгжинэ.
 */
export function ConfigModal({
  open,
  customers,
  onClose,
}: {
  open: boolean;
  customers: SelectOption[];
  onClose: () => void;
}) {
  const [config, setConfig] = useState<StatementConfig | null>(null);
  const [crossAccounts, setCrossAccounts] = useState<CrossAccount[]>([]);
  const [newCode, setNewCode] = useState('');
  const [newLabel, setNewLabel] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    void Promise.all([
      api.get('/api/bank-statements/config').then((r) => setConfig(r.data)),
      api.get('/api/bank-statements/config/cross-accounts').then((r) => setCrossAccounts(r.data)),
    ]).catch(() => {});
  }, [open]);

  if (!open) return null;

  const patch = (data: Partial<StatementConfig>) => {
    setConfig((c) => (c ? { ...c, ...data } : c));
  };

  const save = async () => {
    if (!config) return;
    setSaving(true);
    try {
      const { id, ...body } = config;
      await api.patch('/api/bank-statements/config', body);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  const addCross = async () => {
    const code = newCode.trim();
    if (!code) return;
    const r = await api.post('/api/bank-statements/config/cross-accounts', {
      code,
      label: newLabel.trim(),
      sortOrder: crossAccounts.length,
    });
    setCrossAccounts((list) => [...list, r.data]);
    setNewCode('');
    setNewLabel('');
  };

  const removeCross = async (id: string) => {
    await api.delete(`/api/bank-statements/config/cross-accounts/${id}`);
    setCrossAccounts((list) => list.filter((c) => c.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative w-full max-w-2xl max-h-[88vh] overflow-y-auto rounded-2xl bg-white shadow-2xl animate-ios-scale-in">
        <div className="sticky top-0 flex items-center justify-between gap-3 px-5 py-4 bg-white border-b border-[#F0F2F5]">
          <h3 className="text-[17px] font-bold text-[#1A1D26]">Хуулгын тохиргоо</h3>
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
                      value={config.settlementPartnerName}
                      onChange={(v) => patch({ settlementPartnerName: v })}
                      options={customers}
                      placeholder="Сонгоогүй"
                      emptyText="Сонгоогүй"
                      inputClassName={inputCls}
                      widthClass="w-full"
                      aria-label="ПОС харилцагч"
                    />
                  </Field>
                  <Field label="Харьцсан данс">
                    <input
                      className={inputCls}
                      value={config.settlementPartnerAccount}
                      onChange={(e) => patch({ settlementPartnerAccount: e.target.value })}
                      placeholder="Код"
                    />
                  </Field>
                  <Field label="Гүйлгээний утга">
                    <input
                      className={inputCls}
                      value={config.settlementDescription}
                      onChange={(e) => patch({ settlementDescription: e.target.value })}
                      placeholder="Пос орлого"
                    />
                  </Field>
                  <Field label="Үйлдэл">
                    <SearchableSelect
                      value={config.settlementAction}
                      onChange={(v) => patch({ settlementAction: v })}
                      options={ACTION_OPTIONS}
                      placeholder="Сонгоогүй"
                      emptyText="Сонгоогүй"
                      inputClassName={inputCls}
                      widthClass="w-full"
                      aria-label="ПОС үйлдэл"
                    />
                  </Field>
                </div>
                <p className="text-[11px] text-[#8C8FA3]">
                  Банкны утгад SETTLEMENT гэж байвал ПОС орлого гэж тооцно. Гүйлгээний утга нь
                  энэ бичвэр дээр банкны утгыг залгаж бөглөнө.
                </p>
              </section>

              <section className="space-y-3">
                <h4 className="flex items-center gap-2 text-[13px] font-semibold text-[#1A1D26]">
                  <Percent className="w-4 h-4 text-[#F59E0B]" /> Банкны шимтгэл
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <Field label="Харилцагч">
                    <SearchableSelect
                      value={config.feePartnerName}
                      onChange={(v) => patch({ feePartnerName: v })}
                      options={customers}
                      placeholder="Сонгоогүй"
                      emptyText="Сонгоогүй"
                      inputClassName={inputCls}
                      widthClass="w-full"
                      aria-label="Шимтгэлийн харилцагч"
                    />
                  </Field>
                  <Field label="Харьцсан данс">
                    <input
                      className={inputCls}
                      value={config.feePartnerAccount}
                      onChange={(e) => patch({ feePartnerAccount: e.target.value })}
                      placeholder="Код"
                    />
                  </Field>
                  <Field label="Гүйлгээний утга">
                    <input
                      className={inputCls}
                      value={config.feeDescription}
                      onChange={(e) => patch({ feeDescription: e.target.value })}
                      placeholder="Банкны шимтгэл"
                    />
                  </Field>
                  <Field label="Үйлдэл">
                    <SearchableSelect
                      value={config.feeAction}
                      onChange={(v) => patch({ feeAction: v })}
                      options={ACTION_OPTIONS}
                      placeholder="Сонгоогүй"
                      emptyText="Сонгоогүй"
                      inputClassName={inputCls}
                      widthClass="w-full"
                      aria-label="Шимтгэлийн үйлдэл"
                    />
                  </Field>
                </div>
              </section>
            </>
          )}

          <section className="space-y-3">
            <h4 className="text-[13px] font-semibold text-[#1A1D26]">Харьцсан дансны жагсаалт</h4>
            <p className="text-[11px] text-[#8C8FA3]">
              Энд нэмсэн кодууд гүйлгээний хүснэгтэд бэлэн сонголт болж гарна.
            </p>
            <div className="space-y-1.5">
              {crossAccounts.map((c) => (
                <div key={c.id} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#F5F6FA]">
                  <span className="text-[13px] font-semibold text-[#1A1D26] w-20 shrink-0">{c.code}</span>
                  <span className="text-[13px] text-[#4A4D5C] flex-1 truncate">{c.label || '—'}</span>
                  <button
                    onClick={() => void removeCross(c.id)}
                    className="p-1.5 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10"
                    aria-label="Устгах"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
              {crossAccounts.length === 0 && (
                <p className="text-[12px] text-[#8C8FA3] py-2">Одоогоор нэмээгүй байна.</p>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <input
                className={`${inputCls} w-28`}
                value={newCode}
                onChange={(e) => setNewCode(e.target.value)}
                placeholder="Код"
              />
              <input
                className={`${inputCls} flex-1 min-w-[140px]`}
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="Тайлбар"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') void addCross();
                }}
              />
              <ActionButton onClick={() => void addCross()} disabled={!newCode.trim()}>
                <Plus className="w-4 h-4" /> Нэмэх
              </ActionButton>
            </div>
          </section>
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
