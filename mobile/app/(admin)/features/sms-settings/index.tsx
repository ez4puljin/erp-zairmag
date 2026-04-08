import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, FormField } from '@/src/components/admin';
import api from '@/src/lib/api';

export default function SmsSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [form, setForm] = useState({ apiUrl: '', username: '', password: '' });
  const [testForm, setTestForm] = useState({ phone: '', message: 'Тест SMS' });

  useEffect(() => {
    api.get('/api/sms/settings').then(res => {
      const d = res.data ?? {};
      setForm({ apiUrl: d.apiUrl ?? '', username: d.username ?? '', password: '' });
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const update = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = async () => {
    if (!form.apiUrl.trim() || !form.username.trim() || !form.password.trim()) {
      setError('Бүх талбар заавал'); return;
    }
    setSaving(true); setError(null); setSuccess(null);
    try {
      await api.put('/api/sms/settings', form);
      setSuccess('Амжилттай хадгалагдлаа');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSaving(false); }
  };

  const handleTest = async () => {
    if (!testForm.phone.trim()) { setError('Утас оруулна уу'); return; }
    setTesting(true); setError(null); setSuccess(null);
    try {
      await api.post('/api/sms/test', { phone: testForm.phone, message: testForm.message });
      setSuccess('Тест SMS илгээгдлээ');
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Тест SMS илгээхэд алдаа');
    } finally { setTesting(false); }
  };

  if (loading) return <View style={{ flex: 1 }}><ScreenHeader title="SMS тохиргоо" /><View style={s.center}><ActivityIndicator color="#007AFF" /></View></View>;

  return (
    <View style={s.container}>
      <ScreenHeader title="SMS тохиргоо" />

      {error ? (
        <View style={[s.banner, { backgroundColor: '#FF3B3012', borderColor: '#FF3B3030' }]}>
          <Ionicons name="alert-circle" size={16} color="#FF3B30" />
          <Text style={{ flex: 1, fontSize: 13, color: '#FF3B30' }}>{error}</Text>
        </View>
      ) : null}
      {success ? (
        <View style={[s.banner, { backgroundColor: '#34C75912', borderColor: '#34C75930' }]}>
          <Ionicons name="checkmark-circle" size={16} color="#34C759" />
          <Text style={{ flex: 1, fontSize: 13, color: '#34C759' }}>{success}</Text>
        </View>
      ) : null}

      <View style={{ marginTop: 10 }}>
        <Text style={s.sectionTitle}>SMSGATE API ТОХИРГОО</Text>
        <FormField label="API URL" value={form.apiUrl} onChange={v => update('apiUrl', v)} placeholder="http://192.168.x.x:8080/message" required />
        <FormField label="Username" value={form.username} onChange={v => update('username', v)} required />
        <FormField label="Password" value={form.password} onChange={v => update('password', v)} type="password" required />

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
          <Text style={s.saveText}>Хадгалах</Text>
        </TouchableOpacity>

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>ТЕСТ SMS</Text>
        <FormField label="Утас" value={testForm.phone} onChange={v => setTestForm(p => ({ ...p, phone: v }))} type="phone" placeholder="99112233" />
        <FormField label="Мессеж" value={testForm.message} onChange={v => setTestForm(p => ({ ...p, message: v }))} type="textarea" />

        <TouchableOpacity style={s.testBtn} onPress={handleTest} disabled={testing}>
          {testing ? <ActivityIndicator color="#007AFF" /> : <Ionicons name="send" size={16} color="#007AFF" />}
          <Text style={s.testText}>Тест илгээх</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 12, marginHorizontal: 12, marginTop: 12, borderRadius: 10, borderWidth: 1 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginLeft: 16, marginBottom: 8, marginTop: 8 },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 14, marginHorizontal: 12, marginTop: 8 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF12', borderRadius: 14, paddingVertical: 14, marginHorizontal: 12, marginTop: 8, borderWidth: 1, borderColor: '#007AFF30' },
  testText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
});
