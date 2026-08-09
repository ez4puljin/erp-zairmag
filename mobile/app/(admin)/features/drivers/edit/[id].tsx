import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormModal, FormField, confirm, notify } from '@/src/components/admin';
import { router, useLocalSearchParams } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';

export default function EditDriverScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', isActive: true });
  const [usage, setUsage] = useState<{ truckLoadCount: number; salesCount: number; canDelete: boolean } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);

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

    // Ачилт, борлуулалт хийсэн эсэх — устгах боломжтой эсэхийг урьдчилж мэдэхэд.
    api.get(`/api/drivers/${id}/usage`)
      .then(res => setUsage(res.data?.data ?? res.data))
      .catch(() => {});
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

  const handleResetPassword = async () => {
    if (newPassword.trim().length < 6) {
      notify('Анхаар', 'Нууц үг дор хаяж 6 тэмдэгт байна.');
      return;
    }
    setResetting(true);
    try {
      await api.post(`/api/drivers/${id}/reset-password`, { password: newPassword.trim() });
      setNewPassword('');
      notify('Амжилттай', 'Нууц үг шинэчлэгдлээ. Жолоочид шинэ нууц үгээ дамжуулна уу.');
    } catch (e: any) {
      notify('Алдаа', e?.response?.data?.message || 'Алдаа');
    } finally { setResetting(false); }
  };

  const handleDelete = async () => {
    // Ачилт, борлуулалт хийсэн жолоочийг устгавал баримтын холбоос тасарна.
    if (usage && !usage.canDelete) {
      const parts: string[] = [];
      if (usage.salesCount > 0) parts.push(`${usage.salesCount} борлуулалт`);
      if (usage.truckLoadCount > 0) parts.push(`${usage.truckLoadCount} ачилт`);
      const ok = await confirm({
        title: 'Устгах боломжгүй',
        message:
          `${parts.join(', ')} хийсэн байна. Устгавал тэдгээр баримтын холбоос ` +
          `тасарч тайлан буруу болно.\n\nОронд нь идэвхгүй болгох уу?`,
        confirmLabel: 'Идэвхгүй болгох',
      });
      if (ok && form.isActive) {
        try {
          await api.post(`/api/drivers/${id}/toggle-active`);
          invalidateListCache('/api/drivers');
          router.back();
        } catch (e: any) { notify('Алдаа', e?.response?.data?.message || 'Алдаа'); }
      }
      return;
    }

    const ok = await confirm({ title: 'Устгах уу?', destructive: true, confirmLabel: 'Устгах' });
    if (!ok) return;
    try { await api.delete(`/api/drivers/${id}`); invalidateListCache('/api/drivers'); router.back(); }
    catch (e: any) { notify('Алдаа', e?.response?.data?.message || 'Алдаа'); }
  };

  if (loading) return <FormModal title="Ачааллаж..." onSubmit={() => {}} submitting>{null}</FormModal>;

  return (
    <FormModal title="Жолооч засах" onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Овог" value={form.lastName} onChange={v => update('lastName', v)} required />
      <FormField label="Нэр" value={form.firstName} onChange={v => update('firstName', v)} required />
      <FormField label="Имэйл" value={form.email} onChange={v => {}} disabled />
      <FormField label="Утас" value={form.phone} onChange={v => update('phone', v)} type="phone" />
      <FormField label="Идэвхтэй" value={form.isActive} onChange={v => update('isActive', v)} type="switch" />

      {usage && (usage.salesCount > 0 || usage.truckLoadCount > 0) && (
        <View style={s.usageBox}>
          <Ionicons name="information-circle-outline" size={16} color="#8E8E93" />
          <Text style={s.usageText}>
            {usage.salesCount} борлуулалт · {usage.truckLoadCount} ачилт хийсэн
          </Text>
        </View>
      )}

      <View style={s.section}>
        <Text style={s.sectionTitle}>НУУЦ ҮГ СОЛИХ</Text>
        <FormField
          label="Шинэ нууц үг"
          value={newPassword}
          onChange={setNewPassword}
          placeholder="Дор хаяж 6 тэмдэгт"
        />
        <TouchableOpacity
          style={[s.pwBtn, (resetting || !newPassword.trim()) && { opacity: 0.5 }]}
          onPress={handleResetPassword}
          disabled={resetting || !newPassword.trim()}
        >
          <Ionicons name="key-outline" size={16} color="#FF9500" />
          <Text style={s.pwText}>{resetting ? 'Солиж байна...' : 'Нууц үг солих'}</Text>
        </TouchableOpacity>
      </View>

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
  usageBox: { flexDirection: 'row', alignItems: 'center', gap: 6, marginHorizontal: 12, marginTop: 12, paddingVertical: 10, paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#F2F4F7' },
  usageText: { fontSize: 13, color: '#8E8E93' },
  section: { marginTop: 22, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0', paddingTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginHorizontal: 12, marginBottom: 8 },
  pwBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, marginHorizontal: 12, marginTop: 8, backgroundColor: '#FF950012', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#FF950030' },
  pwText: { fontSize: 14, fontWeight: '600', color: '#FF9500' },
});
