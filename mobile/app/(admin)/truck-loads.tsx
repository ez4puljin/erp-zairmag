import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, FlatList, RefreshControl, ScrollView, StyleSheet,
  Text, TouchableOpacity, View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import api from '@/src/lib/api';
import { formatCurrency, formatDate } from '@/src/lib/format';
import type { PaginatedResponse } from '@/src/types';

interface TruckLoadItem {
  loadedQty: number;
  soldQty: number;
}
interface TruckLoadSale {
  totalAmount: number | string;
}
interface TruckLoad {
  id: string;
  loadNumber: number;
  status: 'LOADING' | 'DISPATCHED' | 'COMPLETED' | 'CANCELLED';
  loadDate?: string;
  createdAt: string;
  vehicleInfo?: string;
  driver?: { firstName?: string; lastName?: string; phone?: string };
  items?: TruckLoadItem[];
  sales?: TruckLoadSale[];
  _count?: { sales?: number };
}

const STATUS_FILTERS = [
  { key: 'ALL', label: 'Бүгд', icon: 'list-outline' as const },
  { key: 'COMPLETION_REQUESTED', label: 'Хүсэлтэй', icon: 'hourglass-outline' as const },
  { key: 'LOADING', label: 'Ачиж буй', icon: 'cube-outline' as const },
  { key: 'DISPATCHED', label: 'Замд', icon: 'car-outline' as const },
  { key: 'COMPLETED', label: 'Дууссан', icon: 'checkmark-circle-outline' as const },
];

const STATUS_INFO: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  LOADING:              { label: 'Ачиж буй',         color: '#FF9500', icon: 'cube' },
  DISPATCHED:           { label: 'Замд',             color: '#5856D6', icon: 'car' },
  COMPLETION_REQUESTED: { label: 'Дуусгах хүсэлт',   color: '#FF3B30', icon: 'hourglass' },
  COMPLETED:            { label: 'Дууссан',          color: '#34C759', icon: 'checkmark-circle' },
  CANCELLED:            { label: 'Цуцлагдсан',       color: '#8E8E93', icon: 'close-circle' },
};

export default function AdminTruckLoadsScreen() {
  const insets = useSafeAreaInsets();
  const [truckLoads, setTruckLoads] = useState<TruckLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeFilter, setActiveFilter] = useState<string>('ALL');

  const fetchTruckLoads = useCallback(async () => {
    try {
      const params = new URLSearchParams({ limit: '100', order: 'desc' });
      if (activeFilter !== 'ALL') params.append('status', activeFilter);
      const { data } = await api.get<PaginatedResponse<TruckLoad>>(`/api/truck-loads?${params}`);
      setTruckLoads(data.data ?? []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [activeFilter]);

  useEffect(() => {
    setLoading(true);
    fetchTruckLoads();
  }, [fetchTruckLoads]);

  useFocusEffect(useCallback(() => { fetchTruckLoads(); }, [fetchTruckLoads]));

  const onRefresh = () => {
    setRefreshing(true);
    fetchTruckLoads();
  };

  const renderItem = ({ item }: { item: TruckLoad }) => {
    const status = STATUS_INFO[item.status] ?? STATUS_INFO.LOADING;
    const driverName = item.driver ? `${item.driver.lastName ?? ''} ${item.driver.firstName ?? ''}`.trim() : '—';
    const loadDateStr = formatDate(item.loadDate || item.createdAt);
    const totalLoaded = (item.items ?? []).reduce((s, i) => s + (i.loadedQty ?? 0), 0);
    const totalSold = (item.items ?? []).reduce((s, i) => s + (i.soldQty ?? 0), 0);
    const totalRevenue = (item.sales ?? []).reduce((s, sale) => s + Number(sale.totalAmount ?? 0), 0);
    const salesCount = item._count?.sales ?? item.sales?.length ?? 0;

    return (
      <TouchableOpacity
        style={styles.card}
        activeOpacity={0.7}
        onPress={() => router.push(`/(admin)/features/truck-loads/${item.id}` as any)}
      >
        {/* Header: load # + status */}
        <View style={styles.cardHeader}>
          <View style={styles.numberWrap}>
            <Text style={styles.loadNumber}>#{item.loadNumber}</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: `${status.color}15` }]}>
            <Ionicons name={status.icon} size={11} color={status.color} />
            <Text style={[styles.badgeText, { color: status.color }]}>{status.label}</Text>
          </View>
        </View>

        {/* Driver + date row */}
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <View style={[styles.iconBox, { backgroundColor: '#5856D615' }]}>
              <Ionicons name="person" size={14} color="#5856D6" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.infoLabel}>Жолооч</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{driverName}</Text>
            </View>
          </View>
          <View style={styles.infoItem}>
            <View style={[styles.iconBox, { backgroundColor: '#FF950015' }]}>
              <Ionicons name="calendar" size={14} color="#FF9500" />
            </View>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.infoLabel}>Огноо</Text>
              <Text style={styles.infoValue} numberOfLines={1}>{loadDateStr}</Text>
            </View>
          </View>
        </View>

        {/* Stats footer */}
        <View style={styles.footer}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{totalLoaded}</Text>
            <Text style={styles.statLabel}>Ачсан</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#34C759' }]}>{totalSold}</Text>
            <Text style={styles.statLabel}>Зарсан</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statBox}>
            <Text style={[styles.statValue, { color: '#007AFF' }]}>{salesCount}</Text>
            <Text style={styles.statLabel}>Бор-т</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={[styles.statBox, { flex: 1.4 }]}>
            <Text style={[styles.statValue, { color: '#34C759', fontSize: 13 }]} numberOfLines={1}>
              {formatCurrency(totalRevenue)}
            </Text>
            <Text style={styles.statLabel}>Орлого</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Text style={styles.headerTitle}>Ачилтууд</Text>
        <Text style={styles.headerSub}>{truckLoads.length} ачилт</Text>
      </View>

      {/* Status Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.filterContent}
        style={{ maxHeight: 50 }}
      >
        {STATUS_FILTERS.map((f) => {
          const active = activeFilter === f.key;
          return (
            <TouchableOpacity
              key={f.key}
              style={[styles.filterChip, active && styles.filterChipActive]}
              onPress={() => setActiveFilter(f.key)}
            >
              <Ionicons name={f.icon} size={14} color={active ? '#fff' : '#8E8E93'} />
              <Text style={[styles.filterChipText, active && styles.filterChipTextActive]}>{f.label}</Text>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : (
        <FlatList
          data={truckLoads}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor="#007AFF" />}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <View style={styles.emptyIconWrap}>
                <Ionicons name="car-outline" size={36} color="#AEAEB2" />
              </View>
              <Text style={styles.emptyTitle}>Ачилт байхгүй</Text>
              <Text style={styles.emptySub}>Сонгосон шүүлтэд ачилт олдсонгүй</Text>
            </View>
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { paddingHorizontal: 16, paddingBottom: 8, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0' },
  headerTitle: { fontSize: 26, fontWeight: '800', color: '#1C1C1E' },
  headerSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  filterContent: { paddingHorizontal: 12, paddingVertical: 10, gap: 6, alignItems: 'center' },
  filterChip: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8ECF0' },
  filterChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  filterChipText: { fontSize: 12, fontWeight: '600', color: '#8E8E93' },
  filterChipTextActive: { color: '#fff' },

  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 12, paddingBottom: 40 },

  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 10,
    borderWidth: 1, borderColor: '#E8ECF0',
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  numberWrap: { backgroundColor: '#007AFF12', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8 },
  loadNumber: { fontSize: 14, fontWeight: '800', color: '#007AFF', letterSpacing: 0.3 },
  badge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },

  infoRow: { flexDirection: 'row', gap: 12, marginBottom: 10 },
  infoItem: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 8, minWidth: 0 },
  iconBox: { width: 30, height: 30, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  infoLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3 },
  infoValue: { fontSize: 13, fontWeight: '600', color: '#1C1C1E', marginTop: 1 },

  footer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F9FAFB', borderRadius: 10, paddingVertical: 8 },
  statBox: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  statValue: { fontSize: 15, fontWeight: '800', color: '#1C1C1E' },
  statLabel: { fontSize: 9, fontWeight: '600', color: '#8E8E93', marginTop: 1, textTransform: 'uppercase' },
  statDivider: { width: StyleSheet.hairlineWidth, height: 24, backgroundColor: '#E8ECF0' },

  emptyContainer: { alignItems: 'center', paddingVertical: 60 },
  emptyIconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#F2F4F7', justifyContent: 'center', alignItems: 'center', marginBottom: 12 },
  emptyTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  emptySub: { fontSize: 13, color: '#8E8E93' },
});
