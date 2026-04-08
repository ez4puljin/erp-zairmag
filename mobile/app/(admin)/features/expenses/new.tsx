import React, { useEffect, useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewExpenseScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    categoryId: '', amount: '', description: '', date: today, paymentMethod: 'CASH', referenceNo: '', notes: '',
  });

  useEffect(() => {
    api.get('/api/expense-categories').then(res => setCategories(res.data?.data ?? res.data ?? [])).catch(() => {});
  }, []);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.categoryId) { setError('Ангилал сонгоно уу'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError('Дүн оруулна уу'); return; }
    if (!form.description.trim()) { setError('Тайлбар заавал'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/expenses', {
        categoryId: form.categoryId,
        amount: Number(form.amount),
        description: form.description.trim(),
        date: form.date,
        paymentMethod: form.paymentMethod,
        referenceNo: form.referenceNo.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      invalidateListCache('/api/expenses');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Шинэ зардал" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField
        label="Ангилал"
        value={form.categoryId}
        onChange={v => update('categoryId', v)}
        type="select"
        required
        options={categories.map(c => ({ label: c.name, value: c.id }))}
      />
      <FormField label="Дүн" value={form.amount} onChange={v => update('amount', v)} type="currency" prefix="₮" required />
      <FormField label="Тайлбар" value={form.description} onChange={v => update('description', v)} required />
      <FormField label="Огноо" value={form.date} onChange={v => update('date', v)} placeholder="YYYY-MM-DD" />
      <FormField
        label="Төлбөрийн хэлбэр"
        value={form.paymentMethod}
        onChange={v => update('paymentMethod', v)}
        type="select"
        options={[
          { label: 'Бэлэн', value: 'CASH' },
          { label: 'Шилжүүлэг', value: 'BANK_TRANSFER' },
          { label: 'Карт', value: 'CARD' },
          { label: 'Чек', value: 'CHECK' },
        ]}
      />
      <FormField label="Баримтын дугаар" value={form.referenceNo} onChange={v => update('referenceNo', v)} />
      <FormField label="Нэмэлт тэмдэглэл" value={form.notes} onChange={v => update('notes', v)} type="textarea" />
    </FormModal>
  );
}
