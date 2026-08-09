'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ChevronLeft, Users } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { ErrorBanner } from '@/components/shared/error-banner';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { PRICING_TIERS } from '@/lib/options';

export default function NewCustomerPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    storeName: '', contactName: '', phone: '', registerNo: '', address: '',
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
        registerNo: form.registerNo || undefined,
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

  const inputClass = "w-full h-11 px-4 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none transition-all focus:border-[#007AFF]/40 focus:ring-[3px] focus:ring-[#007AFF]/12 focus:bg-white";
  const labelClass = "block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5";

  return (
    <div className="space-y-5 animate-ios-fade-in mx-auto w-full max-w-2xl">
      <button onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-[13px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors active:scale-[0.97]">
        <ChevronLeft className="w-4 h-4" /> Харилцагч
      </button>

      <PageHeader title="Шинэ харилцагч" subtitle="Харилцагчийн бүртгэл үүсгэх" icon={Users} />

      <form onSubmit={handleSubmit} className="space-y-5">
        <SectionCard title="Үндсэн мэдээлэл">
          <div className="space-y-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Хаяг</label>
                <input type="text" value={form.address} onChange={e => handleChange('address', e.target.value)} placeholder="Хаяг" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>РД</label>
                <input type="text" value={form.registerNo} onChange={e => handleChange('registerNo', e.target.value)} placeholder="Регистрийн дугаар" className={inputClass} />
              </div>
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Ангилал ба үнийн зэрэглэл">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>Бүс нутаг</label>
              <SearchableSelect
                value={form.customerCategoryId}
                onChange={v => handleChange('customerCategoryId', v)}
                options={categories.map((c: any) => ({
                  value: c.id,
                  label: `${c.name} (${c.type === 'KHOROO' ? 'Хороо' : 'Сум'})`,
                }))}
                inputClassName={inputClass}
                widthClass="w-full"
                aria-label="Бүс нутаг"
              />
            </div>
            <div>
              <label className={labelClass}>Үнийн зэрэглэл</label>
              <SearchableSelect
                value={form.pricingTier}
                onChange={v => handleChange('pricingTier', v)}
                options={PRICING_TIERS}
                inputClassName={inputClass}
                widthClass="w-full"
                aria-label="Үнийн зэрэглэл"
              />
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Санхүү">
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
        </SectionCard>

        <ErrorBanner message={error || null} onDismiss={() => setError('')} />

        <div className="flex items-center justify-end gap-3">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#4A4D5C] bg-white border border-[#E8ECF0] hover:bg-[#F2F4F7] transition-all active:scale-[0.97]">
            Цуцлах
          </button>
          <button type="submit" disabled={submitting}
            className="inline-flex items-center gap-1.5 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] disabled:opacity-60 hover:brightness-105"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            {submitting ? 'Хадгалж байна...' : 'Бүртгэх'}
          </button>
        </div>
      </form>
    </div>
  );
}
