import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { formatCurrency } from '@/src/lib/format';
import type { PickerProduct } from './ProductPicker';
import { primaryBarcode } from '@/src/lib/barcode';

export interface QuantityResult {
  /** Нийт ширхэг = хайрцаг × хайрцагт байх тоо + үлдэгдэл ширхэг. */
  quantity: number;
  unitPrice: number;
  boxes: number;
  pieces: number;
}

/**
 * Сонгосон барааны тоо хэмжээ, үнийг оруулах доод цонх.
 *
 * Агуулахад бараа хайрцгаар ирдэг тул хайрцаг болон ширхгийг тусад нь
 * оруулж, нийт ширхгийг шууд харуулна. Үнэ нь өртгийн үнээс эхэлнэ.
 */
export function QuantitySheet({
  product,
  onCancel,
  onConfirm,
  confirmLabel = 'Нэмэх',
}: {
  product: PickerProduct | null;
  onCancel: () => void;
  onConfirm: (result: QuantityResult) => void;
  confirmLabel?: string;
}) {
  const insets = useSafeAreaInsets();
  const perBox = Math.max(1, Number(product?.unitsPerBox ?? 1));
  const [boxes, setBoxes] = useState('');
  const [pieces, setPieces] = useState('');
  const [price, setPrice] = useState('');

  useEffect(() => {
    if (product) {
      setBoxes('');
      setPieces('');
      setPrice(String(Math.round(Number(product.costPrice ?? 0)) || ''));
    }
  }, [product]);

  if (!product) return null;

  const boxCount = Number(boxes || 0);
  const pieceCount = Number(pieces || 0);
  const totalQty = boxCount * perBox + pieceCount;
  const unitPrice = Number(price || 0);
  const lineTotal = totalQty * unitPrice;
  const valid = totalQty > 0;

  return (
    <Modal visible transparent animationType="fade" onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={s.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <TouchableOpacity style={StyleSheet.absoluteFill} activeOpacity={1} onPress={onCancel} />

        <View style={[s.sheet, { paddingBottom: Math.max(insets.bottom, 12) + 10 }]}>
          <View style={s.handle} />

          <Text style={s.name} numberOfLines={2}>{product.name}</Text>
          <Text style={s.sku}>
            {primaryBarcode(product) ?? '—'}
            {perBox > 1 ? ` · хайрцагт ${perBox}ш` : ' · ширхэгээр'}
          </Text>

          <View style={s.qtyRow}>
            {perBox > 1 ? (
              <View style={s.field}>
                <Text style={s.label}>ХАЙРЦАГ</Text>
                <TextInput
                  style={s.input}
                  value={boxes}
                  onChangeText={t => setBoxes(t.replace(/[^0-9]/g, ''))}
                  placeholder="0"
                  placeholderTextColor="#C7C7CC"
                  keyboardType="number-pad"
                  autoFocus
                />
              </View>
            ) : null}
            <View style={s.field}>
              <Text style={s.label}>ШИРХЭГ</Text>
              <TextInput
                style={s.input}
                value={pieces}
                onChangeText={t => setPieces(t.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor="#C7C7CC"
                keyboardType="number-pad"
                autoFocus={perBox <= 1}
              />
            </View>
            <View style={s.field}>
              <Text style={s.label}>НЭГЖ ҮНЭ</Text>
              <TextInput
                style={s.input}
                value={price}
                onChangeText={t => setPrice(t.replace(/[^0-9]/g, ''))}
                placeholder="0"
                placeholderTextColor="#C7C7CC"
                keyboardType="number-pad"
              />
            </View>
          </View>

          <View style={s.totalRow}>
            <View>
              <Text style={s.totalLabel}>Нийт тоо</Text>
              <Text style={s.totalQty}>
                {totalQty} ш
                {perBox > 1 && boxCount > 0
                  ? `  (${boxCount}×${perBox}${pieceCount ? ` + ${pieceCount}` : ''})`
                  : ''}
              </Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={s.totalLabel}>Дүн</Text>
              <Text style={s.totalAmount}>{formatCurrency(lineTotal)}</Text>
            </View>
          </View>

          <TouchableOpacity
            style={[s.confirmBtn, !valid && { opacity: 0.4 }]}
            disabled={!valid}
            onPress={() => onConfirm({ quantity: totalQty, unitPrice, boxes: boxCount, pieces: pieceCount })}
          >
            <Ionicons name="add-circle" size={18} color="#fff" />
            <Text style={s.confirmText}>{confirmLabel}</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const s = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: {
    backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22,
    paddingHorizontal: 18, paddingTop: 10,
  },
  handle: { width: 36, height: 4, borderRadius: 2, backgroundColor: '#D8DEE8', alignSelf: 'center', marginBottom: 14 },
  name: { fontSize: 18, fontWeight: '700', color: '#1C1C1E' },
  sku: { fontSize: 12, color: '#8E8E93', marginTop: 3 },
  qtyRow: { flexDirection: 'row', gap: 10, marginTop: 18 },
  field: { flex: 1 },
  label: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.4, marginBottom: 5 },
  input: {
    height: 50, borderRadius: 12, backgroundColor: '#F5F6FA', borderWidth: 1, borderColor: '#E8ECF0',
    paddingHorizontal: 12, fontSize: 19, fontWeight: '700', color: '#1C1C1E', textAlign: 'center',
  },
  totalRow: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-end',
    marginTop: 18, paddingTop: 14, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0',
  },
  totalLabel: { fontSize: 11, fontWeight: '600', color: '#8E8E93' },
  totalQty: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginTop: 2 },
  totalAmount: { fontSize: 20, fontWeight: '800', color: '#14B8A6', marginTop: 2 },
  confirmBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 7,
    height: 52, borderRadius: 14, backgroundColor: '#14B8A6', marginTop: 16,
  },
  confirmText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
