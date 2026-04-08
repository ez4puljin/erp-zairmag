import React, { useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewExpenseCategoryScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', description: '' });

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Нэр заавал'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/expense-categories', { name: form.name.trim(), description: form.description.trim() || undefined });
      invalidateListCache('/api/expense-categories');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Шинэ ангилал" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Нэр" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required autoFocus />
      <FormField label="Тайлбар" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} type="textarea" />
    </FormModal>
  );
}
