import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useOrder, useRequestCancel } from '@/src/hooks/use-orders';
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

export default function OrderDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data: order, isLoading } = useOrder(id);
  const requestCancel = useRequestCancel();
  const [cancelNote, setCancelNote] = useState('');
  const [showCancelForm, setShowCancelForm] = useState(false);

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('mn-MN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleRequestCancel = () => {
    Alert.alert(
      'Цуцлах хүсэлт илгээх',
      'Менежер тантай утсаар холбогдож баталгаажуулсны дараа захиалга цуцлагдана. Үргэлжлүүлэх үү?',
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Хүсэлт илгээх',
          style: 'destructive',
          onPress: () => {
            requestCancel.mutate({ orderId: id, note: cancelNote || undefined });
            setShowCancelForm(false);
            setCancelNote('');
          },
        },
      ],
    );
  };

  if (isLoading || !order) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  const status = STATUS_CONFIG[order.status];
  const canRequestCancel =
    order.status === 'PENDING' ||
    order.status === 'APPROVED' ||
    order.status === 'SHIPPING';

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `#${order.orderNumber}`,
          headerStyle: { backgroundColor: '#F2F2F7' },
          headerTitleStyle: { fontWeight: '700', color: '#1C1C1E' },
          headerShadowVisible: false,
        }}
      />
      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.scrollContent}
      >
        {/* Status Card */}
        <View style={styles.statusCard}>
          <View style={[styles.statusBadgeLarge, { backgroundColor: status.bg }]}>
            <Ionicons name={status.icon} size={20} color={status.text} />
            <Text style={[styles.statusTextLarge, { color: status.text }]}>
              {status.label}
            </Text>
          </View>
          <Text style={styles.dateText}>{formatDate(order.createdAt)}</Text>

          {order.status === 'CANCELLATION_REQUESTED' && (
            <View style={styles.cancelInfoBox}>
              <Ionicons name="information-circle-outline" size={18} color="#E65100" />
              <Text style={styles.cancelInfoText}>
                Цуцлах хүсэлт илгээгдсэн. Менежер тантай холбогдож баталгаажуулна.
              </Text>
            </View>
          )}
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Бүтээгдэхүүнүүд</Text>
          {order.items.map((item, index) => (
            <View
              key={index}
              style={[
                styles.itemRow,
                index < order.items.length - 1 && styles.itemRowBorder,
              ]}
            >
              <View style={styles.itemInfo}>
                <Text style={styles.itemName}>{item.productName}</Text>
                <Text style={styles.itemMeta}>
                  {item.quantity} x {Number(item.unitPrice).toLocaleString()}₮
                </Text>
              </View>
              <Text style={styles.itemTotal}>
                {Number(item.lineTotal).toLocaleString()}₮
              </Text>
            </View>
          ))}
        </View>

        {/* Totals */}
        <View style={styles.section}>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>Дүн</Text>
            <Text style={styles.totalValue}>
              {Number(order.subtotal).toLocaleString()}₮
            </Text>
          </View>
          <View style={styles.totalRow}>
            <Text style={styles.totalLabel}>НӨАТ (10%)</Text>
            <Text style={styles.totalValue}>
              {Number(order.taxAmount).toLocaleString()}₮
            </Text>
          </View>
          <View style={[styles.totalRow, styles.grandTotalRow]}>
            <Text style={styles.grandTotalLabel}>Нийт</Text>
            <Text style={styles.grandTotalValue}>
              {Number(order.totalAmount).toLocaleString()}₮
            </Text>
          </View>
        </View>

        {/* Cancel Request */}
        {canRequestCancel && !showCancelForm && (
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={() => setShowCancelForm(true)}
          >
            <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
            <Text style={styles.cancelButtonText}>Захиалга цуцлах хүсэлт</Text>
          </TouchableOpacity>
        )}

        {showCancelForm && (
          <View style={styles.cancelForm}>
            <Text style={styles.cancelFormTitle}>Цуцлах шалтгаан (заавал биш)</Text>
            <TextInput
              style={styles.cancelInput}
              value={cancelNote}
              onChangeText={setCancelNote}
              placeholder="Цуцлах шалтгаанаа бичнэ үү..."
              placeholderTextColor="#C7C7CC"
              multiline
              numberOfLines={3}
              textAlignVertical="top"
            />
            <View style={styles.cancelFormButtons}>
              <TouchableOpacity
                style={styles.cancelFormBtn}
                onPress={() => {
                  setShowCancelForm(false);
                  setCancelNote('');
                }}
              >
                <Text style={styles.cancelFormBtnText}>Болих</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.cancelFormSubmitBtn,
                  requestCancel.isPending && { opacity: 0.6 },
                ]}
                onPress={handleRequestCancel}
                disabled={requestCancel.isPending}
              >
                {requestCancel.isPending ? (
                  <ActivityIndicator color="#ffffff" size="small" />
                ) : (
                  <Text style={styles.cancelFormSubmitText}>Хүсэлт илгээх</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scrollContent: { padding: 16, paddingBottom: 40 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  statusCard: { backgroundColor: '#ffffff', borderRadius: 14, padding: 20, alignItems: 'center', marginBottom: 12 },
  statusBadgeLarge: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 20, marginBottom: 8 },
  statusTextLarge: { fontSize: 16, fontWeight: '700' },
  dateText: { fontSize: 14, color: '#8E8E93' },
  cancelInfoBox: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, backgroundColor: '#FFF3E0', borderRadius: 10, padding: 12, marginTop: 12, width: '100%' },
  cancelInfoText: { flex: 1, fontSize: 13, color: '#E65100', lineHeight: 18 },
  section: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16, marginBottom: 12 },
  sectionTitle: { fontSize: 13, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 },
  itemRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 10 },
  itemRowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  itemInfo: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '500', color: '#1C1C1E', marginBottom: 2 },
  itemMeta: { fontSize: 13, color: '#8E8E93' },
  itemTotal: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 15, color: '#8E8E93' },
  totalValue: { fontSize: 15, color: '#1C1C1E' },
  grandTotalRow: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E5E5EA', marginTop: 8, paddingTop: 12 },
  grandTotalLabel: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  grandTotalValue: { fontSize: 20, fontWeight: '700', color: '#007AFF' },
  cancelButton: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#ffffff', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#FFD2D2' },
  cancelButtonText: { fontSize: 16, fontWeight: '600', color: '#FF3B30' },
  cancelForm: { backgroundColor: '#ffffff', borderRadius: 14, padding: 16 },
  cancelFormTitle: { fontSize: 14, fontWeight: '600', color: '#3C3C43', marginBottom: 8 },
  cancelInput: { backgroundColor: '#F2F2F7', borderRadius: 10, padding: 12, fontSize: 15, color: '#1C1C1E', minHeight: 70, marginBottom: 12 },
  cancelFormButtons: { flexDirection: 'row', gap: 10 },
  cancelFormBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#F2F2F7' },
  cancelFormBtnText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
  cancelFormSubmitBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 10, backgroundColor: '#FF3B30' },
  cancelFormSubmitText: { fontSize: 15, fontWeight: '600', color: '#ffffff' },
});
