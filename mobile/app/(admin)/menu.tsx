import React, { useState, useMemo } from 'react';
import { View, Text, ScrollView, StyleSheet, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MenuTile } from '@/src/components/admin';

interface Item { icon: keyof typeof Ionicons.glyphMap; label: string; color: string; route: string; }
interface Section { title: string; items: Item[]; }

const SECTIONS: Section[] = [
  {
    title: 'БОРЛУУЛАЛТ',
    items: [
      { icon: 'bag-handle', label: 'POS', color: '#34C759', route: '/(admin)/features/pos' },
      { icon: 'receipt', label: 'Нэхэмжлэл', color: '#AF52DE', route: '/(admin)/features/invoices' },
    ],
  },
  {
    title: 'АГУУЛАХ & БАРАА',
    items: [
      { icon: 'cube', label: 'Бүтээгдэхүүн', color: '#34C759', route: '/(admin)/features/products' },
      { icon: 'folder', label: 'Ангилал', color: '#EAB308', route: '/(admin)/features/categories' },
      { icon: 'archive', label: 'Агуулах', color: '#0EA5E9', route: '/(admin)/features/inventory' },
      { icon: 'clipboard', label: 'Тооллого', color: '#5856D6', route: '/(admin)/features/inventory-counts' },
      { icon: 'business', label: 'Нийлүүлэгч', color: '#A855F7', route: '/(admin)/features/suppliers' },
      { icon: 'cart', label: 'Орлого', color: '#14B8A6', route: '/(admin)/features/purchase-receipts' },
      { icon: 'document-text', label: 'Бараа тайлан', color: '#0891B2', route: '/(admin)/features/product-ledger' },
    ],
  },
  {
    title: 'САНХҮҮ',
    items: [
      { icon: 'card', label: 'Төлбөр', color: '#EF4444', route: '/(admin)/features/payments' },
      { icon: 'book', label: 'Авлага', color: '#F472B6', route: '/(admin)/features/receivables' },
      { icon: 'document', label: 'Нийлүүлэгч тооцоо', color: '#EA580C', route: '/(admin)/features/supplier-payables' },
      { icon: 'card-outline', label: 'Дансны мэдээлэл', color: '#0EA5E9', route: '/(admin)/features/bank-accounts' },
      { icon: 'cash', label: 'Мөнгөн хаалт', color: '#A855F7', route: '/(admin)/features/cash-closings' },
      { icon: 'wallet', label: 'Зардал', color: '#FF3B30', route: '/(admin)/features/expenses' },
      { icon: 'pricetags', label: 'Зардлын ангилал', color: '#FF9500', route: '/(admin)/features/expense-categories' },
    ],
  },
  {
    title: 'ХҮМҮҮС',
    items: [
      { icon: 'people', label: 'Харилцагч', color: '#EC4899', route: '/(admin)/features/customers' },
      { icon: 'map', label: 'Бүс нутаг', color: '#F97316', route: '/(admin)/features/customer-categories' },
      { icon: 'car-sport', label: 'Жолооч', color: '#F59E0B', route: '/(admin)/features/drivers' },
    ],
  },
  {
    title: 'ТАЙЛАН & ТОХИРГОО',
    items: [
      { icon: 'stats-chart', label: 'Тайлан', color: '#6366F1', route: '/(admin)/features/reports' },
      { icon: 'chatbox', label: 'SMS тохиргоо', color: '#5856D6', route: '/(admin)/features/sms-settings' },
      { icon: 'document-text', label: 'Баримт тохиргоо', color: '#FF9500', route: '/(admin)/features/receipt-settings' },
    ],
  },
];

export default function MenuScreen() {
  const insets = useSafeAreaInsets();
  const [search, setSearch] = useState('');

  const filteredSections = useMemo(() => {
    if (!search.trim()) return SECTIONS;
    const q = search.toLowerCase();
    return SECTIONS
      .map(sec => ({ ...sec, items: sec.items.filter(i => i.label.toLowerCase().includes(q)) }))
      .filter(sec => sec.items.length > 0);
  }, [search]);

  return (
    <View style={s.container}>
      <View style={[s.header, { paddingTop: insets.top + 12 }]}>
        <Text style={s.title}>Цэс</Text>
        <View style={s.searchWrap}>
          <Ionicons name="search" size={18} color="#8E8E93" />
          <TextInput
            style={s.searchInput}
            placeholder="Функц хайх..."
            placeholderTextColor="#AEAEB2"
            value={search}
            onChangeText={setSearch}
          />
        </View>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 20 }}>
        {filteredSections.map(section => (
          <View key={section.title} style={s.section}>
            <Text style={s.sectionTitle}>{section.title}</Text>
            <View style={s.grid}>
              {section.items.map(item => (
                <MenuTile
                  key={item.route}
                  icon={item.icon}
                  label={item.label}
                  color={item.color}
                  onPress={() => router.push(item.route as any)}
                />
              ))}
            </View>
          </View>
        ))}

        {filteredSections.length === 0 && (
          <View style={s.empty}>
            <Ionicons name="search" size={40} color="#AEAEB2" />
            <Text style={s.emptyText}>Олдсонгүй</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { backgroundColor: '#fff', paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0' },
  title: { fontSize: 28, fontWeight: '800', color: '#1C1C1E', marginBottom: 10 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#F2F4F7', borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6 },
  searchInput: { flex: 1, fontSize: 15, color: '#1C1C1E' },
  section: { paddingHorizontal: 12, marginTop: 16 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  empty: { alignItems: 'center', paddingVertical: 60 },
  emptyText: { fontSize: 14, color: '#8E8E93', marginTop: 8 },
});
