import React, { useEffect, useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewSupplierPaymentScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    supplierId: '', type: 'PAYMENT', amount: '', method: 'CASH', date: today, description: '', referenceNo: '',
  });

  useEffect(() => {
    api.get('/api/suppliers?limit=100').then(r => setSuppliers(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.supplierId) { setError('Нийлүүлэгч сонгоно уу'); return; }
    if (!form.amount) { setError('Дүн оруулна уу'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/supplier-payables/payments', {
        supplierId: form.supplierId,
        type: form.type,
        amount: Number(form.amount),
        method: form.method,
        date: form.date,
        description: form.description.trim() || undefined,
        referenceNo: form.referenceNo.trim() || undefined,
      });
      invalidateListCache('/api/supplier-payables');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Нийлүүлэгчид төлбөр" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Нийлүүлэгч" value={form.supplierId} onChange={v => update('supplierId', v)} type="select" required options={suppliers.map(s => ({ label: s.name, value: s.id }))} />
      <FormField
        label="Төрөл" value={form.type} onChange={v => update('type', v)} type="select"
        options={[
          { label: 'Төлбөр', value: 'PAYMENT' },
          { label: 'Буцаалт', value: 'RETURN' },
          { label: 'Тохируулга', value: 'ADJUSTMENT' },
        ]}
      />
      <FormField label="Дүн" value={form.amount} onChange={v => update('amount', v)} type="currency" prefix="₮" required />
      <FormField
        label="Хэлбэр" value={form.method} onChange={v => update('method', v)} type="select"
        options={[
          { label: 'Бэлэн', value: 'CASH' },
          { label: 'Шилжүүлэг', value: 'BANK_TRANSFER' },
          { label: 'Карт', value: 'CARD' },
        ]}
      />
      <FormField label="Огноо" value={form.date} onChange={v => update('date', v)} />
      <FormField label="Баримтын дугаар" value={form.referenceNo} onChange={v => update('referenceNo', v)} />
      <FormField label="Тайлбар" value={form.description} onChange={v => update('description', v)} type="textarea" />
    </FormModal>
  );
}
