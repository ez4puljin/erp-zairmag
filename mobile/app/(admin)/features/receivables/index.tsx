import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { ScreenHeader, LoadingState, ErrorState, StatCard, ListCard, FilterChips } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency } from '@/src/lib/format';

interface Customer {
  id: string;
  storeName: string;
  phone?: string;
  outstandingDebt: number | string;
  creditLimit: number | string;
}

interface Aging {
  customerId: string;
  storeName: string;
  phone?: string;
  current: number;
  days31_60: number;
  days61_90: number;
  over90: number;
  total: number;
}

export default function ReceivablesScreen() {
  const [tab, setTab] = useState<'list' | 'aging'>('list');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [aging, setAging] = useState<Aging[]>([]);

  const fetchData = async () => {
    setError(null);
    try {
      if (tab === 'list') {
        const res = await api.get('/api/customers?limit=100');
        const items = (res.data?.data ?? res.data ?? []).filter((c: Customer) => Number(c.outstandingDebt) > 0);
        setCustomers(items);
      } else {
        const res = await api.get('/api/receivables/aging');
        setAging(res.data ?? []);
      }
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа гарлаа');
    } finally { setLoading(false); setRefreshing(false); }
  };

  useEffect(() => { setLoading(true); fetchData(); }, [tab]);

  const totalDebt = tab === 'list'
    ? customers.reduce((s, c) => s + Number(c.outstandingDebt ?? 0), 0)
    : aging.reduce((s, a) => s + a.total, 0);

  const over90Total = aging.reduce((s, a) => s + a.over90, 0);

  return (
    <View style={st.container}>
      <ScreenHeader title="Авлага" subtitle={`${formatCurrency(totalDebt)} нийт`} />

      <FilterChips
        value={tab}
        onChange={(v) => setTab(v as any)}
        options={[
          { value: 'list', label: 'Жагсаалт' },
          { value: 'aging', label: 'Насжилт' },
        ]}
      />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          {tab === 'list' ? (
            <>
              <View style={{ marginBottom: 12 }}>
                <StatCard label="Нийт авлага" value={formatCurrency(totalDebt)} icon="cash-outline" color="#FF3B30" subtitle={`${customers.length} харилцагч`} />
              </View>
              {customers.length === 0 ? (
                <Text style={st.empty}>Авлага байхгүй</Text>
              ) : customers.map(c => (
                <ListCard
                  key={c.id}
                  icon="person-outline"
                  iconColor="#FF3B30"
                  title={c.storeName}
                  subtitle={c.phone || ''}
                  rightText={formatCurrency(c.outstandingDebt)}
                  rightSubtext={`хязгаар: ${formatCurrency(c.creditLimit)}`}
                  chevron={false}
                />
              ))}
            </>
          ) : (
            <>
              <View style={{ flexDirection: 'row', gap: 8, marginBottom: 12 }}>
                <View style={{ flex: 1 }}><StatCard label="Нийт" value={formatCurrency(totalDebt)} color="#007AFF" /></View>
                <View style={{ flex: 1 }}><StatCard label="90+ өдөр" value={formatCurrency(over90Total)} color="#FF3B30" /></View>
              </View>
              {aging.length === 0 ? (
                <Text style={st.empty}>Авлага байхгүй</Text>
              ) : aging.map(a => (
                <View key={a.customerId} style={st.agingCard}>
                  <Text style={st.agingTitle}>{a.storeName}</Text>
                  <View style={st.agingRow}>
                    <View style={st.agingCell}><Text style={st.agingLabel}>0-30</Text><Text style={st.agingValue}>{formatCurrency(a.current)}</Text></View>
                    <View style={st.agingCell}><Text style={st.agingLabel}>31-60</Text><Text style={[st.agingValue, { color: '#FF9500' }]}>{formatCurrency(a.days31_60)}</Text></View>
                    <View style={st.agingCell}><Text style={st.agingLabel}>61-90</Text><Text style={[st.agingValue, { color: '#FF9500' }]}>{formatCurrency(a.days61_90)}</Text></View>
                    <View style={st.agingCell}><Text style={st.agingLabel}>90+</Text><Text style={[st.agingValue, { color: '#FF3B30' }]}>{formatCurrency(a.over90)}</Text></View>
                  </View>
                  <View style={st.agingTotal}>
                    <Text style={st.agingTotalLabel}>Нийт</Text>
                    <Text style={st.agingTotalValue}>{formatCurrency(a.total)}</Text>
                  </View>
                </View>
              ))}
            </>
          )}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  empty: { textAlign: 'center', color: '#8E8E93', paddingVertical: 40 },
  agingCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  agingTitle: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginBottom: 10 },
  agingRow: { flexDirection: 'row', gap: 6 },
  agingCell: { flex: 1, backgroundColor: '#F5F6FA', borderRadius: 8, padding: 8, alignItems: 'center' },
  agingLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93' },
  agingValue: { fontSize: 11, fontWeight: '700', color: '#1C1C1E', marginTop: 2 },
  agingTotal: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0' },
  agingTotalLabel: { fontSize: 13, color: '#8E8E93', fontWeight: '600' },
  agingTotalValue: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
});
