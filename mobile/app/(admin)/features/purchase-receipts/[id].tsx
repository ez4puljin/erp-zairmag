import React from 'react';
import { View, ScrollView, Text, StyleSheet } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader, DetailSection, DetailRow, LoadingState, ErrorState } from '@/src/components/admin';
import { useItemQuery } from '@/src/hooks/use-item-query';
import { formatCurrency, formatDate, formatQty } from '@/src/lib/format';

export default function PurchaseReceiptDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, refetch } = useItemQuery<any>(id ? `/api/purchase-receipts/${id}` : null);

  if (loading) return <View style={{ flex: 1 }}><ScreenHeader title="Орлого" /><LoadingState /></View>;
  if (error || !data) return <View style={{ flex: 1 }}><ScreenHeader title="Орлого" /><ErrorState message={error || 'Олдсонгүй'} onRetry={refetch} /></View>;

  const items = data.items ?? [];

  return (
    <View style={s.container}>
      <ScreenHeader title={`Орлого #${data.receiptNumber}`} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <DetailSection title="ЕРӨНХИЙ">
          <DetailRow label="Нийлүүлэгч" value={data.supplier?.name} />
          <DetailRow label="Огноо" value={formatDate(data.receivedAt)} />
          <DetailRow label="Нийт дүн" value={formatCurrency(data.totalAmount)} bold valueColor="#34C759" last />
        </DetailSection>

        <DetailSection title="БАРАА">
          {items.length === 0 ? (
            <Text style={{ padding: 16, color: '#8E8E93' }}>Бараа байхгүй</Text>
          ) : items.map((it: any, idx: number) => (
            <View key={it.id || idx} style={[s.row, idx < items.length - 1 && s.border]}>
              <View style={{ flex: 1 }}>
                <Text style={s.name}>{it.product?.name || '-'}</Text>
                <Text style={s.meta}>{formatQty(it.quantity, it.product?.unitsPerBox)} × {formatCurrency(it.unitPrice)}</Text>
              </View>
              <Text style={s.total}>{formatCurrency(it.lineTotal)}</Text>
            </View>
          ))}
        </DetailSection>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  name: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  meta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  total: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
});
