import React from 'react';
import { View, ScrollView, StyleSheet, Text } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader, DetailSection, DetailRow, LoadingState, ErrorState } from '@/src/components/admin';
import { useItemQuery } from '@/src/hooks/use-item-query';
import { formatCurrency, formatDate } from '@/src/lib/format';

export default function InvoiceDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, refetch } = useItemQuery<any>(id ? `/api/invoices/${id}` : null);

  if (loading) return <View style={{ flex: 1 }}><ScreenHeader title="Нэхэмжлэл" /><LoadingState /></View>;
  if (error || !data) return <View style={{ flex: 1 }}><ScreenHeader title="Нэхэмжлэл" /><ErrorState message={error || 'Олдсонгүй'} onRetry={refetch} /></View>;

  const items = data.order?.items ?? [];

  return (
    <View style={s.container}>
      <ScreenHeader title={`#${data.invoiceNumber}`} subtitle={`Нэхэмжлэл`} />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <DetailSection title="ЕРӨНХИЙ МЭДЭЭЛЭЛ">
          <DetailRow label="Дугаар" value={`#${data.invoiceNumber}`} />
          <DetailRow label="Захиалга" value={`#${data.order?.orderNumber}`} />
          <DetailRow label="Харилцагч" value={data.order?.customer?.storeName} />
          <DetailRow label="Огноо" value={formatDate(data.issuedAt)} last />
        </DetailSection>

        <DetailSection title="БАРААНЫ ЖАГСААЛТ">
          {items.length === 0 ? (
            <Text style={{ padding: 16, color: '#8E8E93' }}>Бараа байхгүй</Text>
          ) : items.map((it: any, idx: number) => (
            <View key={it.id || idx} style={[s.itemRow, idx < items.length - 1 && s.border]}>
              <View style={{ flex: 1 }}>
                <Text style={s.itemName}>{it.product?.name ?? it.productName ?? '-'}</Text>
                <Text style={s.itemMeta}>{it.quantity} × {formatCurrency(it.unitPrice)}</Text>
              </View>
              <Text style={s.itemTotal}>{formatCurrency(it.lineTotal)}</Text>
            </View>
          ))}
        </DetailSection>

        <DetailSection title="ДҮН">
          <DetailRow label="Дэд дүн" value={formatCurrency(data.subtotal)} />
          <DetailRow label="НӨАТ" value={formatCurrency(data.taxAmount)} />
          <DetailRow label="Нийт" value={formatCurrency(data.totalAmount)} bold valueColor="#34C759" last />
        </DetailSection>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  itemRow: { flexDirection: 'row', alignItems: 'center', padding: 12 },
  border: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  itemName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  itemMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  itemTotal: { fontSize: 14, fontWeight: '700', color: '#1C1C1E' },
});
