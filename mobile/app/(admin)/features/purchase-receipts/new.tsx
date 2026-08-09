import React, { useEffect, useMemo, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import {
  FormModal, FormField, ProductPicker, QuantitySheet, BarcodeScannerModal, notify,
  normalizeCode, type PickerProduct, type QuantityResult,
} from '@/src/components/admin';
import api from '@/src/lib/api';
import { invalidateListCache } from '@/src/hooks/use-list-query';
import { formatCurrency, formatWeight, formatQty } from '@/src/lib/format';

interface Line {
  productId: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  boxes: number;
  pieces: number;
  unitsPerBox: number;
  weightGrams: number;
}

export default function NewPurchaseReceiptScreen() {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [supplierId, setSupplierId] = useState('');
  const [notes, setNotes] = useState('');
  const [lines, setLines] = useState<Line[]>([]);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pending, setPending] = useState<PickerProduct | null>(null);

  useEffect(() => {
    api.get('/api/suppliers?limit=100').then(r => setSuppliers(r.data?.data ?? r.data ?? [])).catch(() => {});
    // Серверийн pagination нь limit-ийг 100-аар хязгаарладаг.
    api.get('/api/products?limit=100').then(r => setProducts(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const total = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * l.unitPrice, 0),
    [lines],
  );
  const totalUnits = useMemo(() => lines.reduce((s, l) => s + l.quantity, 0), [lines]);
  // Нийт жин — жин оруулаагүй бараа 0 гэж тооцогдоно.
  const totalWeight = useMemo(
    () => lines.reduce((s, l) => s + l.quantity * (l.weightGrams || 0), 0),
    [lines],
  );

  /** Зураасан кодыг барааны SKU-тай тааруулна. Энэ системд SKU нь баркод. */
  const handleScanned = (code: string) => {
    setScannerOpen(false);
    const target = normalizeCode(code);
    const found = products.find(p => normalizeCode(p.sku ?? '') === target);
    if (!found) {
      notify('Олдсонгүй', `"${code}" кодтой бараа бүртгэлгүй байна.`);
      return;
    }
    setPickerOpen(false);
    setPending(found);
  };

  const handleAdd = (result: QuantityResult) => {
    if (!pending) return;
    const perBox = Math.max(1, Number(pending.unitsPerBox ?? 1));
    setLines(prev => {
      // Ижил бараа давхар сонгосон бол мөрийг нэгтгэнэ.
      const idx = prev.findIndex(l => l.productId === pending.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = {
          ...next[idx],
          quantity: next[idx].quantity + result.quantity,
          boxes: next[idx].boxes + result.boxes,
          pieces: next[idx].pieces + result.pieces,
          unitPrice: result.unitPrice,
        };
        return next;
      }
      return [...prev, {
        productId: pending.id,
        name: pending.name,
        sku: pending.sku,
        quantity: result.quantity,
        unitPrice: result.unitPrice,
        boxes: result.boxes,
        pieces: result.pieces,
        unitsPerBox: perBox,
        weightGrams: Number((pending as any).weightGrams ?? 0),
      }];
    });
    setPending(null);
    setPickerOpen(false);
  };

  const removeLine = (productId: string) =>
    setLines(prev => prev.filter(l => l.productId !== productId));

  const handleSubmit = async () => {
    if (!supplierId) { setError('Нийлүүлэгч сонгоно уу'); return; }
    if (lines.length === 0) { setError('Хамгийн багадаа 1 бараа нэмнэ үү'); return; }
    setSubmitting(true); setError(null);
    try {
      await api.post('/api/purchase-receipts', {
        supplierId,
        notes: notes.trim() || undefined,
        items: lines.map(l => ({
          productId: l.productId,
          quantity: l.quantity,
          unitPrice: l.unitPrice,
        })),
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
    <>
      <FormModal
        title="Бараа орлого"
        subtitle={
          lines.length > 0
            ? `${totalUnits}ш · ${formatCurrency(total)}${totalWeight > 0 ? ` · ${formatWeight(totalWeight)}` : ''}`
            : undefined
        }
        onSubmit={handleSubmit}
        submitting={submitting}
        errorMessage={error}
      >
        <FormField
          label="Нийлүүлэгч"
          value={supplierId}
          onChange={setSupplierId}
          type="select"
          required
          options={suppliers.map(s => ({ label: s.name, value: s.id }))}
        />

        <View style={st.section}>
          <View style={st.sectionHead}>
            <Text style={st.sectionTitle}>БАРАА ({lines.length})</Text>
            {lines.length > 0 ? (
              <Text style={st.sectionTotal}>{formatCurrency(total)}</Text>
            ) : null}
          </View>

          <View style={st.actions}>
            <TouchableOpacity style={st.searchBtn} onPress={() => setPickerOpen(true)}>
              <Ionicons name="search" size={18} color="#14B8A6" />
              <Text style={st.searchBtnText}>Бараа хайх</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.scanBtn} onPress={() => setScannerOpen(true)}>
              <Ionicons name="barcode-outline" size={20} color="#fff" />
              <Text style={st.scanBtnText}>Сканнер</Text>
            </TouchableOpacity>
          </View>

          {lines.length === 0 ? (
            <View style={st.emptyBox}>
              <Ionicons name="cube-outline" size={26} color="#C7C7CC" />
              <Text style={st.emptyText}>Бараа хайж эсвэл сканнердаж нэмнэ үү</Text>
            </View>
          ) : (
            lines.map(l => (
              <View key={l.productId} style={st.lineCard}>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Text style={st.lineName} numberOfLines={1}>{l.name}</Text>
                  <Text style={st.lineMeta}>
                    {formatQty(l.quantity, l.unitsPerBox)}
                    {l.unitsPerBox > 1 && l.quantity >= l.unitsPerBox ? ` · ${l.quantity}ш` : ''}
                    {' · '}{formatCurrency(l.unitPrice)}
                    {l.weightGrams > 0 ? ` · ${formatWeight(l.quantity * l.weightGrams)}` : ''}
                  </Text>
                </View>
                <Text style={st.lineTotal}>{formatCurrency(l.quantity * l.unitPrice)}</Text>
                <TouchableOpacity onPress={() => removeLine(l.productId)} style={{ paddingLeft: 8 }}>
                  <Ionicons name="close-circle" size={20} color="#FF3B30" />
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        <FormField label="Тэмдэглэл" value={notes} onChange={setNotes} type="textarea" />
      </FormModal>

      <ProductPicker
        visible={pickerOpen}
        products={products}
        onClose={() => setPickerOpen(false)}
        onSelect={p => setPending(p)}
        onScanRequest={() => setScannerOpen(true)}
      />

      <QuantitySheet
        product={pending}
        onCancel={() => setPending(null)}
        onConfirm={handleAdd}
      />

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScanned}
      />
    </>
  );
}

const st = StyleSheet.create({
  section: { marginHorizontal: 12, marginTop: 14 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5 },
  sectionTotal: { fontSize: 14, fontWeight: '800', color: '#14B8A6' },
  actions: { flexDirection: 'row', gap: 8, marginBottom: 10 },
  searchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, borderRadius: 12, backgroundColor: '#14B8A612', borderWidth: 1, borderColor: '#14B8A630',
  },
  searchBtnText: { fontSize: 15, fontWeight: '600', color: '#14B8A6' },
  scanBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 46, paddingHorizontal: 16, borderRadius: 12, backgroundColor: '#14B8A6',
  },
  scanBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
  emptyBox: {
    alignItems: 'center', gap: 8, paddingVertical: 26, borderRadius: 12,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8ECF0', borderStyle: 'dashed',
  },
  emptyText: { fontSize: 13, color: '#8E8E93' },
  lineCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff',
    borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0',
  },
  lineName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  lineMeta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  lineTotal: { fontSize: 15, fontWeight: '700', color: '#1C1C1E', marginLeft: 8 },
});
