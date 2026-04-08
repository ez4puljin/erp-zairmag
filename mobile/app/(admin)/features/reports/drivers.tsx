import React, { useEffect, useState, useCallback } from 'react';
import { View, Text, ScrollView, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, DateRangePicker, LoadingState, ErrorState, StatCard, EmptyState } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency, formatDate, PAYMENT_LABELS, PAYMENT_COLORS } from '@/src/lib/format';

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

interface PaymentEntry { count: number; amount: number; }
interface Breakdown { [k: string]: PaymentEntry; }

interface LoadRow {
  loadId: string;
  loadNumber: number;
  loadDate: string;
  status: string;
  loaded: number;
  sold: number;
  returned: number;
  damaged: number;
  salesCount: number;
  salesRevenue: number;
  paymentBreakdown: Breakdown;
}

interface DriverRow {
  driverId: string;
  driverName: string;
  phone: string | null;
  loads: LoadRow[];
  summary: {
    totalLoads: number;
    loaded: number;
    sold: number;
    returned: number;
    damaged: number;
    totalRevenue: number;
    saleCount: number;
    paymentBreakdown: Breakdown;
  };
}

interface ReportData {
  summary: {
    totalLoads: number;
    totalLoadedQty: number;
    totalSoldQty: number;
    totalReturnedQty: number;
    totalDamagedQty: number;
    totalSalesRevenue: number;
    totalSaleCount: number;
    paymentBreakdown: Breakdown;
  };
  drivers: DriverRow[];
}

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DISPATCHED: { label: 'Замд', color: '#5856D6' },
  COMPLETED: { label: 'Дууссан', color: '#34C759' },
};

export default function DriverReportScreen() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(isoDate(firstDay));
  const [to, setTo] = useState(isoDate(today));
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const fetchData = useCallback(async () => {
    setError(null);
    try {
      const res = await api.get(`/api/reports/drivers?from=${from}&to=${to}`);
      setData(res.data);
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа гарлаа');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, to]);

  useEffect(() => { setLoading(true); fetchData(); }, [fetchData]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  return (
    <View style={st.container}>
      <ScreenHeader title="Жолоочийн тайлан" />
      <View style={{ paddingHorizontal: 12, paddingVertical: 10 }}>
        <DateRangePicker from={from} to={to} onChange={(f, t) => { setFrom(f); setTo(t); }} />
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : !data || data.drivers.length === 0 ? (
        <EmptyState
          icon="car-outline"
          title="Өгөгдөл байхгүй"
          message="Сонгосон огноонд ачилт байхгүй байна"
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 40 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          {/* Stats */}
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <View style={{ flex: 1 }}>
              <StatCard label="Орлого" value={formatCurrency(data.summary.totalSalesRevenue)} icon="trending-up" color="#34C759" subtitle={`${data.summary.totalSaleCount} борлуулалт`} />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard label="Зарагдсан" value={`${data.summary.totalSoldQty} ш`} icon="cube" color="#007AFF" subtitle={`${data.summary.totalLoadedQty} ачсан`} />
            </View>
          </View>
          <View style={{ flexDirection: 'row', gap: 8, marginTop: 8 }}>
            <View style={{ flex: 1 }}>
              <StatCard label="Ачилт" value={data.summary.totalLoads} icon="car" color="#FF9500" />
            </View>
            <View style={{ flex: 1 }}>
              <StatCard label="Жолооч" value={data.drivers.length} icon="people" color="#AF52DE" />
            </View>
          </View>

          {/* Per-driver cards */}
          <Text style={st.sectionTitle}>ЖОЛООЧ БҮРИЙН МЭДЭЭЛЭЛ</Text>
          {data.drivers.map((d) => {
            const isOpen = expanded.has(d.driverId);
            const breakdown = Object.entries(d.summary.paymentBreakdown).filter(([, v]) => v.amount > 0);
            return (
              <View key={d.driverId} style={st.driverCard}>
                <TouchableOpacity onPress={() => toggle(d.driverId)} style={st.driverHeader} activeOpacity={0.7}>
                  <View style={st.avatar}>
                    <Text style={st.avatarText}>
                      {d.driverName.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}
                    </Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.driverName} numberOfLines={1}>{d.driverName}</Text>
                    <Text style={st.driverMeta}>
                      {d.summary.totalLoads} ачилт · {d.summary.saleCount} бор · {d.summary.sold}/{d.summary.loaded} ш
                    </Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.driverRevenue}>{formatCurrency(d.summary.totalRevenue)}</Text>
                    <Ionicons name={isOpen ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8E93" style={{ marginTop: 2 }} />
                  </View>
                </TouchableOpacity>

                {/* Payment chips */}
                {breakdown.length > 0 && (
                  <View style={st.chipsRow}>
                    {breakdown.map(([method, v]) => {
                      const color = PAYMENT_COLORS[method] || '#8E8E93';
                      const label = PAYMENT_LABELS[method] || method;
                      return (
                        <View key={method} style={[st.chip, { backgroundColor: `${color}15`, borderColor: `${color}40` }]}>
                          <View style={[st.chipDot, { backgroundColor: color }]} />
                          <Text style={[st.chipLabel, { color }]}>{label}</Text>
                          <Text style={[st.chipAmount, { color }]}>{formatCurrency(v.amount)}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Loads list (expanded) */}
                {isOpen && (
                  <View style={st.loadsList}>
                    <Text style={st.loadsTitle}>АЧИЛТ</Text>
                    {d.loads.map((load) => {
                      const status = STATUS_LABELS[load.status] || { label: load.status, color: '#8E8E93' };
                      return (
                        <View key={load.loadId} style={st.loadRow}>
                          <View style={{ flex: 1 }}>
                            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                              <Text style={st.loadNum}>#{load.loadNumber}</Text>
                              <View style={[st.statusBadge, { backgroundColor: `${status.color}15` }]}>
                                <Text style={[st.statusText, { color: status.color }]}>{status.label}</Text>
                              </View>
                            </View>
                            <Text style={st.loadDate}>{formatDate(load.loadDate)} · {load.sold}/{load.loaded} ш · {load.salesCount} бор</Text>
                          </View>
                          <Text style={st.loadRevenue}>{formatCurrency(load.salesRevenue)}</Text>
                        </View>
                      );
                    })}
                  </View>
                )}
              </View>
            );
          })}
        </ScrollView>
      )}
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginTop: 16, marginBottom: 8, marginLeft: 4 },

  driverCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  driverHeader: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  avatar: { width: 44, height: 44, borderRadius: 12, backgroundColor: '#5856D6', justifyContent: 'center', alignItems: 'center' },
  avatarText: { fontSize: 14, fontWeight: '800', color: '#fff' },
  driverName: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  driverMeta: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  driverRevenue: { fontSize: 16, fontWeight: '800', color: '#34C759' },

  chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 10 },
  chip: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  chipDot: { width: 6, height: 6, borderRadius: 3 },
  chipLabel: { fontSize: 10, fontWeight: '600' },
  chipAmount: { fontSize: 10, fontWeight: '700' },

  loadsList: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0' },
  loadsTitle: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 8 },
  loadRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  loadNum: { fontSize: 13, fontWeight: '700', color: '#007AFF' },
  loadDate: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  loadRevenue: { fontSize: 14, fontWeight: '700', color: '#34C759' },
  statusBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 4 },
  statusText: { fontSize: 9, fontWeight: '700' },
});
