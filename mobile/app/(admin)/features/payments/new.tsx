import React, { useEffect, useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewPaymentScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [form, setForm] = useState({
    customerId: '', amount: '', method: 'CASH', bankAccountId: '', externalRef: '', notes: '',
  });

  useEffect(() => {
    api.get('/api/customers?limit=100').then(res => setCustomers(res.data?.data ?? [])).catch(() => {});
    api.get('/api/bank-accounts').then(res => setBankAccounts(res.data ?? [])).catch(() => {});
  }, []);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.customerId) { setError('Харилцагч сонгоно уу'); return; }
    if (!form.amount || Number(form.amount) <= 0) { setError('Дүн оруулна уу'); return; }
    if (!form.bankAccountId) { setError('Данс сонгоно уу'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/payments', {
        customerId: form.customerId,
        amount: Number(form.amount),
        method: form.method,
        bankAccountId: form.bankAccountId || undefined,
        externalRef: form.externalRef.trim() || undefined,
        notes: form.notes.trim() || undefined,
      });
      invalidateListCache('/api/payments');
      invalidateListCache('/api/customers');
      invalidateListCache('/api/receivables');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Төлбөр бүртгэх" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField
        label="Харилцагч"
        value={form.customerId}
        onChange={v => update('customerId', v)}
        type="select"
        required
        options={customers.map(c => ({ label: c.storeName, value: c.id }))}
      />
      <FormField label="Дүн" value={form.amount} onChange={v => update('amount', v)} type="currency" prefix="₮" required />
      <FormField
        label="Төрөл"
        value={form.method}
        onChange={v => update('method', v)}
        type="select"
        options={[
          { label: 'Бэлэн', value: 'CASH' },
          { label: 'Шилжүүлэг', value: 'BANK_TRANSFER' },
          { label: 'Карт', value: 'CARD' },
          { label: 'Мобайл мөнгө', value: 'MOBILE_MONEY' },
          { label: 'Чек', value: 'CHECK' },
        ]}
      />
      <FormField
        label="Данс"
        value={form.bankAccountId}
        onChange={v => update('bankAccountId', v)}
        type="select"
        required
        options={bankAccounts.map((a: any) => ({ label: `${a.bankName} — ${a.accountNumber}`, value: a.id }))}
        helperText="Төлбөр хүлээн авсан данс"
      />
      <FormField label="Баримтын дугаар" value={form.externalRef} onChange={v => update('externalRef', v)} />
      <FormField label="Тайлбар" value={form.notes} onChange={v => update('notes', v)} type="textarea" />
    </FormModal>
  );
}
