import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormModal, FormField, confirm } from '@/src/components/admin';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function EditDriverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', isActive: true });

  useEffect(() => {
    if (!id) return;
    api.get(`/api/drivers/${id}`).then(res => {
      const d = res.data?.data ?? res.data;
      setForm({
        firstName: d.firstName ?? '',
        lastName: d.lastName ?? '',
        email: d.email ?? '',
        phone: d.phone ?? '',
        isActive: d.isActive !== false,
      });
    }).catch(e => setError(e?.response?.data?.message || 'Алдаа'))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setSubmitting(true); setError(null);
    try {
      await api.patch(`/api/drivers/${id}`, {
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        phone: form.phone.trim() || undefined,
        isActive: form.isActive,
      });
      invalidateListCache('/api/drivers');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Устгах уу?', destructive: true, confirmLabel: 'Устгах' });
    if (!ok) return;
    try { await api.delete(`/api/drivers/${id}`); invalidateListCache('/api/drivers'); router.back(); }
    catch (e: any) { Alert.alert('Алдаа', e?.response?.data?.message || 'Алдаа'); }
  };

  if (loading) return <FormModal title="Ачааллаж..." onSubmit={() => {}} submitting>{null}</FormModal>;

  return (
    <FormModal title="Жолооч засах" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Овог" value={form.lastName} onChange={v => update('lastName', v)} required />
      <FormField label="Нэр" value={form.firstName} onChange={v => update('firstName', v)} required />
      <FormField label="Имэйл" value={form.email} onChange={v => {}} disabled />
      <FormField label="Утас" value={form.phone} onChange={v => update('phone', v)} type="phone" />
      <FormField label="Идэвхтэй" value={form.isActive} onChange={v => update('isActive', v)} type="switch" />
      <View style={{ paddingHorizontal: 12, marginTop: 20 }}>
        <TouchableOpacity style={s.delBtn} onPress={handleDelete}>
          <Ionicons name="trash-outline" size={16} color="#FF3B30" />
          <Text style={s.delText}>Жолооч устгах</Text>
        </TouchableOpacity>
      </View>
    </FormModal>
  );
}

const s = StyleSheet.create({
  delBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#FF3B3012', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#FF3B3030' },
  delText: { fontSize: 14, fontWeight: '600', color: '#FF3B30' },
});
