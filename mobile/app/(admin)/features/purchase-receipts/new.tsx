import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { FormModal, FormField } from '@/src/components/admin';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';
import { formatCurrency } from '@/src/lib/format';

interface Line { productId: string; quantity: string; unitPrice: string; }

export default function NewPurchaseReceiptScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([{ productId: '', quantity: '', unitPrice: '' }]);

  useEffect(() => {
    api.get('/api/suppliers?limit=100').then(r => setSuppliers(r.data?.data ?? r.data ?? [])).catch(() => {});
    api.get('/api/products?limit=100').then(r => setProducts(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const updateLine = (i: number, k: keyof Line, v: string) => {
    setLines(prev => prev.map((l, idx) => idx === i ? { ...l, [k]: v } : l));
  };

  const addLine = () => setLines(p => [...p, { productId: '', quantity: '', unitPrice: '' }]);
  const removeLine = (i: number) => setLines(p => p.filter((_, idx) => idx !== i));

  const total = lines.reduce((s, l) => s + (Number(l.quantity || 0) * Number(l.unitPrice || 0)), 0);

  const handleSubmit = async () => {
    if (!supplierId) { setError('Нийлүүлэгч сонгоно уу'); return; }
    const items = lines.filter(l => l.productId && Number(l.quantity) > 0);
    if (items.length === 0) { setError('Хамгийн багадаа 1 бараа оруулна уу'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/purchase-receipts', {
        supplierId,
        notes: notes.trim() || undefined,
        items: items.map(l => ({ productId: l.productId, quantity: Number(l.quantity), unitPrice: Number(l.unitPrice || 0) })),
      });
      invalidateListCache('/api/purchase-receipts');
      invalidateListCache('/api/inventory');
      invalidateListCache('/api/products');
      router.back();
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setSubmitting(false); }
  };

  return (
    <FormModal title="Бараа орлого" subtitle={formatCurrency(total)} onSubmit={handleSubmit} submitting={submitting} errorMessage={error}>
      <FormField label="Нийлүүлэгч" value={supplierId} onChange={setSupplierId} type="select" required options={suppliers.map(s => ({ label: s.name, value: s.id }))} />

      <View style={st.section}>
        <Text style={st.sectionTitle}>БАРАА ({lines.length})</Text>
        {lines.map((line, idx) => (
          <View key={idx} style={st.lineCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
              <Text style={st.lineNum}>#{idx + 1}</Text>
              {lines.length > 1 && (
                <TouchableOpacity onPress={() => removeLine(idx)}>
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              )}
            </View>
            <FormField
              label="Бараа"
              value={line.productId}
              onChange={v => updateLine(idx, 'productId', v)}
              type="select"
              options={products.map(p => ({ label: p.name, value: p.id }))}
            />
            <View style={{ flexDirection: 'row', gap: 8 }}>
              <View style={{ flex: 1 }}>
                <FormField label="Тоо" value={line.quantity} onChange={v => updateLine(idx, 'quantity', v)} type="number" />
              </View>
              <View style={{ flex: 1 }}>
                <FormField label="Үнэ" value={line.unitPrice} onChange={v => updateLine(idx, 'unitPrice', v)} type="currency" prefix="₮" />
              </View>
            </View>
          </View>
        ))}
        <TouchableOpacity style={st.addLineBtn} onPress={addLine}>
          <Ionicons name="add-circle" size={20} color="#007AFF" />
          <Text style={st.addLineText}>Бараа нэмэх</Text>
        </TouchableOpacity>
      </View>

      <FormField label="Тэмдэглэл" value={notes} onChange={setNotes} type="textarea" />
    </FormModal>
  );
}

const st = StyleSheet.create({
  section: { marginHorizontal: 12, marginTop: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 8 },
  lineCard: { backgroundColor: '#fff', borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  lineNum: { fontSize: 11, fontWeight: '700', color: '#8E8E93' },
  addLineBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, backgroundColor: '#007AFF12', borderRadius: 12, paddingVertical: 12, borderWidth: 1, borderColor: '#007AFF30' },
  addLineText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
});
