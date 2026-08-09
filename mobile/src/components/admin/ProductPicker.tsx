import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, FlatList, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@/src/lib/format';

export interface PickerProduct {
  id: string;
  name: string;
  sku?: string;
  unitsPerBox?: number;
  costPrice?: number | string;
  sellingPrice?: number | string;
  stockAvailable?: number;
}

/** Зураасан кодыг харьцуулахад тоо болон үсгээс бусдыг хаяна. */
export function normalizeCode(code: string): string {
  return (code || '').replace(/[^0-9a-zA-Z]/g, '').toLowerCase();
}

/**
 * Барааг хайж эсвэл зураасан кодоор олж сонгох цонх.
 *
 * Энэ системд барааны SKU нь зураасан кодын үүрэг гүйцэтгэдэг (POS ч мөн
 * түүгээр тааруулдаг), тиймээс сканнердсан кодыг SKU-тай харьцуулна.
 */
export function ProductPicker({
  visible,
  products,
  onClose,
  onSelect,
  onScanRequest,
}: {
  visible: boolean;
  products: PickerProduct[];
  onClose: () => void;
  onSelect: (product: PickerProduct) => void;
  /** Камераар сканнердах товч. Заагаагүй бол товч харагдахгүй. */
  onScanRequest?: () => void;
}) {
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return products;
    const code = normalizeCode(q);
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.sku ?? '').toLowerCase().includes(q) ||
      (code.length >= 4 && normalizeCode(p.sku ?? '').includes(code)),
    );
  }, [products, query]);

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose} transparent={false}>
      <View style={s.container}>
        <View style={[s.header, { paddingTop: Math.max(insets.top, 12) + 8 }]}>
          <TouchableOpacity onPress={onClose} style={s.headerBtn}>
            <Text style={s.cancel}>Хаах</Text>
          </TouchableOpacity>
          <Text style={s.headerTitle}>Бараа сонгох</Text>
          <View style={s.headerBtn} />
        </View>

        <View style={s.searchRow}>
          <View style={s.searchBox}>
            <Ionicons name="search" size={16} color="#8E8E93" />
            <TextInput
              style={s.searchInput}
              value={query}
              onChangeText={setQuery}
              placeholder="Нэр эсвэл код..."
              placeholderTextColor="#AEAEB2"
              autoCapitalize="none"
              autoCorrect={false}
              autoFocus={Platform.OS === 'web'}
            />
            {query ? (
              <TouchableOpacity onPress={() => setQuery('')}>
                <Ionicons name="close-circle" size={16} color="#C7C7CC" />
              </TouchableOpacity>
            ) : null}
          </View>
          {onScanRequest ? (
            <TouchableOpacity style={s.scanBtn} onPress={onScanRequest}>
              <Ionicons name="barcode-outline" size={22} color="#fff" />
            </TouchableOpacity>
          ) : null}
        </View>

        <FlatList
          data={filtered}
          keyExtractor={p => p.id}
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          ListEmptyComponent={<Text style={s.empty}>Бараа олдсонгүй</Text>}
          renderItem={({ item }) => (
            <TouchableOpacity style={s.row} activeOpacity={0.6} onPress={() => onSelect(item)}>
              <View style={s.rowIcon}>
                <Ionicons name="cube-outline" size={20} color="#14B8A6" />
              </View>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={s.rowName} numberOfLines={1}>{item.name}</Text>
                <Text style={s.rowMeta} numberOfLines={1}>
                  {item.sku}
                  {(item.unitsPerBox ?? 1) > 1 ? ` · хайрцагт ${item.unitsPerBox}ш` : ''}
                </Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={s.rowPrice}>{formatCurrency(item.costPrice ?? 0)}</Text>
                <Text style={s.rowStock}>{item.stockAvailable ?? 0} ш</Text>
              </View>
            </TouchableOpacity>
          )}
        />
      </View>
    </Modal>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 12, paddingBottom: 12,
    backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0',
  },
  headerBtn: { minWidth: 56 },
  cancel: { fontSize: 15, color: '#007AFF', fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  searchBox: {
    flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, height: 44,
    paddingHorizontal: 12, borderRadius: 12, backgroundColor: '#fff',
    borderWidth: 1, borderColor: '#E8ECF0',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1C1C1E' },
  scanBtn: {
    width: 44, height: 44, borderRadius: 12, backgroundColor: '#14B8A6',
    justifyContent: 'center', alignItems: 'center',
  },
  row: {
    flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff',
    borderRadius: 12, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0',
  },
  rowIcon: { width: 40, height: 40, borderRadius: 10, backgroundColor: '#14B8A615', justifyContent: 'center', alignItems: 'center' },
  rowName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  rowMeta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  rowPrice: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  rowStock: { fontSize: 11, color: '#34C759', fontWeight: '600', marginTop: 2 },
  empty: { textAlign: 'center', color: '#8E8E93', paddingVertical: 40 },
});
