import React, { useEffect, useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';
import { invalidateItemCache } from '@/src/hooks/use-item-query';

export default function EditCustomerScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    storeName: '', contactName: '', phone: '', email: '', address: '',
    city: '', creditLimit: '', pricingTier: 'STANDARD',
  });

  useEffect(() => {
    if (!id) return;
    api.get(`/api/customers/${id}`).then(res => {
      const c = res.data?.data ?? res.data;
      setForm({
        storeName: c.storeName ?? '',
        contactName: c.contactName ?? '',
        phone: c.phone ?? '',
        email: c.email ?? '',
        address: c.address ?? '',
        city: c.city ?? '',
        creditLimit: String(Number(c.creditLimit ?? 0)),
        pricingTier: c.pricingTier ?? 'STANDARD',
      });
    }).catch(e => setError(e?.response?.data?.message || 'Ачааллахад алдаа'))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.storeName.trim() || !form.contactName.trim() || !form.phone.trim() || !form.address.trim()) {
      setError('Заавал талбаруудыг бөглөнө үү');
      return;
    }
    setSubmitting(true); setError(null);
    try {
      await api.patch(`/api/customers/${id}`, {
        storeName: form.storeName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim() || undefined,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : 0,
        pricingTier: form.pricingTier,
      });
      invalidateListCache('/api/customers');
      invalidateItemCache(`/api/customers/${id}`);
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа гарлаа');
    } finally { setSubmitting(false); }
  };

  if (loading) return <FormModal title="Засах" onSubmit={() => {}} submitting>{null}</FormModal>;

  return (
    <FormModal title="Харилцагч засах" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Дэлгүүрийн нэр" value={form.storeName} onChange={v => update('storeName', v)} required />
      <FormField label="Холбоо барих хүн" value={form.contactName} onChange={v => update('contactName', v)} required />
      <FormField label="Утас" value={form.phone} onChange={v => update('phone', v)} type="phone" required />
      <FormField label="Имэйл" value={form.email} onChange={v => update('email', v)} type="email" />
      <FormField label="Хаяг" value={form.address} onChange={v => update('address', v)} type="textarea" required />
      <FormField label="Хот" value={form.city} onChange={v => update('city', v)} />
      <FormField
        label="Үнийн зэрэглэл" value={form.pricingTier} onChange={v => update('pricingTier', v)} type="select"
        options={[
          { label: 'Стандарт', value: 'STANDARD' },
          { label: 'Мөнгөн', value: 'SILVER' },
          { label: 'Алтан', value: 'GOLD' },
          { label: 'Платинум', value: 'PLATINUM' },
          { label: 'VIP', value: 'VIP' },
        ]}
      />
      <FormField label="Зээлийн хязгаар" value={form.creditLimit} onChange={v => update('creditLimit', v)} type="currency" prefix="₮" />
    </FormModal>
  );
}
