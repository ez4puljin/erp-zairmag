import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ScreenHeader, DateRangePicker, LoadingState, ErrorState, StatCard } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency, formatDate } from '@/src/lib/format';

function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

export default function SalesReportScreen() {
  const today = new Date();
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 6);
  const [from, setFrom] = useState(isoDate(weekAgo));
  const [to, setTo] = useState(isoDate(today));
  const [data, setData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/api/reports/daily-sales?from=${from}&to=${to}`);
      const body = res.data;
      // API нь { summary, daily } гэж буцаадаг. Бусад хэлбэрийг нөөцөд үлдээв.
      const items = Array.isArray(body) ? body
        : Array.isArray(body?.daily) ? body.daily
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body?.days) ? body.days
        : Array.isArray(body?.dailySales) ? body.dailySales
        : Array.isArray(body?.sales) ? body.sales
        : [];
      setData(items);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setLoading(false); setRefreshing(false); }
  }, [from, to]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const totalRevenue = data.reduce((s, d) => s + Number(d.revenue ?? 0), 0);
  const totalOrders = data.reduce((s, d) => s + Number(d.orderCount ?? 0), 0);
  const totalItems = data.reduce((s, d) => s + Number(d.itemsSold ?? 0), 0);
  const totalProfit = data.reduce((s, d) => s + Number(d.profit ?? 0), 0);

  return (
    <View style={st.container}>
      <ScreenHeader title="Борлуулалтын тайлан" />
      <View style={{ padding: 12 }}>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </View>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchData} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          <View style={st.grid}>
            <View style={{ flex: 1 }}><StatCard label="Орлого" value={formatCurrency(totalRevenue)} color="#34C759" icon="trending-up" /></View>
            <View style={{ flex: 1 }}><StatCard label="Захиалга" value={totalOrders} color="#007AFF" icon="cart" /></View>
          </View>
          <View style={[st.grid, { marginTop: 8 }]}>
            <View style={{ flex: 1 }}><StatCard label="Бараа" value={totalItems} color="#AF52DE" icon="cube" /></View>
            <View style={{ flex: 1 }}><StatCard label="Ашиг" value={formatCurrency(totalProfit)} color="#FF9500" icon="cash" /></View>
          </View>

          <Text style={st.sectionTitle}>Өдрөөр</Text>
          {data.length === 0 ? (
            <Text style={st.empty}>Мэдээлэл байхгүй</Text>
          ) : data.map((row: any, idx: number) => (
            <View key={idx} style={st.row}>
              <Text style={st.date}>{formatDate(row.date)}</Text>
              <View style={{ flex: 1 }}>
                <Text style={st.rowMeta}>{row.orderCount} захиалга · {row.itemsSold} ш</Text>
              </View>
              <Text style={st.amount}>{formatCurrency(row.revenue)}</Text>
            </View>
          ))}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  grid: { flexDirection: 'row', gap: 8 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginTop: 16, marginBottom: 8 },
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: '#E8ECF0', gap: 12 },
  date: { fontSize: 13, fontWeight: '600', color: '#1C1C1E', width: 90 },
  rowMeta: { fontSize: 11, color: '#8E8E93' },
  amount: { fontSize: 14, fontWeight: '700', color: '#34C759' },
  empty: { textAlign: 'center', color: '#8E8E93', paddingVertical: 24 },
});
