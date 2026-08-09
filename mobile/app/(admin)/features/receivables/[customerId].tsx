import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import { ScreenHeader, DateRangePicker, LoadingState, ErrorState, StatCard } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency, formatDate } from '@/src/lib/format';

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface Entry {
  date: string;
  description: string;
  debit: number;
  credit: number;
  balance?: number;
}

interface Ledger {
  customer?: { storeName?: string };
  openingBalance: number;
  closingBalance: number;
  totalDebit: number;
  totalCredit: number;
  entries: Entry[];
}

/**
 * Харилцагчийн авлагын дэвтэр — эхний үлдэгдэл, гүйлгээ бүр, эцсийн үлдэгдэл.
 * Admin дээрх "Тайлан → Авлагын дэвтэр"-ийн гар утасны хувилбар.
 */
export default function CustomerLedgerScreen() {
  const { customerId } = useLocalSearchParams<{ customerId: string }>();
  const today = new Date();
  const yearStart = new Date(today.getFullYear(), 0, 1);
  const [from, setFrom] = useState(isoDate(yearStart));
  const [to, setTo] = useState(isoDate(today));
  const [data, setData] = useState<Ledger | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!customerId) return;
    setError(null);
    try {
      const res = await api.get(`/api/receivables/${customerId}?from=${from}&to=${to}`);
      setData(res.data?.data ?? res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [customerId, from, to]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  return (
    <View style={st.container}>
      <ScreenHeader title={data?.customer?.storeName || 'Авлагын дэвтэр'} />
      <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={() => { setLoading(true); fetchData(); }} />
      ) : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 32 }}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />
          }
        >
          <View style={st.row}>
            <StatCard label="Эхний үлдэгдэл" value={formatCurrency(data?.openingBalance ?? 0)} color="#8E8E93" />
            <StatCard label="Эцсийн үлдэгдэл" value={formatCurrency(data?.closingBalance ?? 0)} color="#FF3B30" />
          </View>
          <View style={st.row}>
            <StatCard label="Дебет" value={formatCurrency(data?.totalDebit ?? 0)} color="#FF3B30" />
            <StatCard label="Кредит" value={formatCurrency(data?.totalCredit ?? 0)} color="#34C759" />
          </View>

          <View style={st.card}>
            <Text style={st.cardTitle}>ГҮЙЛГЭЭ</Text>
            {(data?.entries ?? []).length === 0 ? (
              <Text style={st.empty}>Энэ хугацаанд гүйлгээ байхгүй</Text>
            ) : (
              (data?.entries ?? []).map((e, i) => (
                <View key={i} style={st.entry}>
                  <View style={st.entryLeft}>
                    <Text style={st.entryDesc} numberOfLines={2}>{e.description}</Text>
                    <Text style={st.entryDate}>{formatDate(e.date)}</Text>
                  </View>
                  <View style={st.entryRight}>
                    {e.debit > 0 && <Text style={st.debit}>+{formatCurrency(e.debit)}</Text>}
                    {e.credit > 0 && <Text style={st.credit}>−{formatCurrency(e.credit)}</Text>}
                  </View>
                </View>
              ))
            )}
          </View>
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 4 },
  cardTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 10 },
  empty: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 18 },
  entry: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F0F2F5' },
  entryLeft: { flex: 1, paddingRight: 10 },
  entryDesc: { fontSize: 14, color: '#1C1C1E', fontWeight: '500' },
  entryDate: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  entryRight: { alignItems: 'flex-end' },
  debit: { fontSize: 14, fontWeight: '700', color: '#FF3B30', fontVariant: ['tabular-nums'] },
  credit: { fontSize: 14, fontWeight: '700', color: '#34C759', fontVariant: ['tabular-nums'] },
});
