'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ChevronLeft, Wallet, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { formatMnt } from '@/components/shared/money';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { PAYMENT_METHODS } from '@/lib/options';

export default function NewPaymentPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ customerId: '', amount: '', method: 'CASH', bankAccountId: '', externalRef: '', notes: '' });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    api.get('/api/customers?limit=100').then(res => setCustomers(res.data?.data ?? [])).catch((err) => { console.error('Failed to load customers', err); });
    api.get('/api/bank-accounts').then(res => setBankAccounts(res.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    if (form.customerId) {
      const c = customers.find((c: any) => c.id === form.customerId);
      setSelectedCustomer(c ?? null);
    } else {
      setSelectedCustomer(null);
    }
  }, [form.customerId, customers]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.bankAccountId) {
      alert('Данс заавал сонгоно уу (төлбөр хүлээн авсан данс)');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/payments', {
        customerId: form.customerId,
        amount: Number(form.amount),
        method: form.method,
        bankAccountId: form.bankAccountId,
        reference: form.externalRef || undefined,
        note: form.notes || undefined,
      });
      router.push('/payments');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Алдаа гарлаа';
      alert('Алдаа: ' + msg);
    } finally {
      setSubmitting(false);
    }
  };

  const inputClass = "w-full px-3.5 py-3 rounded-xl bg-[#F5F6FA] border border-transparent text-[14px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none transition-all focus:border-[#007AFF]/40 focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10";
  const labelClass = "block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5";

  return (
    <div className="space-y-5 animate-ios-fade-in mx-auto w-full max-w-2xl">
      <button onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-[13px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors active:scale-[0.97]">
        <ChevronLeft className="w-4 h-4" /> Төлбөр
      </button>

      <PageHeader title="Төлбөр бүртгэх" subtitle="Харилцагчийн төлбөр хүлээн авах" icon={Wallet} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard>
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Харилцагч</label>
              {customers.length === 0 ? (
                <a href="/customers" className="flex items-start gap-2.5 px-4 py-3 rounded-xl bg-[#FF3B30]/[0.06] border border-[#FF3B30]/15 text-[13px] text-[#B91C1C] font-medium hover:bg-[#FF3B30]/[0.1] transition-all">
                  <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-[#FF3B30]" />
                  <span>Харилцагч бүртгээгүй байна. Эхлээд харилцагч бүртгэнэ үү. <span className="underline font-bold">Харилцагч бүртгэх</span></span>
                </a>
              ) : (
                <SearchableSelect
                  value={form.customerId}
                  onChange={v => setForm(prev => ({ ...prev, customerId: v }))}
                  options={customers.map((c: any) => ({ value: c.id, label: c.storeName }))}
                  required
                  inputClassName={inputClass}
                  widthClass="w-full"
                  aria-label="Харилцагч"
                />
              )}
            </div>

            {selectedCustomer && (
              <div className="rounded-xl bg-[#FF3B30]/[0.06] border border-[#FF3B30]/15 p-3.5">
                <p className="text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide">Одоогийн өр</p>
                <p className="text-[22px] font-bold text-[#FF3B30] tabular-nums mt-0.5">{formatMnt(selectedCustomer.outstandingDebt ?? 0)}</p>
              </div>
            )}

            <div>
              <label className={labelClass}>Дүн (₮)</label>
              <input type="number" min="1" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} required placeholder="0" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Төлбөрийн хэлбэр</label>
              <SearchableSelect
                value={form.method}
                onChange={v => setForm(prev => ({ ...prev, method: v }))}
                options={PAYMENT_METHODS}
                inputClassName={inputClass}
                widthClass="w-full"
                aria-label="Төлбөрийн хэлбэр"
              />
            </div>

            <div>
              <label className={labelClass}>Хүлээн авсан данс *</label>
              <SearchableSelect
                value={form.bankAccountId}
                onChange={v => setForm(prev => ({ ...prev, bankAccountId: v }))}
                options={bankAccounts.map((acc: any) => ({
                  value: acc.id,
                  label: `${acc.bankName} — ${acc.accountNumber} (${acc.holderName})`,
                }))}
                emptyText="Данс сонгох..."
                required
                inputClassName={inputClass}
                widthClass="w-full"
                aria-label="Хүлээн авсан данс"
              />
              {bankAccounts.length === 0 && (
                <p className="text-[11px] text-[#FF3B30] mt-1.5">Данс бүртгэгдээгүй байна. Эхлээд "Данс" цэсээс шинэ данс үүсгэнэ үү.</p>
              )}
            </div>

            <div>
              <label className={labelClass}>Лавлагааны дугаар</label>
              <input type="text" value={form.externalRef} onChange={e => setForm(prev => ({ ...prev, externalRef: e.target.value }))} placeholder="Заавал биш" className={inputClass} />
            </div>

            <div>
              <label className={labelClass}>Тэмдэглэл</label>
              <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Нэмэлт мэдээлэл..." rows={2} className={`${inputClass} resize-none`} />
            </div>
          </div>
        </SectionCard>

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#4A4D5C] bg-white border border-[#E8ECF0]/70 hover:bg-[#F2F4F7] transition-all active:scale-[0.97]">
            Цуцлах
          </button>
          <button type="submit" disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] disabled:opacity-60 hover:brightness-105"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            {submitting ? 'Хадгалж байна...' : 'Төлбөр бүртгэх'}
          </button>
        </div>
      </form>
    </div>
  );
}
