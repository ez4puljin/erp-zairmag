import React, { useState } from 'react';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function NewCashClosingScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = new Date().toISOString().slice(0, 10);
  const [form, setForm] = useState({
    closingDate: today, openingBalance: '', totalCashIn: '', totalCashOut: '', totalBankIn: '', closingBalance: '', notes: '',
  });

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/cash-closings', {
        closingDate: form.closingDate,
        openingBalance: Number(form.openingBalance || 0),
        totalCashIn: Number(form.totalCashIn || 0),
        totalCashOut: Number(form.totalCashOut || 0),
        totalBankIn: Number(form.totalBankIn || 0),
        closingBalance: Number(form.closingBalance || 0),
        notes: form.notes.trim() || undefined,
      });
      invalidateListCache('/api/cash-closings');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Мөнгөн хаалт" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Огноо" value={form.closingDate} onChange={v => update('closingDate', v)} required />
      <FormField label="Эхний үлдэгдэл" value={form.openingBalance} onChange={v => update('openingBalance', v)} type="currency" prefix="₮" />
      <FormField label="Нийт бэлэн орлого" value={form.totalCashIn} onChange={v => update('totalCashIn', v)} type="currency" prefix="₮" />
      <FormField label="Нийт бэлэн зарлага" value={form.totalCashOut} onChange={v => update('totalCashOut', v)} type="currency" prefix="₮" />
      <FormField label="Банк орлого" value={form.totalBankIn} onChange={v => update('totalBankIn', v)} type="currency" prefix="₮" />
      <FormField label="Эцсийн үлдэгдэл" value={form.closingBalance} onChange={v => update('closingBalance', v)} type="currency" prefix="₮" required />
      <FormField label="Тэмдэглэл" value={form.notes} onChange={v => update('notes', v)} type="textarea" />
    </FormModal>
  );
}
