import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormModal, FormField, confirm } from '@/src/components/admin';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function EditCategoryScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [name, setName] = useState('');

  useEffect(() => {
    if (!id) return;
    api.get(`/api/categories/${id}`).then(res => setName((res.data?.data ?? res.data)?.name ?? ''))
      .catch(e => setError(e?.response?.data?.message || 'Алдаа'))
      .finally(() => setLoading(false));
  }, [id]);

  const handleSubmit = async () => {
    if (!name.trim()) { setError('Нэр заавал'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.patch(`/api/categories/${id}`, { name: name.trim() });
      invalidateListCache('/api/categories');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    const ok = await confirm({ title: 'Устгах уу?', destructive: true, confirmLabel: 'Устгах' });
    if (!ok) return;
    try {
      await api.delete(`/api/categories/${id}`);
      invalidateListCache('/api/categories');
      router.back();
    } catch (e: any) { Alert.alert('Алдаа', e?.response?.data?.message || 'Устгахад алдаа'); }
  };

  if (loading) return <FormModal title="Ачааллаж..." onSubmit={() => {}} submitting>{null}</FormModal>;

  return (
    <FormModal title="Ангилал засах" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Нэр" value={name} onChange={setName} required autoFocus />
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
