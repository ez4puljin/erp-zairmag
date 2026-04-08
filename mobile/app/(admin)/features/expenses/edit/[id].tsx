import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormModal, FormField, confirm } from '@/src/components/admin';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function EditExpenseScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [form, setForm] = useState({
    categoryId: '', amount: '', description: '', date: '', paymentMethod: 'CASH', referenceNo: '', notes: '',
  });

  useEffect(() => {
    Promise.all([
      api.get('/api/expense-categories'),
      api.get(`/api/expenses/${id}`),
    ]).then(([catRes, expRes]) => {
      setCategories(catRes.data?.data ?? catRes.data ?? []);
      const ex = expRes.data?.data ?? expRes.data;
      setForm({
        categoryId: ex.categoryId ?? '',
        amount: String(Number(ex.amount ?? 0)),
        description: ex.description ?? '',
        date: (ex.date ?? '').slice(0, 10),
        paymentMethod: ex.paymentMethod ?? 'CASH',
        referenceNo: ex.referenceNo ?? '',
        notes: ex.notes ?? '',
      });
    }).catch(e => setError(e?.response?.data?.message || 'Алдаа'))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.categoryId || !form.amount || !form.description.trim()) { setError('Шаардлагатай талбар дутуу'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.patch(`/api/expenses/${id}`, {
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

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Устгах уу?', destructive: true, confirmLabel: 'Устгах' });
    if (!ok) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      invalidateListCache('/api/expenses');
      router.back();
    } catch (e: any) { Alert.alert('Алдаа', e?.response?.data?.message || 'Устгахад алдаа'); }
  };

  if (loading) return <FormModal title="Засах" onSubmit={() => {}} submitting>{null}</FormModal>;

  return (
    <FormModal title="Зардал засах" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Ангилал" value={form.categoryId} onChange={v => update('categoryId', v)} type="select" required options={categories.map(c => ({ label: c.name, value: c.id }))} />
      <FormField label="Дүн" value={form.amount} onChange={v => update('amount', v)} type="currency" prefix="₮" required />
      <FormField label="Тайлбар" value={form.description} onChange={v => update('description', v)} required />
      <FormField label="Огноо" value={form.date} onChange={v => update('date', v)} />
      <FormField label="Төлбөр" value={form.paymentMethod} onChange={v => update('paymentMethod', v)} type="select" options={[{label:'Бэлэн',value:'CASH'},{label:'Шилжүүлэг',value:'BANK_TRANSFER'},{label:'Карт',value:'CARD'},{label:'Чек',value:'CHECK'}]} />
      <FormField label="Баримтын дугаар" value={form.referenceNo} onChange={v => update('referenceNo', v)} />
      <FormField label="Тэмдэглэл" value={form.notes} onChange={v => update('notes', v)} type="textarea" />
      <View style={{ paddingHorizontal: 12, marginTop: 20 }}>
        <TouchableOpacity style={s.delBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          <Text style={s.delText}>Зардал устгах</Text>
        </TouchableOpacity>
      </View>
    </FormModal>
  );
}

const s = StyleSheet.create({
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FF3B3012', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#FF3B3030' },
  delText: { fontSize: 14, fontWeight: '600', color: '#FF3B30' },
});
