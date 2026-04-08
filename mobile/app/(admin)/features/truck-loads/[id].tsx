import React, { useState } from 'react';
import { View, ScrollView, Text, StyleSheet, Alert, TouchableOpacity, ActivityIndicator, Modal, TextInput } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, DetailSection, DetailRow, LoadingState, ErrorState, confirm } from '@/src/components/admin';
import { useItemQuery, invalidateItemCache } from '@/src/hooks/use-item-query';
import { invalidateListCache } from '@/src/hooks/use-list-query';
import api from '@/src/lib/api';
import { formatCurrency, formatDate, formatDateTime, paymentLabel, PAYMENT_COLORS } from '@/src/lib/format';

const STATUS_INFO: Record<string, { label: string; color: string; icon: keyof typeof Ionicons.glyphMap }> = {
  LOADING:              { label: 'Ачиж буй',          color: '#FF9500', icon: 'cube' },
  DISPATCHED:           { label: 'Замд',              color: '#5856D6', icon: 'car' },
  COMPLETION_REQUESTED: { label: 'Дуусгах хүсэлтэй',  color: '#FF3B30', icon: 'hourglass' },
  COMPLETED:            { label: 'Дууссан',           color: '#34C759', icon: 'checkmark-circle' },
  CANCELLED:            { label: 'Цуцлагдсан',        color: '#8E8E93', icon: 'close-circle' },
};

export default function TruckLoadDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, refetch } = useItemQuery<any>(id ? `/api/truck-loads/${id}` : null);
  const [actionLoading, setActionLoading] = React.useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [returnQty, setReturnQty] = useState<Record<string, { returned: string; damaged: string }>>({});
  const [approving, setApproving] = useState(false);

  if (loading) return <View style={{ flex: 1 }}><ScreenHeader title="Ачилт" /><LoadingState /></View>;
  if (error || !data) return <View style={{ flex: 1 }}><ScreenHeader title="Ачилт" /><ErrorState message={error || 'Олдсонгүй'} onRetry={refetch} /></View>;

  const status = STATUS_INFO[data.status] ?? STATUS_INFO.LOADING;
  const driverName = data.driver ? `${data.driver.lastName ?? ''} ${data.driver.firstName ?? ''}`.trim() : '—';
  const items = data.items ?? [];
  const sales = data.sales ?? [];
  const totalLoaded = items.reduce((s: number, i: any) => s + (i.loadedQty ?? 0), 0);
  const totalSold = items.reduce((s: number, i: any) => s + (i.soldQty ?? 0), 0);
  const totalReturned = items.reduce((s: number, i: any) => s + (i.returnedQty ?? 0), 0);
  const totalDamaged = items.reduce((s: number, i: any) => s + (i.damagedQty ?? 0), 0);
  const totalRevenue = sales.reduce((s: number, sale: any) => s + Number(sale.totalAmount ?? 0), 0);

  // Payment breakdown by method
  const paymentBreakdown: Record<string, number> = {};
  for (const sale of sales) {
    const method = sale.paymentMethod || 'CASH';
    paymentBreakdown[method] = (paymentBreakdown[method] ?? 0) + Number(sale.totalAmount ?? 0);
  }

  // Open approval modal — pre-fill returned = remaining for each item
  const openApproveModal = () => {
    const init: Record<string, { returned: string; damaged: string }> = {};
    for (const it of items) {
      const remaining = (it.loadedQty ?? 0) - (it.soldQty ?? 0);
      if (remaining > 0) {
        init[it.productId] = { returned: String(remaining), damaged: '0' };
      }
    }
    setReturnQty(init);
    setApproveModalOpen(true);
  };

  const handleApprove = async () => {
    // Validate: each item with remaining must sum to remaining
    const itemsPayload: any[] = [];
    for (const it of items) {
      const remaining = (it.loadedQty ?? 0) - (it.soldQty ?? 0);
      if (remaining <= 0) continue;
      const r = returnQty[it.productId] || { returned: '0', damaged: '0' };
      const returned = Number(r.returned) || 0;
      const damaged = Number(r.damaged) || 0;
      if (returned + damaged !== remaining) {
        Alert.alert('Алдаа', `${it.product?.name}: Буцаалт + Гэмтэл = ${remaining} байх ёстой`);
        return;
      }
      itemsPayload.push({ productId: it.productId, returnedQty: returned, damagedQty: damaged });
    }

    setApproving(true);
    try {
      await api.post(`/api/truck-loads/${id}/approve-completion`, { items: itemsPayload });
      invalidateItemCache(`/api/truck-loads/${id}`);
      invalidateListCache('/api/truck-loads');
      setApproveModalOpen(false);
      Alert.alert('Амжилттай', 'Ачилт дууссан. Үлдэгдэл агуулахад буцаагдлаа.');
      refetch();
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Баталгаажуулахад алдаа гарлаа');
    } finally {
      setApproving(false);
    }
  };

  const handleDispatch = async () => {
    const ok = await confirm({
      title: 'Илгээх',
      message: `#${data.loadNumber} ачилтыг илгээх үү?`,
      confirmLabel: 'Илгээх',
    });
    if (!ok) return;
    setActionLoading(true);
    try {
      await api.post(`/api/truck-loads/${id}/dispatch`);
      invalidateItemCache(`/api/truck-loads/${id}`);
      invalidateListCache('/api/truck-loads');
      refetch();
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Илгээхэд алдаа гарлаа');
    } finally { setActionLoading(false); }
  };

  return (
    <View style={s.container}>
      <ScreenHeader title={`Ачилт #${data.loadNumber}`} subtitle={status.label} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        {/* Status banner */}
        <View style={[s.statusBanner, { backgroundColor: `${status.color}10`, borderColor: `${status.color}30` }]}>
          <View style={[s.statusIconWrap, { backgroundColor: `${status.color}20` }]}>
            <Ionicons name={status.icon} size={24} color={status.color} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[s.statusTitle, { color: status.color }]}>{status.label}</Text>
            <Text style={s.statusSub}>{formatDate(data.loadDate || data.createdAt)}</Text>
          </View>
        </View>

        <DetailSection title="ҮНДСЭН МЭДЭЭЛЭЛ">
          <DetailRow label="Дугаар" value={`#${data.loadNumber}`} icon="pricetag-outline" iconColor="#007AFF" bold />
          <DetailRow label="Жолооч" value={driverName} icon="person-outline" iconColor="#5856D6" />
          {data.driver?.phone ? <DetailRow label="Утас" value={data.driver.phone} icon="call-outline" iconColor="#34C759" /> : null}
          <DetailRow label="Огноо" value={formatDate(data.loadDate || data.createdAt)} icon="calendar-outline" iconColor="#FF9500" />
          {data.vehicleInfo ? <DetailRow label="Машин" value={data.vehicleInfo} icon="car-outline" iconColor="#AF52DE" /> : null}
          {data.dispatchedAt ? <DetailRow label="Илгээсэн" value={formatDateTime(data.dispatchedAt)} icon="send-outline" iconColor="#5856D6" /> : null}
          {data.completedAt ? <DetailRow label="Дууссан" value={formatDateTime(data.completedAt)} icon="checkmark-circle-outline" iconColor="#34C759" /> : null}
          {data.notes ? <DetailRow label="Тэмдэглэл" value={data.notes} icon="document-text-outline" iconColor="#8E8E93" last /> : null}
        </DetailSection>

        <DetailSection title="ХУРААНГУЙ">
          <View style={s.statRow}>
            <View style={s.statCell}>
              <Text style={s.statLabel}>АЧСАН</Text>
              <Text style={s.statValue}>{totalLoaded}</Text>
            </View>
            <View style={[s.statCell, s.borderL]}>
              <Text style={s.statLabel}>ЗАРСАН</Text>
              <Text style={[s.statValue, { color: '#34C759' }]}>{totalSold}</Text>
            </View>
            <View style={[s.statCell, s.borderL]}>
              <Text style={s.statLabel}>БУЦААСАН</Text>
              <Text style={[s.statValue, { color: '#FF9500' }]}>{totalReturned}</Text>
            </View>
            <View style={[s.statCell, s.borderL]}>
              <Text style={s.statLabel}>ГЭМТЭЛ</Text>
              <Text style={[s.statValue, { color: '#FF3B30' }]}>{totalDamaged}</Text>
            </View>
          </View>
        </DetailSection>

        {sales.length > 0 && (
          <DetailSection title={`БОРЛУУЛАЛТ (${sales.length})`}>
            {sales.map((sale: any, idx: number) => (
              <View key={sale.id} style={[s.saleRow, idx < sales.length - 1 && s.borderB]}>
                <View style={{ flex: 1 }}>
                  <Text style={s.saleNum}>#{sale.saleNumber}</Text>
                  <Text style={s.saleMeta}>
                    {sale.customer?.storeName || ''} · {paymentLabel(sale.paymentMethod)}
                  </Text>
                </View>
                <Text style={s.saleAmount}>{formatCurrency(sale.totalAmount)}</Text>
              </View>
            ))}
            <View style={[s.totalRow]}>
              <Text style={s.totalLabel}>Нийт орлого</Text>
              <Text style={s.totalValue}>{formatCurrency(totalRevenue)}</Text>
            </View>
          </DetailSection>
        )}

        {Object.keys(paymentBreakdown).length > 0 && (
          <DetailSection title="ТӨЛБӨРИЙН ХЭЛБЭР">
            {Object.entries(paymentBreakdown).map(([method, amount], idx, arr) => {
              const color = PAYMENT_COLORS[method] || '#8E8E93';
              return (
                <View key={method} style={[s.pmRow, idx < arr.length - 1 && s.borderB]}>
                  <View style={[s.pmDot, { backgroundColor: color }]} />
                  <Text style={s.pmLabel}>{paymentLabel(method)}</Text>
                  <Text style={[s.pmAmount, { color }]}>{formatCurrency(amount)}</Text>
                </View>
              );
            })}
          </DetailSection>
        )}

        {items.length > 0 && (
          <DetailSection title={`БАРАА (${items.length})`}>
            {items.map((it: any, idx: number) => {
              const remaining = (it.loadedQty ?? 0) - (it.soldQty ?? 0) - (it.returnedQty ?? 0) - (it.damagedQty ?? 0);
              return (
                <View key={it.id} style={[s.itemRow, idx < items.length - 1 && s.borderB]}>
                  <View style={{ flex: 1 }}>
                    <Text style={s.itemName} numberOfLines={1}>{it.product?.name || '-'}</Text>
                    <Text style={s.itemMeta}>
                      Ачсан: {it.loadedQty ?? 0} · Зарсан: {it.soldQty ?? 0} · Үлд: {remaining}
                    </Text>
                  </View>
                  <Text style={s.itemPrice}>{formatCurrency(it.product?.sellingPrice ?? 0)}</Text>
                </View>
              );
            })}
          </DetailSection>
        )}
      </ScrollView>

      {/* Bottom action */}
      {data.status === 'LOADING' && (
        <View style={s.bottomBar}>
          <TouchableOpacity style={s.dispatchBtn} onPress={handleDispatch} disabled={actionLoading}>
            {actionLoading ? <ActivityIndicator color="#fff" /> : (
              <>
                <Ionicons name="send" size={18} color="#fff" />
                <Text style={s.dispatchText}>Илгээх</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      )}

      {data.status === 'COMPLETION_REQUESTED' && (
        <View style={s.bottomBar}>
          <TouchableOpacity style={[s.dispatchBtn, { backgroundColor: '#FF3B30' }]} onPress={openApproveModal}>
            <Ionicons name="checkmark-done" size={18} color="#fff" />
            <Text style={s.dispatchText}>Дуусгахыг баталгаажуулах</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Approval Modal */}
      <Modal visible={approveModalOpen} animationType="slide" transparent>
        <View style={s.modalOverlay}>
          <View style={s.modalSheet}>
            <View style={s.modalHeader}>
              <Text style={s.modalTitle}>Үлдэгдэл бүртгэх</Text>
              <TouchableOpacity onPress={() => setApproveModalOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>
            <Text style={s.modalHint}>Бараа болгоны буцаах болон гэмтсэн тоог оруулна уу</Text>

            <ScrollView style={{ maxHeight: 420 }}>
              {items.map((it: any) => {
                const remaining = (it.loadedQty ?? 0) - (it.soldQty ?? 0);
                if (remaining <= 0) return null;
                const r = returnQty[it.productId] || { returned: '0', damaged: '0' };
                const totalEntered = (Number(r.returned) || 0) + (Number(r.damaged) || 0);
                const valid = totalEntered === remaining;
                return (
                  <View key={it.id} style={[s.approveItem, !valid && { borderColor: '#FF3B30', backgroundColor: '#FF3B3008' }]}>
                    <Text style={s.approveItemName}>{it.product?.name}</Text>
                    <Text style={s.approveItemMeta}>Үлдсэн: <Text style={{ fontWeight: '800', color: '#1C1C1E' }}>{remaining}</Text></Text>
                    <View style={{ flexDirection: 'row', gap: 8, marginTop: 6 }}>
                      <View style={{ flex: 1 }}>
                        <Text style={s.qtyLabel}>БУЦААХ</Text>
                        <TextInput
                          style={s.qtyInput}
                          keyboardType="number-pad"
                          value={r.returned}
                          onChangeText={(t) => setReturnQty(p => ({ ...p, [it.productId]: { ...r, returned: t } }))}
                          selectTextOnFocus
                        />
                      </View>
                      <View style={{ flex: 1 }}>
                        <Text style={s.qtyLabel}>ГЭМТСЭН</Text>
                        <TextInput
                          style={s.qtyInput}
                          keyboardType="number-pad"
                          value={r.damaged}
                          onChangeText={(t) => setReturnQty(p => ({ ...p, [it.productId]: { ...r, damaged: t } }))}
                          selectTextOnFocus
                        />
                      </View>
                    </View>
                    {!valid && <Text style={{ fontSize: 11, color: '#FF3B30', marginTop: 4 }}>Нийт {totalEntered} ≠ {remaining}</Text>}
                  </View>
                );
              })}
            </ScrollView>

            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14 }}>
              <TouchableOpacity style={s.cancelBtn} onPress={() => setApproveModalOpen(false)}>
                <Text style={s.cancelBtnText}>Болих</Text>
              </TouchableOpacity>
              <TouchableOpacity style={s.confirmBtn} onPress={handleApprove} disabled={approving}>
                {approving ? <ActivityIndicator color="#fff" /> : <Ionicons name="checkmark" size={18} color="#fff" />}
                <Text style={s.confirmBtnText}>{approving ? 'Хадгалж...' : 'Баталгаажуулах'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },

  statusBanner: { flexDirection: 'row', alignItems: 'center', gap: 12, marginHorizontal: 12, marginTop: 14, padding: 14, borderRadius: 14, borderWidth: 1 },
  statusIconWrap: { width: 48, height: 48, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
  statusTitle: { fontSize: 17, fontWeight: '800' },
  statusSub: { fontSize: 12, color: '#8E8E93', marginTop: 2 },

  statRow: { flexDirection: 'row' },
  statCell: { flex: 1, alignItems: 'center', paddingVertical: 14 },
  borderL: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E8ECF0' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3 },
  statValue: { fontSize: 18, fontWeight: '800', color: '#1C1C1E', marginTop: 4 },

  saleRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12 },
  borderB: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  saleNum: { fontSize: 13, fontWeight: '700', color: '#007AFF' },
  saleMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  saleAmount: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },

  totalRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 14, borderTopWidth: 1, borderTopColor: '#E8ECF0', backgroundColor: '#F9FAFB' },
  totalLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '800', color: '#34C759' },

  pmRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingHorizontal: 14, paddingVertical: 12 },
  pmDot: { width: 10, height: 10, borderRadius: 5 },
  pmLabel: { flex: 1, fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  pmAmount: { fontSize: 14, fontWeight: '700' },

  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 14, paddingVertical: 12 },
  itemName: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  itemMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  itemPrice: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },

  bottomBar: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8ECF0', padding: 12 },
  dispatchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 14 },
  dispatchText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  // Approval modal
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 22, borderTopRightRadius: 22, padding: 18, paddingBottom: 32, maxHeight: '88%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#1C1C1E' },
  modalHint: { fontSize: 12, color: '#8E8E93', marginBottom: 14 },
  approveItem: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  approveItemName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
  approveItemMeta: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  qtyLabel: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3, marginBottom: 4 },
  qtyInput: { backgroundColor: '#fff', borderWidth: 1, borderColor: '#E5E5EA', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 15, fontWeight: '600', color: '#1C1C1E', textAlign: 'center' },
  cancelBtn: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  cancelBtnText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
  confirmBtn: { flex: 2, backgroundColor: '#34C759', borderRadius: 12, paddingVertical: 14, alignItems: 'center', flexDirection: 'row', justifyContent: 'center', gap: 8 },
  confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
