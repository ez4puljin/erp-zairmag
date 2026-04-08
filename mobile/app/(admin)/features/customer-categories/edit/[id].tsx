import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormModal, FormField, confirm } from '@/src/components/admin';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function EditCustomerCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', type: 'KHOROO', description: '' });

  useEffect(() => {
    if (!id) return;
    api.get(`/api/customer-categories/${id}`).then(res => {
      const c = res.data?.data ?? res.data;
      setForm({ name: c.name ?? '', type: c.type ?? 'KHOROO', description: c.description ?? '' });
    }).catch(e => setError(e?.response?.data?.message || 'Алдаа'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Нэр заавал'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.patch(`/api/customer-categories/${id}`, { name: form.name.trim(), type: form.type, description: form.description.trim() || undefined });
      invalidateListCache('/api/customer-categories');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Устгах уу?', destructive: true, confirmLabel: 'Устгах' });
    if (!ok) return;
    try { await api.delete(`/api/customer-categories/${id}`); invalidateListCache('/api/customer-categories'); router.back(); }
    catch (e: any) { Alert.alert('Алдаа', e?.response?.data?.message || 'Алдаа'); }
  };

  if (loading) return <FormModal title="Ачааллаж..." onSubmit={() => {}} submitting>{null}</FormModal>;

  return (
    <FormModal title="Бүс засах" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Нэр" value={form.name} onChange={v => setForm(p => ({ ...p, name: v }))} required />
      <FormField label="Төрөл" value={form.type} onChange={v => setForm(p => ({ ...p, type: v }))} type="select" options={[{label: 'Хороо', value: 'KHOROO'}, {label: 'Сум', value: 'SUM'}]} />
      <FormField label="Тайлбар" value={form.description} onChange={v => setForm(p => ({ ...p, description: v }))} type="textarea" />
      <View style={{ paddingHorizontal: 12, marginTop: 20 }}>
        <TouchableOpacity style={s.delBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          <Text style={s.delText}>Устгах</Text>
        </TouchableOpacity>
      </View>
    </FormModal>
  );
}

const s = StyleSheet.create({
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FF3B3012', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#FF3B3030' },
  delText: { fontSize: 14, fontWeight: '600', color: '#FF3B30' },
});
