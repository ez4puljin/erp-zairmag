import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React from 'react';
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useMyOrders } from '@/src/hooks/use-orders';
import type { Order } from '@/src/types';

const STATUS_CONFIG: Record<
  Order['status'],
  { label: string; bg: string; text: string; icon: keyof typeof Ionicons.glyphMap }
> = {
  PENDING: { label: 'Хүлээгдэж буй', bg: '#FFF3CD', text: '#856404', icon: 'time-outline' },
  APPROVED: { label: 'Баталсан', bg: '#D1ECF1', text: '#0C5460', icon: 'checkmark-circle-outline' },
  SHIPPING: { label: 'Хүргэлтэнд', bg: '#E8DAEF', text: '#6C3483', icon: 'car-outline' },
  DELIVERED: { label: 'Хүргэгдсэн', bg: '#D4EDDA', text: '#155724', icon: 'checkmark-done-circle-outline' },
  CANCELLATION_REQUESTED: { label: 'Цуцлах хүсэлт', bg: '#FFE5D0', text: '#E65100', icon: 'alert-circle-outline' },
  CANCELLED: { label: 'Цуцлагдсан', bg: '#F8D7DA', text: '#721C24', icon: 'close-circle-outline' },
};

export default function OrdersScreen() {
  const { data, isLoading, refetch, isRefetching } = useMyOrders();
  const orders = data?.data ?? [];

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('mn-MN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const renderOrder = ({ item }: { item: Order }) => {
    const status = STATUS_CONFIG[item.status];

    return (
      <TouchableOpacity
        style={styles.orderCard}
        onPress={() => router.push(`/(tabs)/orders/${item.id}`)}
        activeOpacity={0.7}
      >
        <View style={styles.orderHeader}>
          <View style={styles.orderNumberRow}>
            <Ionicons name="receipt-outline" size={18} color="#8E8E93" />
            <Text style={styles.orderNumber}>#{item.orderNumber}</Text>
          </View>
          <View style={[styles.statusBadge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={13} color={status.text} />
            <Text style={[styles.statusText, { color: status.text }]}>
              {status.label}
            </Text>
          </View>
        </View>

        <View style={styles.orderFooter}>
          <Text style={styles.orderDate}>{formatDate(item.createdAt)}</Text>
          <Text style={styles.orderTotal}>
            {Number(item.totalAmount).toLocaleString()}₮
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={orders}
        renderItem={renderOrder}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            colors={['#007AFF']}
            tintColor="#007AFF"
          />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="clipboard-outline" size={72} color="#D1D1D6" />
            <Text style={styles.emptyTitle}>Захиалга байхгүй</Text>
            <Text style={styles.emptySubtitle}>
              Бүтээгдэхүүн сагсанд нэмж захиалга өгнө үү
            </Text>
          </View>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F2F2F7',
  },
  listContent: {
    padding: 16,
    flexGrow: 1,
  },
  orderCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 10,
  },
  orderHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  orderNumberRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  orderNumber: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1C1C1E',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  orderFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#E5E5EA',
  },
  orderDate: {
    fontSize: 14,
    color: '#8E8E93',
  },
  orderTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: '#007AFF',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1C1C1E',
    marginTop: 16,
  },
  emptySubtitle: {
    fontSize: 15,
    color: '#8E8E93',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
