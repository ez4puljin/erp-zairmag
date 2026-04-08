import React, { useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewCategoryScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Нэр заавал'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/categories', { name: name.trim() });
      invalidateListCache('/api/categories');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Шинэ ангилал" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Нэр" value={name} onChange={setName} required autoFocus placeholder="Ангиллын нэр" />
    </FormModal>
  );
}
