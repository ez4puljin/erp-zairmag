import React, { useEffect, useState } from 'react';
import { FormModal, FormField, confirm } from '@/src/components/admin';
import { router, useLocalSearchParams } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function EditSupplierScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '' });

  useEffect(() => {
    if (!id) return;
    api.get(`/api/suppliers/${id}`).then(res => {
      const sup = res.data?.data ?? res.data;
      setForm({
        name: sup.name ?? '',
        contactName: sup.contactName ?? '',
        phone: sup.phone ?? '',
        email: sup.email ?? '',
        address: sup.address ?? '',
      });
    }).catch(e => setError(e?.response?.data?.message || 'Алдаа'))
      .finally(() => setLoading(false));
  }, [id]);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    if (!form.name.trim()) { setError('Нэр заавал'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.patch(`/api/suppliers/${id}`, {
        name: form.name.trim(),
        contactName: form.contactName.trim() || undefined,
        phone: form.phone.trim() || undefined,
        email: form.email.trim() || undefined,
        address: form.address.trim() || undefined,
      });
      invalidateListCache('/api/suppliers');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Устгах уу?', destructive: true, confirmLabel: 'Устгах' });
    if (!ok) return;
    try {
      await api.delete(`/api/suppliers/${id}`);
      invalidateListCache('/api/suppliers');
      router.back();
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Устгахад алдаа');
    }
  };

  if (loading) return <FormModal title="Засах" onSubmit={() => {}} submitting>{null}</FormModal>;

  return (
    <FormModal title="Нийлүүлэгч засах" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Нэр" value={form.name} onChange={v => update('name', v)} required />
      <FormField label="Холбоо барих" value={form.contactName} onChange={v => update('contactName', v)} />
      <FormField label="Утас" value={form.phone} onChange={v => update('phone', v)} type="phone" />
      <FormField label="Имэйл" value={form.email} onChange={v => update('email', v)} type="email" />
      <FormField label="Хаяг" value={form.address} onChange={v => update('address', v)} type="textarea" />

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
