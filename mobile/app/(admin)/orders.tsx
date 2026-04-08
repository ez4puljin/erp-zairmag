import { Ionicons } from '@expo/vector-icons';
import React, { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '@/src/lib/api';

const KANBAN_TABS = [
  { key: 'pending', label: 'Захиалга', status: 'PENDING', color: '#FF9500', icon: 'time' as const },
  { key: 'approved', label: 'Бэлдэж', status: 'APPROVED', color: '#007AFF', icon: 'checkmark-circle' as const },
  { key: 'shipping', label: 'Хүргэлт', status: 'SHIPPING', color: '#AF52DE', icon: 'car' as const },
  { key: 'delivered', label: 'Баримт', status: 'DELIVERED', color: '#34C759', icon: 'print' as const },
  { key: 'archive', label: 'Архив', status: 'ARCHIVE', color: '#8E8E93', icon: 'archive' as const },
];

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Бэлэн', BANK_TRANSFER: 'Шилжүүлэг', CARD: 'Карт',
  CREDIT: 'Зээл', COMBINED: 'Хосолсон',
};

export default function AdminOrdersKanban() {
  const [orders, setOrders] = useState<any[]>([]);
  const [archiveOrders, setArchiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [showDriverPicker, setShowDriverPicker] = useState<string | null>(null);
  const [showPaymentPicker, setShowPaymentPicker] = useState<string | null>(null);

  const fetchOrders = useCallback(async () => {
    try {
      const [activeRes, archiveRes] = await Promise.all([
        api.get('/api/orders', { params: { statuses: 'PENDING,APPROVED,SHIPPING,DELIVERED', limit: 100 } }),
        api.get('/api/orders', { params: { statuses: 'CANCELLED', limit: 30 } }),
      ]);
      setOrders(activeRes.data?.data ?? activeRes.data ?? []);
      setArchiveOrders(archiveRes.data?.data ?? archiveRes.data ?? []);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => {
    const i = setInterval(fetchOrders, 30000);
    return () => clearInterval(i);
  }, [fetchOrders]);

  // Column data
  const getColumnOrders = (tabIdx: number) => {
    const tab = KANBAN_TABS[tabIdx];
    if (tab.status === 'PENDING') return orders.filter((o: any) => o.status === 'PENDING');
    if (tab.status === 'APPROVED') return orders.filter((o: any) => o.status === 'APPROVED');
    if (tab.status === 'SHIPPING') return orders.filter((o: any) => o.status === 'SHIPPING');
    if (tab.status === 'DELIVERED') return orders.filter((o: any) => o.status === 'DELIVERED' && !o.receiptPrintedAt);
    return [...orders.filter((o: any) => o.status === 'DELIVERED' && o.receiptPrintedAt), ...archiveOrders];
  };

  const currentOrders = getColumnOrders(activeTab);

  // Actions
  const handleApprove = (id: string) => {
    Alert.alert('Батлах', 'Захиалга батлах уу?', [
      { text: 'Болих', style: 'cancel' },
      { text: 'Батлах', onPress: async () => {
        setActionLoading(id);
        try { await api.patch(`/api/orders/${id}/status`, { status: 'APPROVED' }); fetchOrders(); }
        catch (e: any) { Alert.alert('Алдаа', e.response?.data?.message ?? 'Алдаа'); }
        finally { setActionLoading(null); }
      }},
    ]);
  };

  const openDriverPicker = async (orderId: string) => {
    try {
      const res = await api.get('/api/drivers');
      setDrivers(res.data?.data ?? res.data ?? []);
      setShowDriverPicker(orderId);
    } catch { Alert.alert('Алдаа', 'Жолооч ачаалахад алдаа'); }
  };

  const handleShip = async (orderId: string, driverId: string) => {
    setActionLoading(orderId);
    setShowDriverPicker(null);
    try { await api.patch(`/api/orders/${orderId}/status`, { status: 'SHIPPING', driverId }); fetchOrders(); }
    catch (e: any) { Alert.alert('Алдаа', e.response?.data?.message ?? 'Алдаа'); }
    finally { setActionLoading(null); }
  };

  const handleDeliver = async (orderId: string, paymentMethod: string) => {
    setActionLoading(orderId);
    setShowPaymentPicker(null);
    try { await api.patch(`/api/orders/${orderId}/status`, { status: 'DELIVERED', paymentMethod }); fetchOrders(); }
    catch (e: any) { Alert.alert('Алдаа', e.response?.data?.message ?? 'Алдаа'); }
    finally { setActionLoading(null); }
  };

  const handleCancel = (id: string) => {
    Alert.alert('Цуцлах', 'Захиалга цуцлах уу?', [
      { text: 'Болих', style: 'cancel' },
      { text: 'Цуцлах', style: 'destructive', onPress: async () => {
        setActionLoading(id);
        try { await api.patch(`/api/orders/${id}/cancel`); fetchOrders(); }
        catch (e: any) { Alert.alert('Алдаа', e.response?.data?.message ?? 'Алдаа'); }
        finally { setActionLoading(null); }
      }},
    ]);
  };

  const handlePrint = async (order: any) => {
    // On mobile, mark as printed (actual print via Bluetooth handled separately)
    try {
      await api.patch(`/api/orders/${order.id}/receipt-printed`);
      Alert.alert('Амжилттай', `Захиалга #${order.orderNumber} баримт хэвлэгдсэн`);
      fetchOrders();
    } catch (e: any) { Alert.alert('Алдаа', e.response?.data?.message ?? 'Алдаа'); }
  };

  const renderOrder = ({ item }: { item: any }) => {
    const isArchive = KANBAN_TABS[activeTab].status === 'ARCHIVE';
    const busy = actionLoading === item.id;
    const items = item.items ?? [];
    const pm = PAYMENT_LABELS[item.paymentMethod];
    const driver = item.deliveryRoute?.driver;

    return (
      <View style={[s.card, isArchive && { opacity: 0.6 }, busy && { opacity: 0.4 }]}>
        {/* Header */}
        <View style={s.cardRow}>
          <Text style={s.orderNum}>#{item.orderNumber}</Text>
          <Text style={s.cardTime}>
            {item.createdAt ? new Date(item.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}
          </Text>
        </View>

        {/* Customer */}
        <View style={s.cardRow}>
          <Ionicons name="person" size={14} color="#8C8FA3" />
          <Text style={s.cardCustomer} numberOfLines={1}>{item.customer?.storeName ?? 'Харилцагч'}</Text>
        </View>

        {/* Driver */}
        {driver && (
          <View style={s.cardRow}>
            <Ionicons name="car" size={14} color="#AF52DE" />
            <Text style={s.cardDriver}>{driver.lastName} {driver.firstName}</Text>
          </View>
        )}

        {/* Items */}
        <View style={s.itemsList}>
          {items.slice(0, 3).map((it: any, idx: number) => (
            <View key={idx} style={s.itemRow}>
              <Text style={s.itemName} numberOfLines={1}>{it.product?.name ?? 'Бараа'}</Text>
              <Text style={s.itemQty}>{it.quantity}ш · ₮{Number(it.lineTotal ?? 0).toLocaleString()}</Text>
            </View>
          ))}
          {items.length > 3 && <Text style={s.moreItems}>+{items.length - 3} бараа...</Text>}
        </View>

        {/* Total */}
        <View style={s.cardRow}>
          <Text style={s.cardMeta}>{items.length} бараа</Text>
          <Text style={s.cardTotal}>₮{Number(item.totalAmount ?? 0).toLocaleString()}</Text>
        </View>

        {/* Payment badge */}
        {pm && (
          <View style={[s.pmBadge, { backgroundColor: '#007AFF15' }]}>
            <Text style={[s.pmText, { color: '#007AFF' }]}>{pm}</Text>
          </View>
        )}

        {/* Actions */}
        {!isArchive && (
          <View style={s.actions}>
            {item.status === 'PENDING' && (
              <>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: '#007AFF' }]} onPress={() => handleApprove(item.id)} disabled={busy}>
                  <Ionicons name="checkmark" size={16} color="#fff" />
                  <Text style={s.actBtnText}>Батлах</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(item.id)} disabled={busy}>
                  <Ionicons name="close" size={16} color="#EF4444" />
                </TouchableOpacity>
              </>
            )}
            {item.status === 'APPROVED' && (
              <>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: '#AF52DE' }]} onPress={() => openDriverPicker(item.id)} disabled={busy}>
                  <Ionicons name="car" size={16} color="#fff" />
                  <Text style={s.actBtnText}>Хүргэлтэнд</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(item.id)} disabled={busy}>
                  <Ionicons name="close" size={16} color="#EF4444" />
                </TouchableOpacity>
              </>
            )}
            {item.status === 'SHIPPING' && (
              <>
                <TouchableOpacity style={[s.actBtn, { backgroundColor: '#10B981' }]} onPress={() => setShowPaymentPicker(item.id)} disabled={busy}>
                  <Ionicons name="checkmark-circle" size={16} color="#fff" />
                  <Text style={s.actBtnText}>Хүргэсэн</Text>
                </TouchableOpacity>
                <TouchableOpacity style={s.cancelBtn} onPress={() => handleCancel(item.id)} disabled={busy}>
                  <Ionicons name="close" size={16} color="#EF4444" />
                </TouchableOpacity>
              </>
            )}
            {item.status === 'DELIVERED' && !item.receiptPrintedAt && (
              <TouchableOpacity style={[s.actBtn, { backgroundColor: '#10B981' }]} onPress={() => handlePrint(item)}>
                <Ionicons name="print" size={16} color="#fff" />
                <Text style={s.actBtnText}>Баримт хэвлэх</Text>
              </TouchableOpacity>
            )}
          </View>
        )}
      </View>
    );
  };

  return (
    <View style={s.container}>
      {/* Header */}
      <View style={s.header}>
        <Text style={s.headerTitle}>Захиалга</Text>
        <TouchableOpacity
          style={{ backgroundColor: '#FF9500', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 4 }}
          onPress={() => Alert.alert('Шинэ захиалга', 'Вэб систем дээрээс захиалга үүсгэнэ үү.\n\nЖолооч апп дээр захиалга авах боломжтой.')}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={{ color: '#fff', fontSize: 13, fontWeight: '600' }}>Шинэ</Text>
        </TouchableOpacity>
      </View>

      {/* Kanban Tabs */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.tabBar} contentContainerStyle={s.tabBarContent}>
        {KANBAN_TABS.map((tab, idx) => {
          const count = getColumnOrders(idx).length;
          const isActive = activeTab === idx;
          return (
            <TouchableOpacity
              key={tab.key}
              style={[s.tab, isActive && { backgroundColor: tab.color }]}
              onPress={() => setActiveTab(idx)}
            >
              <Ionicons name={tab.icon} size={16} color={isActive ? '#fff' : tab.color} />
              <Text style={[s.tabLabel, isActive && { color: '#fff' }]}>{tab.label}</Text>
              <View style={[s.tabCount, isActive && { backgroundColor: 'rgba(255,255,255,0.3)' }]}>
                <Text style={[s.tabCountText, isActive && { color: '#fff' }]}>{count}</Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>

      {/* Orders List */}
      {loading ? (
        <View style={s.center}><ActivityIndicator size="large" color="#007AFF" /></View>
      ) : (
        <FlatList
          data={currentOrders}
          keyExtractor={(item) => item.id}
          renderItem={renderOrder}
          contentContainerStyle={s.listContent}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />}
          ListEmptyComponent={
            <View style={s.empty}>
              <Ionicons name="cart-outline" size={48} color="#D0D2DA" />
              <Text style={s.emptyText}>Хоосон</Text>
            </View>
          }
        />
      )}

      {/* Driver Picker Modal */}
      {showDriverPicker && (
        <View style={s.modal}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowDriverPicker(null)} />
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Жолооч сонгох</Text>
            {drivers.map((d: any) => (
              <TouchableOpacity key={d.id} style={s.modalItem} onPress={() => handleShip(showDriverPicker, d.id)}>
                <Ionicons name="person" size={20} color="#007AFF" />
                <View style={{ flex: 1 }}>
                  <Text style={s.modalItemTitle}>{d.firstName} {d.lastName}</Text>
                  <Text style={s.modalItemSub}>{d.phone}</Text>
                </View>
                <Ionicons name="chevron-forward" size={18} color="#D0D2DA" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowDriverPicker(null)}>
              <Text style={s.modalCancelText}>Болих</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}

      {/* Payment Picker Modal */}
      {showPaymentPicker && (
        <View style={s.modal}>
          <TouchableOpacity style={s.modalBg} onPress={() => setShowPaymentPicker(null)} />
          <View style={s.modalSheet}>
            <Text style={s.modalTitle}>Төлбөрийн хэлбэр</Text>
            {Object.entries(PAYMENT_LABELS).map(([key, label]) => (
              <TouchableOpacity key={key} style={s.modalItem} onPress={() => handleDeliver(showPaymentPicker, key)}>
                <Ionicons name="card" size={20} color="#007AFF" />
                <Text style={s.modalItemTitle}>{label}</Text>
                <Ionicons name="chevron-forward" size={18} color="#D0D2DA" />
              </TouchableOpacity>
            ))}
            <TouchableOpacity style={s.modalCancel} onPress={() => setShowPaymentPicker(null)}>
              <Text style={s.modalCancelText}>Болих</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: { paddingTop: 56, paddingHorizontal: 16, paddingBottom: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A1D26' },
  tabBar: { maxHeight: 56, backgroundColor: '#F5F6FA' },
  tabBarContent: { paddingHorizontal: 12, paddingVertical: 8, gap: 6, flexDirection: 'row' },
  tab: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8ECF0',
  },
  tabLabel: { fontSize: 13, fontWeight: '600', color: '#4A4D5C' },
  tabCount: { backgroundColor: '#F5F6FA', borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabCountText: { fontSize: 11, fontWeight: '700', color: '#8C8FA3' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  listContent: { padding: 12, paddingBottom: 40 },
  card: {
    backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8,
    borderWidth: 1, borderColor: '#E8ECF0',
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 4 },
  orderNum: { fontSize: 15, fontWeight: '700', color: '#007AFF', flex: 1 },
  cardTime: { fontSize: 11, color: '#8C8FA3' },
  cardCustomer: { fontSize: 13, fontWeight: '500', color: '#4A4D5C', flex: 1 },
  cardDriver: { fontSize: 12, color: '#AF52DE' },
  itemsList: { marginVertical: 8, paddingVertical: 8, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#F2F4F7' },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 2 },
  itemName: { fontSize: 12, color: '#4A4D5C', flex: 1, marginRight: 8 },
  itemQty: { fontSize: 12, fontWeight: '600', color: '#1A1D26' },
  moreItems: { fontSize: 11, color: '#8C8FA3', marginTop: 2 },
  cardMeta: { fontSize: 11, color: '#8C8FA3', flex: 1 },
  cardTotal: { fontSize: 16, fontWeight: '700', color: '#1A1D26' },
  pmBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, marginTop: 4 },
  pmText: { fontSize: 10, fontWeight: '700' },
  actions: { flexDirection: 'row', gap: 6, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderColor: '#F2F4F7' },
  actBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, paddingVertical: 10, borderRadius: 10 },
  actBtnText: { fontSize: 13, fontWeight: '600', color: '#fff' },
  cancelBtn: { width: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#8C8FA3' },
  // Modal
  modal: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, zIndex: 100, justifyContent: 'flex-end' },
  modalBg: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1A1D26', marginBottom: 16 },
  modalItem: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingVertical: 14, borderBottomWidth: 1, borderColor: '#F2F4F7',
  },
  modalItemTitle: { fontSize: 15, fontWeight: '600', color: '#1A1D26', flex: 1 },
  modalItemSub: { fontSize: 12, color: '#8C8FA3' },
  modalCancel: { marginTop: 12, alignItems: 'center', paddingVertical: 12, backgroundColor: '#F5F6FA', borderRadius: 12 },
  modalCancelText: { fontSize: 14, fontWeight: '600', color: '#8C8FA3' },
});
