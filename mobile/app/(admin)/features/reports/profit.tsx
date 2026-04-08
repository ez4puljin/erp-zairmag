import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ScreenHeader, DateRangePicker, LoadingState, ErrorState, StatCard } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency } from '@/src/lib/format';

function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }

export default function ProfitReportScreen() {
  const today = new Date();
  const monthAgo = new Date(today); monthAgo.setDate(1);
  const [from, setFrom] = useState(isoDate(monthAgo));
  const [to, setTo] = useState(isoDate(today));
  const [data, setData] = useState<any>({ products: [], totalRevenue: 0, totalCost: 0, grossProfit: 0 });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/api/reports/profit?from=${from}&to=${to}`);
      const body = res.data;
      const products = Array.isArray(body) ? body
        : Array.isArray(body?.products) ? body.products
        : Array.isArray(body?.data) ? body.data
        : Array.isArray(body?.byProduct) ? body.byProduct
        : [];
      setData({
        products,
        totalRevenue: body?.totalRevenue ?? 0,
        totalCost: body?.totalCost ?? 0,
        grossProfit: body?.grossProfit ?? 0,
      });
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally { setLoading(false); setRefreshing(false); }
  }, [from, to]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  return (
    <View style={st.container}>
      <ScreenHeader title="Ашгийн тайлан" />
      <View style={{ padding: 12 }}>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </View>
      {loading ? <LoadingState /> : error ? <ErrorState message={error} onRetry={fetchData} /> : (
        <ScrollView
          contentContainerStyle={{ padding: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          <View style={st.grid}>
            <View style={{ flex: 1 }}><StatCard label="Орлого" value={formatCurrency(data.totalRevenue)} color="#34C759" /></View>
            <View style={{ flex: 1 }}><StatCard label="Өртөг" value={formatCurrency(data.totalCost)} color="#FF9500" /></View>
          </View>
          <View style={{ marginTop: 8 }}>
            <StatCard label="Цэвэр ашиг" value={formatCurrency(data.grossProfit)} color="#AF52DE" icon="trending-up" />
          </View>

          <Text style={st.sectionTitle}>Бараагаар</Text>
          {data.products.length === 0 ? (
            <Text style={st.empty}>Мэдээлэл байхгүй</Text>
          ) : data.products.map((p: any, idx: number) => (
            <View key={idx} style={st.row}>
              <View style={{ flex: 1 }}>
                <Text style={st.name}>{p.productName || p.name}</Text>
                <Text style={st.meta}>{p.quantitySold ?? p.quantity} ш · {formatCurrency(p.revenue)}</Text>
              </View>
              <View style={{ alignItems: 'flex-end' }}>
                <Text style={st.profit}>{formatCurrency(p.profit)}</Text>
                <Text style={st.margin}>{Math.round((p.margin ?? 0))}%</Text>
              </View>
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
  row: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#fff', borderRadius: 12, marginBottom: 6, borderWidth: 1, borderColor: '#E8ECF0' },
  name: { fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  meta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  profit: { fontSize: 14, fontWeight: '700', color: '#34C759' },
  margin: { fontSize: 11, color: '#AF52DE', fontWeight: '600' },
  empty: { textAlign: 'center', color: '#8E8E93', paddingVertical: 24 },
});
