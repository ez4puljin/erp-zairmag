import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ScreenHeader, LoadingState, ErrorState, StatCard, ListCard } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency, formatPhone } from '@/src/lib/format';

export default function DebtReportScreen() {
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get('/api/reports/customer-debt');
      const body = res.data;
      const items = Array.isArray(body) ? body
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body?.customers) ? body.customers
        : Array.isArray(body?.debts) ? body.debts
        : [];
      setData(items);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const totalDebt = data.reduce((s, c) => s + Number(c.outstandingDebt ?? 0), 0);

  return (
    <View style={st.container}>
      <ScreenHeader title="Өрийн тайлан" />
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchData} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          <StatCard label="Нийт авлага" value={formatCurrency(totalDebt)} color="#FF3B30" icon="cash-outline" subtitle={`${data.length} харилцагч`} />

          <Text style={st.sectionTitle}>Харилцагчаар</Text>
          {data.length === 0 ? (
            <Text style={st.empty}>Авлага байхгүй</Text>
          ) : data.map((c: any) => (
            <ListCard
              key={c.id || c.customerId}
              icon="person-outline"
              iconColor="#FF3B30"
              title={c.storeName}
              subtitle={formatPhone(c.phone || '')}
              rightText={formatCurrency(c.outstandingDebt)}
              rightSubtext={`${c.creditUsagePercent ?? 0}%`}
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
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  empty: { textAlign: 'center', color: '#8E8E93', paddingVertical: 24 },
});
