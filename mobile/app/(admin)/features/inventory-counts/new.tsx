import React, { useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewInventoryCountScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({ countDate: today, notes: '' });

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    try {
      const res = await api.post('/api/inventory-counts', { countDate: form.countDate, notes: form.notes.trim() || undefined });
      invalidateListCache('/api/inventory-counts');
      const id = res.data?.id;
      router.replace(id ? (`/(admin)/features/inventory-counts/${id}` as any) : ('/(admin)/features/inventory-counts' as any));
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Шинэ тооллого" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Огноо" value={form.countDate} onChange={v => setForm(p => ({ ...p, countDate: v }))} required />
      <FormField label="Тэмдэглэл" value={form.notes} onChange={v => setForm(p => ({ ...p, notes: v }))} type="textarea" />
    </FormModal>
  );
}
