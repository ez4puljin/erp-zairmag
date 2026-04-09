import React, { useCallback, useEffect, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, ActivityIndicator, RefreshControl } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, DateRangePicker } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency } from '@/src/lib/format';

export default function BankAccountReportScreen() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [from, setFrom] = useState(firstDay.toISOString().split('T')[0]);
  const [to, setTo] = useState(today.toISOString().split('T')[0]);
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, any>>({});

  const fetchReport = useCallback(async () => {
    try {
      const { data } = await api.get('/api/bank-accounts/report', { params: { from, to } });
      setReport(data);
    } catch {} finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  const toggleExpand = async (accountId: string) => {
    if (expandedId === accountId) { setExpandedId(null); return; }
    setExpandedId(accountId);
    if (!detailData[accountId]) {
      try {
        const { data } = await api.get(`/api/bank-accounts/${accountId}/transactions`, { params: { from, to } });
        setDetailData(p => ({ ...p, [accountId]: data }));
      } catch {}
    }
  };

  if (loading) return <View style={{ flex: 1 }}><ScreenHeader title="Дансны тайлан" /><View style={s.center}><ActivityIndicator color="#007AFF" /></View></View>;

  const gt = report?.grandTotal ?? { inflow: 0, outflow: 0, net: 0 };
  const accounts = report?.accounts ?? [];

  return (
    <View style={s.container}>
      <ScreenHeader title="Дансны тайлан" />
      <ScrollView
        contentContainerStyle={{ padding: 12, paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchReport(); }} />}
      >
        <DateRangePicker from={from} to={to} onFromChange={setFrom} onToChange={setTo} onApply={fetchReport} />

        {/* Grand totals */}
        <View style={s.statRow}>
          <View style={[s.statCard, { backgroundColor: '#ECFDF5', borderColor: '#A7F3D0' }]}>
            <Ionicons name="arrow-down-circle" size={18} color="#10B981" />
            <Text style={[s.statVal, { color: '#10B981' }]}>{formatCurrency(gt.inflow)}</Text>
            <Text style={s.statLabel}>Орлого</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }]}>
            <Ionicons name="arrow-up-circle" size={18} color="#EF4444" />
            <Text style={[s.statVal, { color: '#EF4444' }]}>{formatCurrency(gt.outflow)}</Text>
            <Text style={s.statLabel}>Зарлага</Text>
          </View>
          <View style={[s.statCard, { backgroundColor: gt.net >= 0 ? '#EFF6FF' : '#FFF7ED', borderColor: gt.net >= 0 ? '#BFDBFE' : '#FED7AA' }]}>
            <Ionicons name="wallet" size={18} color={gt.net >= 0 ? '#007AFF' : '#FF9500'} />
            <Text style={[s.statVal, { color: gt.net >= 0 ? '#007AFF' : '#FF9500' }]}>{formatCurrency(gt.net)}</Text>
            <Text style={s.statLabel}>Цэвэр</Text>
          </View>
        </View>

        {/* Per-account */}
        {accounts.length === 0 ? (
          <View style={s.empty}>
            <Ionicons name="wallet-outline" size={40} color="#D1D5DB" />
            <Text style={s.emptyText}>Данс бүртгэгдээгүй</Text>
          </View>
        ) : accounts.map((item: any) => {
          const acc = item.account;
          const expanded = expandedId === acc.id;
          const detail = detailData[acc.id];
          return (
            <TouchableOpacity
              key={acc.id}
              activeOpacity={0.7}
              onPress={() => toggleExpand(acc.id)}
              style={[s.card, expanded && { borderColor: '#007AFF', borderWidth: 2 }]}
            >
              <View style={s.cardHeader}>
                <View style={{ flex: 1 }}>
                  <Text style={s.bankName}>{acc.bankName}</Text>
                  <Text style={s.accNum}>{acc.accountNumber} · {acc.holderName}</Text>
                </View>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={s.balance}>{formatCurrency(acc.currentBalance)}</Text>
                  <Text style={{ fontSize: 10, color: '#8E8E93' }}>Үлдэгдэл</Text>
                </View>
              </View>

              <View style={s.miniStats}>
                <View style={s.miniStat}>
                  <View style={[s.miniDot, { backgroundColor: '#10B981' }]} />
                  <Text style={s.miniLabel}>Орлого</Text>
                  <Text style={[s.miniVal, { color: '#10B981' }]}>{formatCurrency(item.inflow.amount)}</Text>
                </View>
                <View style={s.miniStat}>
                  <View style={[s.miniDot, { backgroundColor: '#EF4444' }]} />
                  <Text style={s.miniLabel}>Зарлага</Text>
                  <Text style={[s.miniVal, { color: '#EF4444' }]}>{formatCurrency(item.outflow.amount)}</Text>
                </View>
              </View>

              {expanded && detail && (
                <View style={s.detail}>
                  {detail.payments?.length > 0 && (
                    <View style={s.detailSection}>
                      <Text style={[s.detailTitle, { color: '#10B981' }]}>Орлого ({detail.payments.length})</Text>
                      {detail.payments.map((p: any) => (
                        <View key={p.id} style={s.txRow}>
                          <Text style={s.txName}>{p.customer?.storeName || '-'}</Text>
                          <Text style={[s.txAmount, { color: '#10B981' }]}>+{formatCurrency(p.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {detail.supplierPayments?.length > 0 && (
                    <View style={s.detailSection}>
                      <Text style={[s.detailTitle, { color: '#EF4444' }]}>Зарлага ({detail.supplierPayments.length})</Text>
                      {detail.supplierPayments.map((p: any) => (
                        <View key={p.id} style={s.txRow}>
                          <Text style={s.txName}>{p.supplier?.name || '-'}</Text>
                          <Text style={[s.txAmount, { color: '#EF4444' }]}>-{formatCurrency(p.amount)}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                  {(!detail.payments?.length && !detail.supplierPayments?.length) && (
                    <Text style={{ fontSize: 12, color: '#8E8E93', textAlign: 'center', paddingVertical: 12 }}>Гүйлгээ байхгүй</Text>
                  )}
                </View>
              )}

              <View style={{ alignItems: 'center', paddingTop: 4 }}>
                <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#8E8E93" />
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  statRow: { flexDirection: 'row', gap: 8, marginTop: 12, marginBottom: 12 },
  statCard: { flex: 1, borderRadius: 14, borderWidth: 1, padding: 12, alignItems: 'center', gap: 4 },
  statVal: { fontSize: 14, fontWeight: '800' },
  statLabel: { fontSize: 10, color: '#8E8E93', fontWeight: '600' },
  empty: { alignItems: 'center', paddingVertical: 40 },
  emptyText: { fontSize: 14, color: '#8E8E93', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 14, marginBottom: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 },
  bankName: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  accNum: { fontSize: 11, color: '#8E8E93', marginTop: 2, fontFamily: 'monospace' },
  balance: { fontSize: 16, fontWeight: '800', color: '#1C1C1E' },
  miniStats: { flexDirection: 'row', gap: 12 },
  miniStat: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  miniDot: { width: 8, height: 8, borderRadius: 4 },
  miniLabel: { fontSize: 11, color: '#8E8E93', fontWeight: '500' },
  miniVal: { fontSize: 12, fontWeight: '700' },
  detail: { marginTop: 10, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0' },
  detailSection: { marginBottom: 8 },
  detailTitle: { fontSize: 11, fontWeight: '700', marginBottom: 4 },
  txRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4 },
  txName: { fontSize: 12, color: '#4A4D5C', flex: 1 },
  txAmount: { fontSize: 12, fontWeight: '700' },
});
