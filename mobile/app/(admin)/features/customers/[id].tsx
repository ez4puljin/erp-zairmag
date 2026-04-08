import React from 'react';
import { View, ScrollView, Alert, TouchableOpacity, Text, StyleSheet } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, DetailSection, DetailRow, LoadingState, ErrorState, confirm } from '@/src/components/admin';
import { useItemQuery } from '@/src/hooks/use-item-query';
import { invalidateListCache } from '@/src/hooks/use-list-query';
import api from '@/src/lib/api';
import { formatCurrency, formatPhone, PRICING_TIER_LABELS } from '@/src/lib/format';
import type { Customer } from '@/src/types';

export default function CustomerDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { data, loading, error, refetch } = useItemQuery<Customer & { customerCategory?: { name: string } }>(
    id ? `/api/customers/${id}` : null,
  );

  const handleDelete = async () => {
    if (!data) return;
    const ok = await confirm({
      title: 'Устгах уу?',
      message: `"${data.storeName}" харилцагчийг устгах уу?`,
      destructive: true,
      confirmLabel: 'Устгах',
    });
    if (!ok) return;
    try {
      await api.delete(`/api/customers/${id}`);
      invalidateListCache('/api/customers');
      router.back();
    } catch (err: any) {
      Alert.alert('Алдаа', err?.response?.data?.message || 'Устгахад алдаа гарлаа');
    }
  };

  if (loading) return (<View style={{ flex: 1 }}><ScreenHeader title="Харилцагч" /><LoadingState /></View>);
  if (error || !data) return (<View style={{ flex: 1 }}><ScreenHeader title="Харилцагч" /><ErrorState message={error || 'Олдсонгүй'} onRetry={refetch} /></View>);

  return (
    <View style={s.container}>
      <ScreenHeader
        title={data.storeName}
        subtitle={data.contactName}
        rightIcon="create-outline"
        onRightPress={() => router.push(`/(admin)/features/customers/edit/${id}` as any)}
      />
      <ScrollView contentContainerStyle={{ paddingBottom: 40 }}>
        <DetailSection title="ҮНДСЭН МЭДЭЭЛЭЛ">
          <DetailRow label="Дэлгүүр" value={data.storeName} icon="storefront-outline" iconColor="#EC4899" />
          <DetailRow label="Холбоо барих" value={data.contactName} icon="person-outline" iconColor="#AF52DE" />
          <DetailRow label="Утас" value={formatPhone(data.phone)} icon="call-outline" iconColor="#34C759" />
          <DetailRow label="Хаяг" value={data.address} icon="location-outline" iconColor="#FF9500" last />
        </DetailSection>

        <DetailSection title="САНХҮҮ">
          <DetailRow label="Зэрэглэл" value={PRICING_TIER_LABELS[data.pricingTier] || data.pricingTier} icon="ribbon-outline" iconColor="#AF52DE" />
          <DetailRow
            label="Зээлийн хязгаар"
            value={formatCurrency(data.creditLimit)}
            icon="wallet-outline" iconColor="#007AFF"
          />
          <DetailRow
            label="Өр"
            value={formatCurrency(data.outstandingDebt)}
            valueColor={Number(data.outstandingDebt) > 0 ? '#FF3B30' : '#34C759'}
            bold
            icon="cash-outline" iconColor="#FF3B30"
            last
          />
        </DetailSection>

        <View style={{ paddingHorizontal: 12, marginTop: 20 }}>
          <TouchableOpacity style={s.deleteBtn} onPress={handleDelete}>
            <Ionicons name="trash-outline" size={18} color="#FF3B30" />
            <Text style={s.deleteText}>Харилцагч устгах</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  deleteBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#FF3B3012', borderRadius: 14, paddingVertical: 14, borderWidth: 1, borderColor: '#FF3B3030' },
  deleteText: { fontSize: 15, fontWeight: '600', color: '#FF3B30' },
});
