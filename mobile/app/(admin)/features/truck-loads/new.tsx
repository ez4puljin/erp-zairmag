import React, { useEffect, useMemo, useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView, ActivityIndicator, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import api from '@/src/lib/api';
import {
  ProductPicker, QuantitySheet, BarcodeScannerModal, hasBarcode,
  type PickerProduct, type QuantityResult,
} from '@/src/components/admin';

interface Driver {
  id: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
}

interface Line {
  productId: string;
  name: string;
  qty: number;
}

/**
 * Админ шинэ ачилт үүсгэх дэлгэц.
 *
 * Үүсгээд шууд илгээнэ (dispatch) — илгээж байж нөөц машин руу шилжиж,
 * жолооч POS дээр зарах боломжтой болно.
 */
export default function NewTruckLoadScreen() {
  const insets = useSafeAreaInsets();

  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [driverId, setDriverId] = useState('');
  const [locationType, setLocationType] = useState<'URBAN' | 'RURAL'>('URBAN');

  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanQuery, setScanQuery] = useState('');
  const [pending, setPending] = useState<PickerProduct | null>(null);
  const [lines, setLines] = useState<Line[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    Promise.all([
      api.get('/api/drivers').then(r => r.data?.data ?? r.data ?? []).catch(() => []),
      api.get('/api/products?limit=200').then(r => r.data?.data ?? r.data ?? []).catch(() => []),
    ]).then(([drv, prod]) => {
      setDrivers(drv);
      setProducts(prod);
      if (drv.length === 1) setDriverId(drv[0].id);
    }).finally(() => setLoading(false));
  }, []);

  const totalUnits = useMemo(() => lines.reduce((s, l) => s + l.qty, 0), [lines]);

  const handleScanned = (code: string) => {
    setScannerOpen(false);
    // Нэг баркодыг хэд хэдэн бараа хуваалцаж болно — бүх таарцыг цуглуулна.
    const matches = products.filter(p => hasBarcode(p, code));
    if (matches.length === 0) {
      Alert.alert('Олдсонгүй', `"${code}" кодтой бараа бүртгэлгүй байна.`);
      return;
    }
    if (matches.length > 1) {
      setScanQuery(code.trim());
      setPickerOpen(true);
      return;
    }
    setPickerOpen(false);
    setPending(matches[0]);
  };

  const handlePickQty = (result: QuantityResult) => {
    if (!pending) return;
    setLines(prev => {
      const found = prev.find(l => l.productId === pending.id);
      if (found) {
        return prev.map(l => l.productId === pending.id ? { ...l, qty: l.qty + result.quantity } : l);
      }
      return [...prev, { productId: pending.id, name: pending.name, qty: result.quantity }];
    });
    setPending(null);
    setPickerOpen(false);
  };

  const handleSubmit = async () => {
    if (!driverId) { Alert.alert('Алдаа', 'Жолооч сонгоно уу.'); return; }
    if (lines.length === 0) { Alert.alert('Алдаа', 'Бараа нэмнэ үү.'); return; }
    setSubmitting(true);
    try {
      const { data: created } = await api.post('/api/truck-loads', {
        driverId,
        loadDate: new Date().toISOString().slice(0, 10),
        locationType,
        items: lines.map(l => ({ productId: l.productId, loadedQty: l.qty })),
      });
      await api.post(`/api/truck-loads/${created.id}/dispatch`);
      Alert.alert('Амжилттай', `Ачилт #${created.loadNumber} үүсч, илгээгдлээ.`, [
        { text: 'OK', onPress: () => router.replace(`/(admin)/features/truck-loads/${created.id}` as any) },
      ]);
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <View style={s.centered}>
        <ActivityIndicator size="large" color="#5856D6" />
      </View>
    );
  }

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <TouchableOpacity onPress={() => router.back()} style={s.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#007AFF" />
        </TouchableOpacity>
        <Text style={s.headerTitle}>Шинэ ачилт</Text>
        <View style={s.backBtn} />
      </View>

      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 120 }}>
        <Text style={s.label}>Жолооч</Text>
        {drivers.length === 0 ? (
          <Text style={s.hint}>Жолооч бүртгэгдээгүй байна.</Text>
        ) : (
          <View style={s.chips}>
            {drivers.map(d => {
              const name = `${d.lastName ?? ''} ${d.firstName ?? ''}`.trim() || d.phone || 'Жолооч';
              return (
                <TouchableOpacity
                  key={d.id}
                  style={[s.chip, driverId === d.id && s.chipActive]}
                  onPress={() => setDriverId(d.id)}
                >
                  <Text style={[s.chipText, driverId === d.id && s.chipTextActive]}>{name}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <Text style={s.label}>Үнийн бүс</Text>
        <View style={s.chips}>
          {(['URBAN', 'RURAL'] as const).map(t => (
            <TouchableOpacity
              key={t}
              style={[s.chip, locationType === t && s.chipActive]}
              onPress={() => setLocationType(t)}
            >
              <Text style={[s.chipText, locationType === t && s.chipTextActive]}>
                {t === 'URBAN' ? 'Мөрөн' : 'Орон нутаг'}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={s.label}>Бараа ({totalUnits}ш)</Text>
        {lines.length === 0 ? (
          <Text style={s.hint}>Ачих барааг нэмнэ үү</Text>
        ) : (
          lines.map(l => (
            <View key={l.productId} style={s.row}>
              <Text style={s.rowName} numberOfLines={1}>{l.name}</Text>
              <Text style={s.rowQty}>{l.qty}ш</Text>
              <TouchableOpacity onPress={() => setLines(p => p.filter(x => x.productId !== l.productId))}>
                <Ionicons name="close-circle" size={20} color="#FF3B30" />
              </TouchableOpacity>
            </View>
          ))
        )}

        <View style={s.actions}>
          <TouchableOpacity style={s.searchBtn} onPress={() => { setScanQuery(''); setPickerOpen(true); }}>
            <Ionicons name="search" size={18} color="#5856D6" />
            <Text style={s.searchText}>Бараа хайх</Text>
          </TouchableOpacity>
          <TouchableOpacity style={s.scanBtn} onPress={() => setScannerOpen(true)}>
            <Ionicons name="barcode-outline" size={22} color="#fff" />
          </TouchableOpacity>
        </View>
      </ScrollView>

      <View style={[s.footer, { paddingBottom: Math.max(insets.bottom, 12) }]}>
        <TouchableOpacity
          style={[s.submitBtn, (submitting || lines.length === 0 || !driverId) && { opacity: 0.4 }]}
          onPress={handleSubmit}
          disabled={submitting || lines.length === 0 || !driverId}
        >
          {submitting ? <ActivityIndicator color="#fff" /> : (
            <Text style={s.submitText}>Ачилт үүсгэх ({totalUnits}ш)</Text>
          )}
        </TouchableOpacity>
      </View>

      <ProductPicker
        visible={pickerOpen}
        products={products}
        onClose={() => setPickerOpen(false)}
        initialQuery={scanQuery}
        onSelect={p => setPending(p)}
        onScanRequest={() => setScannerOpen(true)}
      />
      <QuantitySheet
        product={pending}
        onCancel={() => setPending(null)}
        onConfirm={handlePickQty}
        confirmLabel="Жагсаалтад нэмэх"
      />
      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScanned}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 8, paddingBottom: 12, backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0',
  },
  backBtn: { width: 44, height: 32, justifyContent: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  label: { fontSize: 13, fontWeight: '700', color: '#8E8E93', marginTop: 18, marginBottom: 8, textTransform: 'uppercase' },
  hint: { fontSize: 14, color: '#8E8E93', paddingVertical: 12 },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: {
    paddingHorizontal: 14, height: 40, borderRadius: 10, justifyContent: 'center',
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA',
  },
  chipActive: { backgroundColor: '#5856D6', borderColor: '#5856D6' },
  chipText: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  chipTextActive: { color: '#fff' },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff',
    borderRadius: 10, paddingHorizontal: 12, paddingVertical: 11, marginBottom: 8,
  },
  rowName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  rowQty: { fontSize: 15, fontWeight: '700', color: '#5856D6' },
  actions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  searchBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    height: 48, borderRadius: 12, backgroundColor: '#5856D612', borderWidth: 1, borderColor: '#5856D630',
  },
  searchText: { fontSize: 15, fontWeight: '600', color: '#5856D6' },
  scanBtn: { width: 56, height: 48, borderRadius: 12, backgroundColor: '#5856D6', alignItems: 'center', justifyContent: 'center' },
  footer: {
    paddingHorizontal: 16, paddingTop: 12, backgroundColor: '#fff',
    borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0',
  },
  submitBtn: { height: 52, borderRadius: 14, backgroundColor: '#5856D6', alignItems: 'center', justifyContent: 'center' },
  submitText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
