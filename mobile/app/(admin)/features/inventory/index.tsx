import React, { useEffect, useState } from 'react';
import { router } from 'expo-router';
import { View, TouchableOpacity, Text, StyleSheet, Modal, Pressable, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { AdminListScreen } from '@/src/components/admin';
import { formatCurrency } from '@/src/lib/format';
import { getImageUrl } from '@/src/lib/image-url';
import api from '@/src/lib/api';
import type { Product } from '@/src/types';
import { primaryBarcode } from '@/src/lib/barcode';

export default function InventoryListScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [previewUri, setPreviewUri] = useState<string | null>(null);

  useEffect(() => {
    api.get('/api/categories').then(r => setCategories(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const filters = [
    { value: '', label: 'Бүгд' },
    ...categories.map(c => ({ value: c.id, label: c.name })),
  ];

  return (
    <>
      <AdminListScreen<Product>
        title="Агуулах"
        endpoint="/api/inventory"
        searchPlaceholder="Бараа хайх..."
        paginated={false}
        filters={filters}
        filterKey="categoryId"
        headerSummary={(items) => {
          const lowStock = items.filter((i: any) => (i.stockAvailable ?? 0) <= (i.reorderLevel ?? 0)).length;
          const totalValue = items.reduce((s: number, i: any) => s + Number(i.sellingPrice ?? 0) * (i.stockAvailable ?? 0), 0);
          return (
            <View style={{ flexDirection: 'row', gap: 8, marginBottom: 4 }}>
              <View style={[s.statBox, { backgroundColor: '#FF9500' + '10', borderLeftColor: '#FF9500' }]}>
                <Text style={s.statLabel}>Нөөц дутуу</Text>
                <Text style={[s.statValue, { color: '#FF9500' }]}>{lowStock}</Text>
              </View>
              <View style={[s.statBox, { backgroundColor: '#34C759' + '10', borderLeftColor: '#34C759' }]}>
                <Text style={s.statLabel}>Нөөцийн үнэ</Text>
                <Text style={[s.statValue, { color: '#34C759' }]}>{formatCurrency(totalValue)}</Text>
              </View>
            </View>
          );
        }}
        renderItem={(p: any) => {
          const low = (p.stockAvailable ?? 0) <= (p.reorderLevel ?? 0);
          const out = (p.stockAvailable ?? 0) <= 0;
          const imgUrl = p.imageUrl ? getImageUrl(p.imageUrl) : null;
          return (
            <View style={s.cardWrap}>
              {imgUrl ? (
                <Pressable onPress={() => setPreviewUri(imgUrl)} style={s.thumb}>
                  <Image source={{ uri: imgUrl }} style={s.thumbImg} contentFit="cover" cachePolicy="disk" />
                </Pressable>
              ) : (
                <View style={[s.thumb, s.thumbPh]}>
                  <Ionicons name={out ? 'alert-circle-outline' : low ? 'warning-outline' : 'cube-outline'} size={22} color={out ? '#FF3B30' : low ? '#FF9500' : '#34C759'} />
                </View>
              )}
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => router.push(`/(admin)/features/inventory/adjust/${p.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={s.info}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {primaryBarcode(p) ?? '—'} · {formatCurrency(p.sellingPrice)}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={[s.stock, out && { color: '#FF3B30' }, !out && low && { color: '#FF9500' }]}>{p.stockAvailable ?? 0} ш</Text>
                    <Text style={s.reorder}>зах: {p.reorderLevel ?? 0}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <StatusBar barStyle="light-content" />
        <Pressable style={s.previewOverlay} onPress={() => setPreviewUri(null)}>
          {previewUri ? <Image source={{ uri: previewUri }} style={s.previewImg} contentFit="contain" /> : null}
          <View style={s.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  statBox: { flex: 1, borderRadius: 12, padding: 12, borderLeftWidth: 3 },
  statLabel: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3 },
  statValue: { fontSize: 18, fontWeight: '800', marginTop: 4 },
  cardWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  thumb: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  thumbPh: { backgroundColor: '#F2F4F7', justifyContent: 'center', alignItems: 'center' },
  info: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  meta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  stock: { fontSize: 16, fontWeight: '800', color: '#34C759' },
  reorder: { fontSize: 10, color: '#AEAEB2', marginTop: 2 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  previewImg: { width: '100%', height: '80%' },
  closeBtn: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
});
