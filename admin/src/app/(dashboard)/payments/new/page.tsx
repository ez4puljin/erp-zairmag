'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ChevronLeft } from 'lucide-react';

export default function NewPaymentPage() {
  const router = useRouter();
  const [customers, setCustomers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({ customerId: '', amount: '', method: 'CASH', externalRef: '', notes: '' });
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);

  useEffect(() => {
    api.get('/api/customers?limit=100').then(res => setCustomers(res.data?.data ?? [])).catch((err) => { console.error('Failed to load customers', err); });
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
    setSubmitting(true);
    try {
      await api.post('/api/payments', {
        customerId: form.customerId,
        amount: Number(form.amount),
        method: form.method,
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

  const inputClass = "w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white";
  const labelClass = "block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5";

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-2xl">
      <div>
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[15px] text-[#007AFF] font-medium hover:text-[#0066D6] transition-colors mb-3 active:scale-[0.97]">
          <ChevronLeft className="w-5 h-5" /> Төлбөр
        </button>
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Төлбөр бүртгэх</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5 space-y-4">
          <div>
            <label className={labelClass}>Харилцагч</label>
            <select value={form.customerId} onChange={e => setForm(prev => ({ ...prev, customerId: e.target.value }))} required className={inputClass}>
              <option value="">Сонгох...</option>
              {customers.map((c: any) => (<option key={c.id} value={c.id}>{c.storeName}</option>))}
            </select>
          </div>

          {selectedCustomer && (
            <div className="rounded-xl bg-[#FF3B30]/5 border border-[#FF3B30]/10 p-3">
              <p className="text-[13px] text-[#8E8E93]">Одоогийн өр</p>
              <p className="text-[20px] font-bold text-[#FF3B30]">₮{Number(selectedCustomer.outstandingDebt ?? 0).toLocaleString()}</p>
            </div>
          )}

          <div>
            <label className={labelClass}>Дүн (₮)</label>
            <input type="number" min="1" value={form.amount} onChange={e => setForm(prev => ({ ...prev, amount: e.target.value }))} required placeholder="0" className={inputClass} />
          </div>

          <div>
            <label className={labelClass}>Төлбөрийн хэлбэр</label>
            <select value={form.method} onChange={e => setForm(prev => ({ ...prev, method: e.target.value }))} className={inputClass}>
              <option value="CASH">Бэлэн мөнгө</option>
              <option value="BANK_TRANSFER">Банкны шилжүүлэг</option>
              <option value="MOBILE_MONEY">Мобайл төлбөр</option>
              <option value="CHECK">Чек</option>
            </select>
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

        <div className="flex items-center justify-end gap-3 mt-5">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/40 hover:bg-[#E5E5EA]/60 transition-all active:scale-[0.97]">
            Цуцлах
          </button>
          <button type="submit" disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            {submitting ? 'Хадгалж байна...' : 'Төлбөр бүртгэх'}
          </button>
        </div>
      </form>
    </div>
  );
}
