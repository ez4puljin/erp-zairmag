import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TextInput, TouchableOpacity, StyleSheet, Alert, Platform } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, LoadingState, ErrorState, confirm } from '@/src/components/admin';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';
import { formatDate } from '@/src/lib/format';

export default function InventoryCountDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<any>(null);
  const [counts, setCounts] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  const fetchData = async () => {
    try {
      const res = await api.get(`/api/inventory-counts/${id}`);
      const body = res.data?.data ?? res.data;
      setData(body);
      const initial: Record<string, string> = {};
      (body.items ?? []).forEach((it: any) => {
        initial[it.productId] = it.countedQty != null ? String(it.countedQty) : '';
      });
      setCounts(initial);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setLoading(false); }
  };

  useEffect(() => { if (id) fetchData(); }, [id]);

  const handleSaveItems = async () => {
    setSaving(true);
    try {
      const items = Object.entries(counts)
        .filter(([, v]) => v !== '')
        .map(([productId, v]) => ({ productId, countedQty: Number(v) }));
      await api.patch(`/api/inventory-counts/${id}/items`, { items });
      Alert.alert('Амжилттай', 'Тоологдсон мэдээлэл хадгалагдлаа');
      fetchData();
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Алдаа');
    } finally { setSaving(false); }
  };

  const handleFinalize = async () => {
    const ok = await confirm({
      title: 'Тооллогыг дуусгах уу?',
      message: 'Тоолсон тоо үндсэн нөөцөд тохируулагдана. Энэ үйлдлийг буцаах боломжгүй.',
      confirmLabel: 'Дуусгах',
    });
    if (!ok) return;
    try {
      await api.post(`/api/inventory-counts/${id}/finalize`);
      invalidateListCache('/api/inventory-counts');
      invalidateListCache('/api/inventory');
      router.back();
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Алдаа');
    }
  };

  if (loading) return <View style={{ flex: 1 }}><ScreenHeader title="Тооллого" /><LoadingState /></View>;
  if (error || !data) return <View style={{ flex: 1 }}><ScreenHeader title="Тооллого" /><ErrorState message={error || 'Олдсонгүй'} onRetry={fetchData} /></View>;

  const items = data.items ?? [];
  const isDraft = data.status === 'DRAFT';

  return (
    <View style={s.container}>
      <ScreenHeader title={`Тооллого #${data.countNumber}`} subtitle={formatDate(data.countDate)} />

      <View style={s.infoBar}>
        <Text style={s.infoText}>{items.length} бараа · {items.filter((i: any) => i.countedQty != null).length} тоологдсон</Text>
      </View>

      <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 100 }}>
        {items.map((it: any) => {
          const system = it.systemQty ?? 0;
          const counted = counts[it.productId] ?? '';
          const diff = counted !== '' ? Number(counted) - system : null;
          return (
            <View key={it.productId} style={s.itemCard}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{it.product?.name}</Text>
                <Text style={s.itemMeta}>Систем: {system} ш {diff !== null && diff !== 0 && (
                  <Text style={{ color: diff > 0 ? '#34C759' : '#FF3B30', fontWeight: '700' }}>
                    {diff > 0 ? '+' : ''}{diff}
                  </Text>
                )}</Text>
              </View>
              <TextInput
                style={s.input}
                value={counted}
                onChangeText={v => setCounts(p => ({ ...p, [it.productId]: v.replace(/[^\d]/g, '') }))}
                placeholder={String(system)}
                placeholderTextColor="#AEAEB2"
                keyboardType="number-pad"
                editable={isDraft}
              />
            </View>
          );
        })}
      </ScrollView>

      {isDraft && (
        <View style={s.bottom}>
          <TouchableOpacity style={[s.btn, s.saveBtn]} onPress={handleSaveItems} disabled={saving}>
            <Ionicons name="save-outline" size={16} color="#007AFF" />
            <Text style={s.saveText}>Хадгалах</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.btn, s.finalizeBtn]} onPress={handleFinalize}>
            <Ionicons name="checkmark-circle" size={16} color="#fff" />
            <Text style={s.finalizeText}>Дуусгах</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  infoBar: { padding: 12, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0' },
  infoText: { fontSize: 12, color: '#8E8E93' },
  itemCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#E8ECF0' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  itemMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  input: { backgroundColor: '#F5F6FA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontSize: 16, fontWeight: '700', color: '#1C1C1E', minWidth: 70, textAlign: 'center' },
  bottom: { flexDirection: 'row', gap: 8, padding: 12, backgroundColor: '#fff', borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0' },
  btn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 14, borderRadius: 12 },
  saveBtn: { backgroundColor: '#007AFF12', borderWidth: 1, borderColor: '#007AFF30' },
  saveText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  finalizeBtn: { backgroundColor: '#34C759' },
  finalizeText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
