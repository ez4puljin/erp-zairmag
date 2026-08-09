import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { router } from 'expo-router';
import { useAuth } from '@/src/hooks/use-auth';
import api from '@/src/lib/api';
import type { Order, PaginatedResponse } from '@/src/types';

interface TruckLoad {
  id: string;
  loadNumber: number;
  status: string;
  driver?: { firstName?: string; lastName?: string };
  items?: { loadedQty?: number; soldQty?: number }[];
  sales?: { totalAmount?: number | string }[];
  _count?: { sales?: number };
}

interface DashboardStats {
  totalOrders: number;
  totalProducts: number;
  totalCustomers: number;
  todaySales: number;
  activeLoads: TruckLoad[];
  recentOrders: Order[];
}

export default function AdminDashboardScreen() {
  const { user } = useAuth();
  const [stats, setStats] = useState<DashboardStats>({
    totalOrders: 0,
    totalProducts: 0,
    totalCustomers: 0,
    todaySales: 0,
    activeLoads: [],
    recentOrders: [],
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchDashboard = useCallback(async () => {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Замд яваа ачилтыг огноогоор биш ТӨЛӨВӨӨР шүүнэ — жолооч өчигдөр
      // гарсан ч эргэж ороогүй бол хяналтын самбарт харагдах ёстой.
      const [ordersRes, productsRes, customersRes, loadingRes, dispatchedRes, completionRes, recentRes] =
        await Promise.all([
          api.get<PaginatedResponse<Order>>('/api/orders?limit=1'),
          api.get<PaginatedResponse<unknown>>('/api/products?limit=1'),
          api.get<PaginatedResponse<unknown>>('/api/customers?limit=1'),
          api.get<PaginatedResponse<TruckLoad>>('/api/truck-loads?status=LOADING&limit=50'),
          api.get<PaginatedResponse<TruckLoad>>('/api/truck-loads?status=DISPATCHED&limit=50'),
          api.get<PaginatedResponse<TruckLoad>>('/api/truck-loads?status=COMPLETION_REQUESTED&limit=50'),
          api.get<PaginatedResponse<Order>>('/api/orders?limit=5'),
        ]);

      const activeLoads = [
        ...(dispatchedRes.data.data ?? []),
        ...(completionRes.data.data ?? []),
        ...(loadingRes.data.data ?? []),
      ];

      // Өнөөдрийн борлуулалт — түгээлтийн борлуулалтаас. Урьд нь зөвхөн
      // сүүлийн 5 захиалгаас тооцдог тул бараг үргэлж 0 гардаг байв.
      let todaySales = 0;
      try {
        const rep = await api.get(`/api/reports/daily-sales?from=${today}&to=${today}`);
        const body: any = rep.data;
        // API нь { summary: { totalRevenue }, daily: [...] } гэж буцаадаг.
        todaySales = Number(body?.summary?.totalRevenue ?? 0)
          || (Array.isArray(body?.daily)
            ? body.daily.reduce((s: number, r: any) => s + Number(r.revenue ?? 0), 0)
            : 0);
      } catch {
        // тайлан авчирч чадаагүй ч самбар ажиллана
      }

      const recentOrders = recentRes.data.data;

      setStats({
        totalOrders: ordersRes.data.meta.total,
        totalProducts: productsRes.data.meta.total,
        totalCustomers: customersRes.data.meta.total,
        todaySales,
        activeLoads,
        recentOrders,
      });
    } catch {
      // silently fail
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchDashboard();
  };

  const statusLabel = (status: string) => {
    switch (status) {
      case 'PENDING':
        return 'Захиалга';
      case 'APPROVED':
        return 'Бэлдэж';
      case 'SHIPPING':
        return 'Хүргэлт';
      case 'DELIVERED':
        return 'Хүргэсэн';
      case 'CANCELLED':
        return 'Цуцлагдсан';
      default:
        return status;
    }
  };

  const statusColor = (status: string) => {
    switch (status) {
      case 'PENDING':
        return '#FF9500';
      case 'APPROVED':
        return '#007AFF';
      case 'SHIPPING':
        return '#5856D6';
      case 'DELIVERED':
        return '#34C759';
      case 'CANCELLED':
        return '#FF3B30';
      default:
        return '#8E8E93';
    }
  };

  const truckStatusLabel = (status: string) => {
    switch (status) {
      case 'LOADING':
        return 'Ачиж байна';
      case 'DISPATCHED':
        return 'Илгээсэн';
      case 'COMPLETED':
        return 'Дууссан';
      default:
        return status;
    }
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
      refreshControl={
        <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
      }
    >
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.greeting}>
          Сайн байна уу, {user?.firstName || 'Админ'}
        </Text>
        <Text style={styles.headerTitle}>Хянах самбар</Text>
      </View>

      {/* Stat Cards */}
      <View style={styles.statsGrid}>
        <View style={[styles.statCard, { borderLeftColor: '#34C759' }]}>
          <Ionicons name="cash-outline" size={24} color="#34C759" />
          <Text style={styles.statValue}>
            {stats.todaySales.toLocaleString()}₮
          </Text>
          <Text style={styles.statLabel}>Өнөөдрийн борлуулалт</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#FF9500' }]}>
          <Ionicons name="cart-outline" size={24} color="#FF9500" />
          <Text style={styles.statValue}>{stats.totalOrders}</Text>
          <Text style={styles.statLabel}>Захиалга</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#007AFF' }]}>
          <Ionicons name="cube-outline" size={24} color="#007AFF" />
          <Text style={styles.statValue}>{stats.totalProducts}</Text>
          <Text style={styles.statLabel}>Бүтээгдэхүүн</Text>
        </View>
        <View style={[styles.statCard, { borderLeftColor: '#5856D6' }]}>
          <Ionicons name="people-outline" size={24} color="#5856D6" />
          <Text style={styles.statValue}>{stats.totalCustomers}</Text>
          <Text style={styles.statLabel}>Харилцагч</Text>
        </View>
      </View>

      {/* Замд яваа ачилт */}
      <View style={styles.section}>
        <View style={styles.sectionHead}>
          <Text style={styles.sectionTitle}>ЗАМД ЯВАА АЧИЛТ</Text>
          {stats.activeLoads.length > 0 ? (
            <Text style={styles.sectionCount}>{stats.activeLoads.length}</Text>
          ) : null}
        </View>

        {stats.activeLoads.length === 0 ? (
          <Text style={styles.emptyText}>Замд яваа ачилт байхгүй</Text>
        ) : (
          stats.activeLoads.map((load) => {
            const driverName = load.driver
              ? `${load.driver.lastName ?? ''} ${load.driver.firstName ?? ''}`.trim()
              : '—';
            const loaded = (load.items ?? []).reduce((s, i) => s + (i.loadedQty ?? 0), 0);
            const sold = (load.items ?? []).reduce((s, i) => s + (i.soldQty ?? 0), 0);
            const revenue = (load.sales ?? []).reduce((s, x) => s + Number(x.totalAmount ?? 0), 0);
            const salesCount = load._count?.sales ?? load.sales?.length ?? 0;
            const remaining = loaded - sold;

            return (
              <TouchableOpacity
                key={load.id}
                style={styles.loadCard}
                activeOpacity={0.6}
                onPress={() => router.push(`/(admin)/features/truck-loads/${load.id}` as any)}
              >
                <View style={styles.loadTop}>
                  <View style={styles.loadDriver}>
                    <View style={styles.loadAvatar}>
                      <Ionicons name="person" size={13} color="#5856D6" />
                    </View>
                    <View style={{ flex: 1, minWidth: 0 }}>
                      <Text style={styles.loadDriverName} numberOfLines={1}>{driverName}</Text>
                      <Text style={styles.loadNo}>Ачилт #{load.loadNumber}</Text>
                    </View>
                  </View>
                  <View style={[styles.badge, { backgroundColor: statusColor(load.status) + '20' }]}>
                    <Text style={[styles.badgeText, { color: statusColor(load.status) }]}>
                      {truckStatusLabel(load.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.loadStats}>
                  <View style={styles.loadStat}>
                    <Text style={styles.loadStatValue}>{salesCount}</Text>
                    <Text style={styles.loadStatLabel}>БОР-Т</Text>
                  </View>
                  <View style={[styles.loadStat, styles.loadDivider]}>
                    <Text style={[styles.loadStatValue, { color: '#34C759' }]}>{sold}</Text>
                    <Text style={styles.loadStatLabel}>ЗАРСАН</Text>
                  </View>
                  <View style={[styles.loadStat, styles.loadDivider]}>
                    <Text style={[styles.loadStatValue, { color: '#FF9500' }]}>{remaining}</Text>
                    <Text style={styles.loadStatLabel}>ҮЛДЭГДЭЛ</Text>
                  </View>
                  <View style={[styles.loadStat, styles.loadDivider, { flex: 1.4 }]}>
                    <Text style={[styles.loadStatValue, { color: '#007AFF' }]} numberOfLines={1}>
                      {revenue.toLocaleString()}₮
                    </Text>
                    <Text style={styles.loadStatLabel}>ОРЛОГО</Text>
                  </View>
                </View>
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* Recent Orders */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>СҮҮЛИЙН ЗАХИАЛГУУД</Text>
        {stats.recentOrders.length === 0 ? (
          <Text style={styles.emptyText}>Захиалга байхгүй</Text>
        ) : (
          stats.recentOrders.map((order) => (
            <View key={order.id} style={styles.orderRow}>
              <View style={styles.orderInfo}>
                <Text style={styles.orderNumber}>
                  #{order.orderNumber}
                </Text>
                <Text style={styles.orderAmount}>
                  {Number(order.totalAmount).toLocaleString()}₮
                </Text>
              </View>
              <View style={styles.orderRight}>
                <View
                  style={[
                    styles.badge,
                    { backgroundColor: statusColor(order.status) + '20' },
                  ]}
                >
                  <Text
                    style={[
                      styles.badgeText,
                      { color: statusColor(order.status) },
                    ]}
                  >
                    {statusLabel(order.status)}
                  </Text>
                </View>
                <Text style={styles.orderDate}>
                  {new Date(order.createdAt).toLocaleDateString('mn-MN')}
                </Text>
              </View>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  sectionCount: { fontSize: 12, fontWeight: '700', color: '#5856D6', backgroundColor: '#5856D615', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8, overflow: 'hidden' },
  loadCard: { backgroundColor: '#F7F8FA', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#EDEFF3' },
  loadTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  loadDriver: { flexDirection: 'row', alignItems: 'center', gap: 9, flex: 1, minWidth: 0 },
  loadAvatar: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#5856D615', justifyContent: 'center', alignItems: 'center' },
  loadDriverName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  loadNo: { fontSize: 11, color: '#8E8E93', marginTop: 1 },
  loadStats: { flexDirection: 'row', alignItems: 'center', marginTop: 11, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E2E5EA' },
  loadStat: { flex: 1, alignItems: 'center' },
  loadDivider: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E2E5EA' },
  loadStatValue: { fontSize: 15, fontWeight: '800', color: '#1C1C1E', fontVariant: ['tabular-nums'] },
  loadStatLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93', marginTop: 2, letterSpacing: 0.3 },

  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 16,
    paddingTop: 60,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  header: {
    marginBottom: 20,
  },
  greeting: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    marginBottom: 16,
  },
  statCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    width: '48%',
    flexGrow: 1,
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 8,
  },
  statLabel: {
    fontSize: 12,
    color: '#8E8E93',
    marginTop: 2,
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 12,
  },
  emptyText: {
    fontSize: 14,
    color: '#C7C7CC',
    textAlign: 'center',
    paddingVertical: 16,
  },
  truckLoadRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  truckLoadInfo: {
    flex: 1,
  },
  truckLoadNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  truckLoadDriver: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  orderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  orderInfo: {
    flex: 1,
  },
  orderNumber: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1C1C1E',
  },
  orderAmount: {
    fontSize: 13,
    color: '#8E8E93',
    marginTop: 2,
  },
  orderRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderDate: {
    fontSize: 11,
    color: '#C7C7CC',
  },
});
