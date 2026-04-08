import React, { useEffect, useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function RestockScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [form, setForm] = useState({ productId: '', quantity: '', note: '' });

  useEffect(() => {
    api.get('/api/products?limit=100').then(res => {
      setProducts(res.data?.data ?? res.data ?? []);
    }).catch(() => {});
  }, []);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.productId) { setError('Бараа сонгоно уу'); return; }
    if (!form.quantity || Number(form.quantity) <= 0) { setError('Тоо ширхэг оруулна уу'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/inventory/restock', {
        items: [{ productId: form.productId, quantity: Number(form.quantity) }],
        note: form.note.trim() || undefined,
      });
      invalidateListCache('/api/inventory');
      invalidateListCache('/api/products');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Бараа нэмэх" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField
        label="Бараа"
        value={form.productId}
        onChange={v => update('productId', v)}
        type="select"
        required
        options={products.map(p => ({ label: `${p.name} (${p.sku})`, value: p.id }))}
      />
      <FormField label="Тоо ширхэг" value={form.quantity} onChange={v => update('quantity', v)} type="number" required />
      <FormField label="Тайлбар" value={form.note} onChange={v => update('note', v)} type="textarea" />
    </FormModal>
  );
}
