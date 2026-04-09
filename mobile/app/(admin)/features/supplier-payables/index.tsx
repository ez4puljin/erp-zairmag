import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, RefreshControl } from 'react-native';
import { ScreenHeader, LoadingState, ErrorState, StatCard, ListCard } from '@/src/components/admin';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { TouchableOpacity } from 'react-native';
import api from '@/src/lib/api';
import { formatCurrency } from '@/src/lib/format';

export default function SupplierPayablesScreen() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = async () => {
    setError(null);
    try {
      const today = new Date().toISOString().split('T')[0];
      const yearStart = `${new Date().getFullYear()}-01-01`;
      const res = await api.get('/api/supplier-payables/summary', { params: { startDate: yearStart, endDate: today } });
      setData(res.data?.data ?? res.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const totalOwed = data.reduce((s, sup) => s + Number(sup.closingBalance ?? sup.balance ?? 0), 0);

  return (
    <View style={st.container}>
      <ScreenHeader
        title="Нийлүүлэгч тооцоо"
        subtitle={formatCurrency(totalOwed)}
        rightIcon="add"
        onRightPress={() => router.push('/(admin)/features/supplier-payables/new' as any)}
      />
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchData} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          <StatCard label="Нийт төлөх" value={formatCurrency(totalOwed)} icon="business-outline" color="#EA580C" subtitle={`${data.length} нийлүүлэгч`} />
          <View style={{ height: 12 }} />
          {data.length === 0 ? (
            <Text style={st.empty}>Нийлүүлэгч байхгүй</Text>
          ) : data.map((sup: any) => (
            <ListCard
              key={sup.supplierId || sup.id}
              icon="business-outline"
              iconColor="#EA580C"
              title={sup.name || sup.supplier?.name}
              subtitle={sup.phone}
              rightText={formatCurrency(sup.closingBalance ?? sup.balance ?? 0)}
              chevron={false}
            />
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  empty: { textAlign: 'center', color: '#8E8E93', paddingVertical: 30 },
});
