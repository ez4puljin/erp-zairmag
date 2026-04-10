'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ChevronLeft } from 'lucide-react';

export default function NewCustomerPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    storeName: '', contactName: '', phone: '', address: '',
    customerCategoryId: '', pricingTier: 'STANDARD',
    creditLimit: '', openingBalance: '',
  });

  useEffect(() => {
    api.get('/api/customer-categories')
      .then(res => setCategories(res.data ?? []))
      .catch(() => setError('Бүс нутгийн ангилал ачааллахад алдаа гарлаа'));
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/api/customers', {
        storeName: form.storeName,
        contactName: form.contactName,
        phone: form.phone,
        address: form.address,
        customerCategoryId: form.customerCategoryId || undefined,
        pricingTier: form.pricingTier,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
        openingBalance: form.openingBalance ? Number(form.openingBalance) : undefined,
      });
      router.push('/customers');
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Алдаа гарлаа');
    } finally { setSubmitting(false); }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white";
  const labelClass = "block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5";

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-2xl">
      <div>
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[15px] text-[#007AFF] font-medium hover:text-[#0066D6] transition-colors mb-3 active:scale-[0.97]">
          <ChevronLeft className="w-5 h-5" /> Харилцагч
        </button>
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Шинэ харилцагч</h1>
      </div>

      <form onSubmit={handleSubmit}>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5 space-y-4">
          <div>
            <label className={labelClass}>Дэлгүүрийн нэр *</label>
            <input type="text" value={form.storeName} onChange={e => handleChange('storeName', e.target.value)} required placeholder="Дэлгүүрийн нэр" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Холбоо барих *</label>
              <input type="text" value={form.contactName} onChange={e => handleChange('contactName', e.target.value)} required placeholder="Нэр" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Утас</label>
              <input type="text" value={form.phone} onChange={e => handleChange('phone', e.target.value)} placeholder="99112233" className={inputClass} />
            </div>
          </div>
          <div>
            <label className={labelClass}>Хаяг</label>
            <input type="text" value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="Хаяг" className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Бүс нутаг</label>
              <select value={form.customerCategoryId} onChange={e => handleChange('customerCategoryId', e.target.value)} className={inputClass}>
                <option value="">Сонгох...</option>
                {categories.map((c: any) => (
                  <option key={c.id} value={c.id}>{c.name} ({c.type === 'KHOROO' ? 'Хороо' : 'Сум'})</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass}>Үнийн зэрэглэл</label>
              <select value={form.pricingTier} onChange={e => handleChange('pricingTier', e.target.value)} className={inputClass}>
                <option value="STANDARD">Standard</option>
                <option value="SILVER">Silver</option>
                <option value="GOLD">Gold</option>
                <option value="PLATINUM">Platinum</option>
                <option value="VIP">VIP</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Зээлийн хязгаар (₮)</label>
              <input type="number" min="0" value={form.creditLimit} onChange={e => handleChange('creditLimit', e.target.value)} placeholder="0" className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>Эхний үлдэгдэл (₮)</label>
              <input type="number" min="0" value={form.openingBalance} onChange={e => handleChange('openingBalance', e.target.value)} placeholder="0" className={inputClass} />
            </div>
          </div>
        </div>

        {error && (
          <div className="mt-3 p-3 rounded-xl bg-[#FF3B30]/10 text-[13px] font-medium text-[#FF3B30]">{error}</div>
        )}

        <div className="flex items-center justify-end gap-3 mt-5">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/40 hover:bg-[#E5E5EA]/60 transition-all active:scale-[0.97]">
            Цуцлах
          </button>
          <button type="submit" disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            {submitting ? 'Хадгалж байна...' : 'Бүртгэх'}
          </button>
        </div>
      </form>
    </div>
  );
}
