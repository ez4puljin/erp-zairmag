import React, { useEffect, useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function AdjustStockScreen() {
  const { productId } = useLocalSearchParams<{ productId: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState<any>(null);
  const [form, setForm] = useState({ adjustment: '', reason: 'ADJUSTMENT_GAIN', note: '' });

  useEffect(() => {
    if (!productId) return;
    api.get(`/api/products/${productId}`).then(res => setProduct(res.data?.data ?? res.data))
      .catch(e => setError(e?.response?.data?.message || 'Алдаа'))
      .finally(() => setLoading(false));
  }, [productId]);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.adjustment || Number(form.adjustment) <= 0) { setError('Тоо ширхэг оруулна уу'); return; }
    setSubmitting(true); setError(null);
    try {
      const qty = Number(form.adjustment);
      const signedQty = form.reason === 'ADJUSTMENT_LOSS' ? -qty : qty;
      await api.post('/api/inventory/adjust', {
        productId,
        quantity: signedQty,
        reason: form.reason,
        notes: form.note.trim() || undefined,
      });
      invalidateListCache('/api/inventory');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  if (loading) return <FormModal title="Ачааллаж..." onSubmit={() => {}} submitting>{null}</FormModal>;

  return (
    <FormModal
      title="Нөөц тохируулах"
      subtitle={product?.name}
      onSubmit={handleSubmit}
      submitting={submitting}
      errorMessage={error}
    >
      <FormField
        label="Одоогийн нөөц"
        value={`${product?.stockAvailable ?? 0} ширхэг`}
        onChange={() => {}}
        disabled
      />
      <FormField
        label="Төрөл"
        value={form.reason}
        onChange={v => update('reason', v)}
        type="select"
        options={[
          { label: 'Нэмэгдүүлэх (ADJUSTMENT_GAIN)', value: 'ADJUSTMENT_GAIN' },
          { label: 'Хасах (ADJUSTMENT_LOSS)', value: 'ADJUSTMENT_LOSS' },
        ]}
      />
      <FormField
        label="Тоо ширхэг"
        value={form.adjustment}
        onChange={v => update('adjustment', v)}
        type="number"
        required
        placeholder="0"
      />
      <FormField
        label="Тайлбар"
        value={form.note}
        onChange={v => update('note', v)}
        type="textarea"
        placeholder="Шалтгаан..."
      />
    </FormModal>
  );
}
