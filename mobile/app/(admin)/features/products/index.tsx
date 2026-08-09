import React, { useEffect, useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, StatusBar } from 'react-native';
import { Image } from 'expo-image';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { AdminListScreen, ListCard, FilterChips, ListSummary } from '@/src/components/admin';
import { getImageUrl } from '@/src/lib/image-url';
import { formatCurrency } from '@/src/lib/format';
import api from '@/src/lib/api';
import type { Product } from '@/src/types';
import { primaryBarcode } from '@/src/lib/barcode';

export default function ProductsListScreen() {
  const [categories, setCategories] = useState<any[]>([]);
  const [categoryId, setCategoryId] = useState('');
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
        title="Бүтээгдэхүүн"
        endpoint="/api/products"
        searchPlaceholder="Бараа хайх..."
        createRoute="/(admin)/features/products/new"
        emptyIcon="cube-outline"
        emptyTitle="Бараа байхгүй"
        filters={filters}
        filterKey="categoryId"
        defaultFilter={categoryId}
        headerSummary={(items: any[]) => {
          const lowStock = items.filter(p => (p.stockAvailable ?? 0) <= (p.reorderLevel ?? 0));
          const stockValue = items.reduce(
            (s, p) => s + Number(p.stockAvailable ?? 0) * Number(p.sellingPrice ?? 0),
            0,
          );
          return (
            <ListSummary
              stats={[
                { label: 'Бараа', value: items.length },
                { label: 'Дуусч буй', value: lowStock.length, color: lowStock.length > 0 ? '#FF3B30' : undefined },
                { label: 'Нөөцийн дүн', value: formatCurrency(stockValue) },
              ]}
            />
          );
        }}
        renderItem={(p: any) => {
          const low = (p.stockAvailable ?? 0) <= (p.reorderLevel ?? 0);
          const imgUrl = p.imageUrl ? getImageUrl(p.imageUrl) : null;
          return (
            <View style={s.cardWrap}>
              {imgUrl ? (
                <Pressable onPress={() => setPreviewUri(imgUrl)} style={s.thumb}>
                  <Image source={{ uri: imgUrl }} style={s.thumbImg} contentFit="cover" cachePolicy="disk" />
                </Pressable>
              ) : (
                <View style={[s.thumb, s.thumbPh]}>
                  <Ionicons name="cube-outline" size={22} color="#D1D5DB" />
                </View>
              )}
              <TouchableOpacity
                style={{ flex: 1 }}
                onPress={() => router.push(`/(admin)/features/products/edit/${p.id}` as any)}
                activeOpacity={0.7}
              >
                <View style={s.info}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.name} numberOfLines={1}>{p.name}</Text>
                    <Text style={s.meta} numberOfLines={1}>
                      {primaryBarcode(p) ?? '—'} {p.category?.name ? `· ${p.category.name}` : ''}
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={s.price}>{formatCurrency(p.sellingPrice)}</Text>
                    {p.sellingPriceRural && Number(p.sellingPriceRural) !== Number(p.sellingPrice) ? (
                      <Text style={{ fontSize: 10, color: '#34C759', fontWeight: '600' }}>О.Н: {formatCurrency(p.sellingPriceRural)}</Text>
                    ) : null}
                    <Text style={[s.stock, low && { color: '#FF9500' }]}>{p.stockAvailable ?? 0} ш</Text>
                  </View>
                </View>
              </TouchableOpacity>
            </View>
          );
        }}
      />

      {/* Image preview modal */}
      <Modal visible={!!previewUri} transparent animationType="fade" onRequestClose={() => setPreviewUri(null)}>
        <StatusBar barStyle="light-content" />
        <Pressable style={s.previewOverlay} onPress={() => setPreviewUri(null)}>
          {previewUri ? (
            <Image source={{ uri: previewUri }} style={s.previewImg} contentFit="contain" />
          ) : null}
          <View style={s.closeBtn}>
            <Ionicons name="close" size={28} color="#fff" />
          </View>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  cardWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#fff', borderRadius: 14, padding: 10, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  thumb: { width: 52, height: 52, borderRadius: 10, overflow: 'hidden' },
  thumbImg: { width: '100%', height: '100%' },
  thumbPh: { backgroundColor: '#F2F4F7', justifyContent: 'center', alignItems: 'center' },
  info: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  name: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  meta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  price: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  stock: { fontSize: 12, color: '#34C759', fontWeight: '600', marginTop: 2 },
  previewOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.95)', justifyContent: 'center', alignItems: 'center' },
  previewImg: { width: '100%', height: '80%' },
  closeBtn: { position: 'absolute', top: 50, right: 20, width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.15)', justifyContent: 'center', alignItems: 'center' },
});
