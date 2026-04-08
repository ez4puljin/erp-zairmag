import React, { useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewSupplierScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '', openingBalance: '' });
  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Нэр заавал'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/suppliers', {
        name: form.name.trim(),
        contactName: form.contactName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
        openingBalance: form.openingBalance ? Number(form.openingBalance) : undefined,
      });
      invalidateListCache('/api/suppliers');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа гарлаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Шинэ нийлүүлэгч" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Нэр" value={form.name} onChange={v => update('name', v)} required />
      <FormField label="Холбоо барих" value={form.contactName} onChange={v => update('contactName', v)} />
      <FormField label="Утас" value={form.phone} onChange={v => update('phone', v)} type="phone" />
      <FormField label="Имэйл" value={form.email} onChange={v => update('email', v)} type="email" />
      <FormField label="Хаяг" value={form.address} onChange={v => update('address', v)} type="textarea" />
      <FormField label="Эхний үлдэгдэл" value={form.openingBalance} onChange={v => update('openingBalance', v)} type="currency" prefix="₮" />
    </FormModal>
  );
}
