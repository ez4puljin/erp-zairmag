import React, { useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewDriverScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '' });

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.firstName.trim() || !form.lastName.trim()) { setError('Нэр, овог заавал'); return; }
    if (!form.email.trim()) { setError('Имэйл заавал'); return; }
    if (!form.password || form.password.length < 6) { setError('Нууц үг 6+ тэмдэгт'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/drivers', {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim() || undefined,
        password: form.password,
      });
      invalidateListCache('/api/drivers');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Шинэ жолооч" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Овог" value={form.lastName} onChange={v => update('lastName', v)} required />
      <FormField label="Нэр" value={form.firstName} onChange={v => update('firstName', v)} required />
      <FormField label="Имэйл" value={form.email} onChange={v => update('email', v)} type="email" required />
      <FormField label="Утас" value={form.phone} onChange={v => update('phone', v)} type="phone" />
      <FormField label="Нууц үг" value={form.password} onChange={v => update('password', v)} type="password" required helperText="6 тэмдэгтээс дээш" />
    </FormModal>
  );
}
