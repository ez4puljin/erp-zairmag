import React, { useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewCustomerScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    storeName: '', contactName: '', phone: '', email: '', address: '',
    city: '', creditLimit: '', openingBalance: '', pricingTier: 'STANDARD',
  });

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const validate = () => {
    if (!form.storeName.trim()) return 'Дэлгүүрийн нэр заавал';
    if (!form.contactName.trim()) return 'Холбоо барих хүн заавал';
    if (!form.phone.trim()) return 'Утасны дугаар заавал';
    if (!form.address.trim()) return 'Хаяг заавал';
    return null;
  };

  const handleSubmit = async () => {
    const err = validate();
    if (err) { setError(err); return; }
    setError(null);
    setSubmitting(true);
    try {
      await api.post('/api/customers', {
        storeName: form.storeName.trim(),
        contactName: form.contactName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim() || undefined,
        address: form.address.trim(),
        city: form.city.trim() || undefined,
        creditLimit: form.creditLimit ? Number(form.creditLimit) : undefined,
        openingBalance: form.openingBalance ? Number(form.openingBalance) : undefined,
        pricingTier: form.pricingTier,
      });
      invalidateListCache('/api/customers');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа гарлаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal
      title="Шинэ харилцагч"
      onSubmit={handleSubmit}
      submitting={submitting}
      errorMessage={error}
    >
      <FormField label="Дэлгүүрийн нэр" value={form.storeName} onChange={v => update('storeName', v)} required placeholder="Жишээ: Ганаа 24/7" />
      <FormField label="Холбоо барих хүн" value={form.contactName} onChange={v => update('contactName', v)} required placeholder="Нэр" />
      <FormField label="Утас" value={form.phone} onChange={v => update('phone', v)} type="phone" required placeholder="99112233" />
      <FormField label="Имэйл" value={form.email} onChange={v => update('email', v)} type="email" placeholder="example@mail.mn" />
      <FormField label="Хаяг" value={form.address} onChange={v => update('address', v)} type="textarea" required placeholder="Дэлгэрэнгүй хаяг" />
      <FormField label="Хот" value={form.city} onChange={v => update('city', v)} placeholder="Улаанбаатар" />
      <FormField
        label="Үнийн зэрэглэл"
        value={form.pricingTier}
        onChange={v => update('pricingTier', v)}
        type="select"
        options={[
          { label: 'Стандарт', value: 'STANDARD' },
          { label: 'Мөнгөн', value: 'SILVER' },
          { label: 'Алтан', value: 'GOLD' },
          { label: 'Платинум', value: 'PLATINUM' },
          { label: 'VIP', value: 'VIP' },
        ]}
      />
      <FormField label="Зээлийн хязгаар" value={form.creditLimit} onChange={v => update('creditLimit', v)} type="currency" prefix="₮" placeholder="0" />
      <FormField
        label="Эхний үлдэгдэл (өр)"
        value={form.openingBalance}
        onChange={v => update('openingBalance', v)}
        type="currency" prefix="₮" placeholder="0"
        helperText="Хуучин өрийг оруулах"
      />
    </FormModal>
  );
}
