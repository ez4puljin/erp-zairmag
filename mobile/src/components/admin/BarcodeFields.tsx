import React from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

/**
 * Нэг бараанд олон баркод оруулах талбар.
 *
 * Нэг бараа хэд хэдэн баркодтой байж болно, мөн код нь өөр бараатай
 * давхардаж болно (үйлдвэрлэгч ижил кодыг өөр амтанд өгдөг).
 */
export function BarcodeFields({
  value,
  onChange,
  onScanRequest,
}: {
  value: string[];
  onChange: (next: string[]) => void;
  /** Камераар уншуулах товч. Заагаагүй бол харагдахгүй. */
  onScanRequest?: (index: number) => void;
}) {
  const rows = value.length > 0 ? value : [''];

  const setAt = (i: number, v: string) => {
    const next = [...rows];
    next[i] = v;
    onChange(next);
  };

  const removeAt = (i: number) => {
    const next = rows.filter((_, idx) => idx !== i);
    onChange(next.length > 0 ? next : ['']);
  };

  return (
    <View style={s.wrap}>
      <Text style={s.label}>Баркод</Text>
      {rows.map((code, i) => (
        <View key={i} style={s.row}>
          <TextInput
            style={s.input}
            value={code}
            onChangeText={v => setAt(i, v)}
            placeholder="8656021315078"
            placeholderTextColor="#AEAEB2"
            keyboardType="numeric"
            autoCapitalize="none"
            autoCorrect={false}
          />
          {onScanRequest ? (
            <TouchableOpacity style={s.scanBtn} onPress={() => onScanRequest(i)}>
              <Ionicons name="barcode-outline" size={20} color="#fff" />
            </TouchableOpacity>
          ) : null}
          {rows.length > 1 ? (
            <TouchableOpacity style={s.removeBtn} onPress={() => removeAt(i)}>
              <Ionicons name="close" size={18} color="#FF3B30" />
            </TouchableOpacity>
          ) : null}
        </View>
      ))}
      <TouchableOpacity style={s.addBtn} onPress={() => onChange([...rows, ''])}>
        <Ionicons name="add" size={16} color="#007AFF" />
        <Text style={s.addText}>Баркод нэмэх</Text>
      </TouchableOpacity>
    </View>
  );
}

/** Хоосон болон давхардсаныг хасаж API руу илгээхэд бэлдэнэ. */
export function cleanBarcodes(codes: string[]): string[] {
  const seen = new Set<string>();
  for (const c of codes) {
    const t = String(c ?? '').trim();
    if (t) seen.add(t);
  }
  return [...seen];
}

const s = StyleSheet.create({
  wrap: { marginBottom: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#8E8E93', marginBottom: 6 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  input: {
    flex: 1, height: 44, paddingHorizontal: 12, borderRadius: 10,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8ECF0',
    fontSize: 15, color: '#1C1C1E',
  },
  scanBtn: {
    width: 44, height: 44, borderRadius: 10, backgroundColor: '#14B8A6',
    justifyContent: 'center', alignItems: 'center',
  },
  removeBtn: {
    width: 36, height: 44, justifyContent: 'center', alignItems: 'center',
  },
  addBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 2 },
  addText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
});
