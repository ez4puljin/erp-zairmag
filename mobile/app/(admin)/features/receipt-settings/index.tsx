import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, TextInput } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, FormField } from '@/src/components/admin';
import api from '@/src/lib/api';
import { DEFAULT_SETTINGS, fetchReceiptSettings, type ReceiptSettings } from '@/src/lib/receipt-settings';

export default function ReceiptSettingsScreen() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ReceiptSettings>(DEFAULT_SETTINGS);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    api.get('/api/receipt-settings')
      .then(res => setForm({ ...DEFAULT_SETTINGS, ...res.data }))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const update = <K extends keyof ReceiptSettings>(key: K, value: ReceiptSettings[K]) => {
    setForm(p => ({ ...p, [key]: value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setMsg(null);
    try {
      // Only send fields the DTO whitelist accepts — strip id/updatedAt/createdAt
      const payload = {
        companyName: form.companyName,
        subtitle: form.subtitle,
        phone: form.phone || null,
        address: form.address || null,
        footerMessage: form.footerMessage,
        feedbackPhone: form.feedbackPhone || null,
        paperWidth: form.paperWidth,
        fontSize: form.fontSize,
        showCustomer: form.showCustomer,
        showPhone: form.showPhone,
        showSignatures: form.showSignatures,
        showFooter: form.showFooter,
        showDriver: form.showDriver,
        showSaleDriver: form.showSaleDriver,
        showBarcode: form.showBarcode,
        showItemNumber: form.showItemNumber,
        printTwoCopies: form.printTwoCopies,
      };
      await api.put('/api/receipt-settings', payload);
      // Force refresh mobile cache for next print
      await fetchReceiptSettings();
      setMsg({ type: 'success', text: 'Амжилттай хадгалагдлаа' });
      setTimeout(() => setMsg(null), 3000);
    } catch (e: any) {
      setMsg({ type: 'error', text: e?.response?.data?.message || 'Хадгалахад алдаа гарлаа' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <View style={{ flex: 1 }}>
        <ScreenHeader title="Баримтын тохиргоо" />
        <View style={s.center}><ActivityIndicator color="#007AFF" /></View>
      </View>
    );
  }

  return (
    <View style={s.container}>
      <ScreenHeader title="Баримтын тохиргоо" />

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }}>
        {msg ? (
          <View style={[
            s.banner,
            { backgroundColor: msg.type === 'success' ? '#34C75912' : '#FF3B3012', borderColor: msg.type === 'success' ? '#34C75930' : '#FF3B3030' }
          ]}>
            <Ionicons name={msg.type === 'success' ? 'checkmark-circle' : 'alert-circle'} size={16} color={msg.type === 'success' ? '#34C759' : '#FF3B30'} />
            <Text style={{ flex: 1, fontSize: 13, color: msg.type === 'success' ? '#34C759' : '#FF3B30' }}>{msg.text}</Text>
          </View>
        ) : null}

        <Text style={s.sectionTitle}>ТОЛГОЙН МЭДЭЭЛЭЛ</Text>
        <FormField label="Компанийн нэр" value={form.companyName} onChange={v => update('companyName', v)} required />
        <FormField label="Дэд гарчиг" value={form.subtitle} onChange={v => update('subtitle', v)} />
        <FormField label="Утас" value={form.phone ?? ''} onChange={v => update('phone', v)} placeholder="(заавал биш)" />
        <FormField label="Хаяг" value={form.address ?? ''} onChange={v => update('address', v)} placeholder="(заавал биш)" />
        <FormField label="Хөл текст" value={form.footerMessage} onChange={v => update('footerMessage', v)} />
        <FormField label="Санал хүсэлтийн утас" value={form.feedbackPhone ?? ''} onChange={v => update('feedbackPhone', v)} placeholder="90940123" />

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>ЦААС, ҮСГИЙН ХЭМЖЭЭ</Text>

        <View style={s.row}>
          <TouchableOpacity
            style={[s.segment, form.paperWidth === 58 && s.segmentActive]}
            onPress={() => update('paperWidth', 58)}
          >
            <Text style={[s.segmentText, form.paperWidth === 58 && s.segmentTextActive]}>58мм</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.segment, form.paperWidth === 80 && s.segmentActive]}
            onPress={() => update('paperWidth', 80)}
          >
            <Text style={[s.segmentText, form.paperWidth === 80 && s.segmentTextActive]}>80мм</Text>
          </TouchableOpacity>
        </View>

        <Text style={s.label}>Үсгийн хэмжээ ({form.fontSize}px)</Text>
        <View style={s.fontSizeRow}>
          <TouchableOpacity
            style={s.fontSizeBtn}
            onPress={() => update('fontSize', Math.max(10, form.fontSize - 1))}
          >
            <Ionicons name="remove" size={18} color="#007AFF" />
          </TouchableOpacity>
          <View style={s.fontSizeBar}>
            <View style={[s.fontSizeFill, { width: `${((form.fontSize - 10) / 22) * 100}%` }]} />
          </View>
          <TouchableOpacity
            style={s.fontSizeBtn}
            onPress={() => update('fontSize', Math.min(32, form.fontSize + 1))}
          >
            <Ionicons name="add" size={18} color="#007AFF" />
          </TouchableOpacity>
        </View>

        <Text style={[s.sectionTitle, { marginTop: 24 }]}>ХЭСГҮҮД</Text>

        <ToggleRow label="Харилцагч харуулах" value={form.showCustomer} onChange={v => update('showCustomer', v)} />
        <ToggleRow label="Харилцагчийн утас" value={form.showPhone} onChange={v => update('showPhone', v)} />
        <ToggleRow label="Гарын үсгийн хэсэг" value={form.showSignatures} onChange={v => update('showSignatures', v)} />
        <ToggleRow label="Хөл текст харуулах" value={form.showFooter} onChange={v => update('showFooter', v)} />
        <ToggleRow label="Жолоочийн нэр (ачилт баримт)" value={form.showDriver} onChange={v => update('showDriver', v)} />
        <ToggleRow label="Жолооч (борлуулалт баримт)" value={form.showSaleDriver} onChange={v => update('showSaleDriver', v)} />
        <ToggleRow label="Барааны баркод" value={form.showBarcode} onChange={v => update('showBarcode', v)} />
        <ToggleRow label="Барааны дэс дугаар" value={form.showItemNumber} onChange={v => update('showItemNumber', v)} />
        <ToggleRow label="2 хувь хэвлэх" value={form.printTwoCopies} onChange={v => update('printTwoCopies', v)} />

        <TouchableOpacity style={s.saveBtn} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Ionicons name="save-outline" size={18} color="#fff" />}
          <Text style={s.saveText}>{saving ? 'Хадгалж байна...' : 'Хадгалах'}</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

function ToggleRow({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <TouchableOpacity style={s.toggleRow} onPress={() => onChange(!value)} activeOpacity={0.7}>
      <Text style={s.toggleLabel}>{label}</Text>
      <View style={[s.toggleTrack, value && s.toggleTrackActive]}>
        <View style={[s.toggleThumb, value && s.toggleThumbActive]} />
      </View>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  banner: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 12, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '800', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginTop: 12, marginBottom: 6, marginLeft: 4 },
  row: { flexDirection: 'row', gap: 8 },
  segment: { flex: 1, paddingVertical: 12, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA', alignItems: 'center' },
  segmentActive: { backgroundColor: '#007AFF15', borderColor: '#007AFF' },
  segmentText: { fontSize: 14, fontWeight: '600', color: '#8E8E93' },
  segmentTextActive: { color: '#007AFF' },
  fontSizeRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  fontSizeBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#007AFF15', justifyContent: 'center', alignItems: 'center' },
  fontSizeBar: { flex: 1, height: 6, borderRadius: 3, backgroundColor: '#E5E5EA', overflow: 'hidden' },
  fontSizeFill: { height: '100%', backgroundColor: '#007AFF', borderRadius: 3 },
  toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#fff', paddingVertical: 14, paddingHorizontal: 14, borderRadius: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E5E5EA' },
  toggleLabel: { fontSize: 14, fontWeight: '500', color: '#1C1C1E', flex: 1 },
  toggleTrack: { width: 44, height: 26, borderRadius: 13, backgroundColor: '#D1D1D6', padding: 3 },
  toggleTrackActive: { backgroundColor: '#34C759' },
  toggleThumb: { width: 20, height: 20, borderRadius: 10, backgroundColor: '#fff' },
  toggleThumbActive: { transform: [{ translateX: 18 }] },
  saveBtn: { marginTop: 24, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', paddingVertical: 14, borderRadius: 14 },
  saveText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
