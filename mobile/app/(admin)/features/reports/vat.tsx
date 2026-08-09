import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl } from 'react-native';
import { ScreenHeader, DateRangePicker, LoadingState, ErrorState, StatCard } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency } from '@/src/lib/format';

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface VatReport {
  vatRate: number;
  salesCount: number;
  orderSales: number;
  truckSales: number;
  totalSales: number;
  taxableBase: number;
  outputVat: number;
}

/**
 * НӨАТ тайлан.
 *
 * Борлуулалтын дүнг НӨАТ багтсан гэж үзэж, тэндээс татварыг задлан гаргана
 * (backend: totalSales * rate / (100 + rate)).
 */
export default function VatReportScreen() {
  const today = new Date();
  const monthStart = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(isoDate(monthStart));
  const [to, setTo] = useState(isoDate(today));
  const [data, setData] = useState<VatReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/api/reports/vat?from=${from}&to=${to}`);
      setData(res.data?.data ?? res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, to]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  return (
    <View style={st.container}>
      <ScreenHeader title="НӨАТ тайлан" />
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
            <StatCard label="Нийт борлуулалт" value={formatCurrency(data?.totalSales ?? 0)} color="#007AFF" />
            <StatCard label={`Гарсан НӨАТ (${data?.vatRate ?? 10}%)`} value={formatCurrency(data?.outputVat ?? 0)} color="#34C759" />
          </View>
          <View style={st.row}>
            <StatCard label="Татварын суурь" value={formatCurrency(data?.taxableBase ?? 0)} color="#5856D6" />
            <StatCard label="Гүйлгээний тоо" value={String(data?.salesCount ?? 0)} color="#FF9500" />
          </View>

          <View style={st.card}>
            <Text style={st.cardTitle}>Задаргаа</Text>
            <Line label="Захиалгын борлуулалт" value={formatCurrency(data?.orderSales ?? 0)} />
            <Line label="Түгээлтийн борлуулалт" value={formatCurrency(data?.truckSales ?? 0)} />
            <View style={st.divider} />
            <Line label="Нийт борлуулалт" value={formatCurrency(data?.totalSales ?? 0)} bold />
            <Line label="Татварын суурь" value={formatCurrency(data?.taxableBase ?? 0)} />
            <Line label={`НӨАТ ${data?.vatRate ?? 10}%`} value={formatCurrency(data?.outputVat ?? 0)} bold />
          </View>

          <Text style={st.note}>
            Борлуулалтын дүнд НӨАТ багтсан гэж тооцов. Хувь хэмжээг "Баримтын
            загвар" хэсгээс өөрчилнө.
          </Text>
        </ScrollView>
      )}
    </View>
  );
}

function Line({ label, value, bold }: { label: string; value: string; bold?: boolean }) {
  return (
    <View style={st.line}>
      <Text style={[st.lineLabel, bold && st.bold]}>{label}</Text>
      <Text style={[st.lineValue, bold && st.bold]}>{value}</Text>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  row: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginTop: 4 },
  cardTitle: { fontSize: 13, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.4, marginBottom: 10 },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 7 },
  lineLabel: { fontSize: 14, color: '#48484A' },
  lineValue: { fontSize: 14, color: '#1C1C1E', fontVariant: ['tabular-nums'] },
  bold: { fontWeight: '700', color: '#1C1C1E' },
  divider: { height: StyleSheet.hairlineWidth, backgroundColor: '#E8ECF0', marginVertical: 6 },
  note: { fontSize: 12, color: '#8E8E93', lineHeight: 18, marginTop: 14, paddingHorizontal: 4 },
});
