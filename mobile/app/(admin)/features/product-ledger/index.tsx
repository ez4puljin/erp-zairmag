import React, { useEffect, useState } from 'react';
import { View, ScrollView, Text, StyleSheet, RefreshControl, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader, FormField, LoadingState, ErrorState, DateRangePicker, EmptyState } from '@/src/components/admin';
import api from '@/src/lib/api';
import { formatCurrency, formatDate } from '@/src/lib/format';
import { primaryBarcode } from '@/src/lib/barcode';

const UNIT_LABELS: Record<string, string> = { PIECE: 'ш', BOX: 'хайрцаг', KG: 'кг', LITER: 'л', PACK: 'баглаа' };

function isoDate(d: Date) { return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`; }
const fmt = (n: number) => Number(n ?? 0).toLocaleString('mn-MN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });

export default function ProductLedgerScreen() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
  const [dateFrom, setDateFrom] = useState(isoDate(firstDay));
  const [dateTo, setDateTo] = useState(isoDate(today));
  const [productId, setProductId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/api/products?limit=200').then(r => setProducts(r.data?.data ?? r.data ?? [])).catch(() => {});
    api.get('/api/categories?limit=100').then(r => setCategories(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const fetchData = async () => {
    if (!dateFrom || !dateTo) return;
    setError(null);
    try {
      let url = `/api/product-ledger?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      if (productId) url += `&productId=${productId}`;
      if (categoryId) url += `&categoryId=${categoryId}`;
      const res = await api.get(url);
      setData(res.data);
      setExpanded(new Set());
    } catch (e: any) {
      setError(e?.response?.data?.message || 'Алдаа гарлаа');
    } finally { setLoading(false); setRefreshing(false); }
  };

  const handleSearch = () => { setLoading(true); fetchData(); };

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const productOptions = [
    { label: 'Бүх бараа', value: '' },
    ...products.map((p: any) => ({ label: `${primaryBarcode(p) ?? '—'} - ${p.name}`, value: p.id })),
  ];
  const categoryOptions = [
    { label: 'Бүх ангилал', value: '' },
    ...categories.map((c: any) => ({ label: c.name, value: c.id })),
  ];

  return (
    <View style={st.container}>
      <ScreenHeader title="Бараа материалын тайлан" />

      {/* Filter card */}
      <View style={st.filterCard}>
        <DateRangePicker from={dateFrom} to={dateTo} onChange={(f, t) => { setDateFrom(f); setDateTo(t); }} />
        <View style={{ marginTop: 8 }}>
          <FormField label="Бараа" value={productId} onChange={setProductId} type="select" options={productOptions} placeholder="Бүх бараа" />
          <FormField label="Ангилал" value={categoryId} onChange={setCategoryId} type="select" options={categoryOptions} placeholder="Бүх ангилал" />
        </View>
        <View style={{ paddingHorizontal: 12, marginTop: 4 }}>
          <TouchableOpacity style={st.searchBtn} onPress={handleSearch} disabled={loading}>
            <Ionicons name="search" size={16} color="#fff" />
            <Text style={st.searchText}>{loading ? 'Хайж байна...' : 'Тайлан харах'}</Text>
          </TouchableOpacity>
        </View>
      </View>

      {loading ? (
        <LoadingState />
      ) : error ? (
        <ErrorState message={error} onRetry={fetchData} />
      ) : !data ? (
        <EmptyState
          icon="document-text-outline"
          title="Тайлан"
          message="Огноо болон бараа сонгоод 'Тайлан харах' товч дарна уу"
        />
      ) : (
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingBottom: 40, paddingHorizontal: 12 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />}
        >
          {/* Totals card */}
          {data.totals && (
            <View style={st.totalsCard}>
              <Text style={st.totalsTitle}>НИЙТ ДҮН</Text>
              <View style={st.totalsRow}>
                <View style={st.totalsCol}>
                  <Text style={st.totalsLabel}>Эхний үлдэгдэл</Text>
                  <Text style={st.totalsValue}>{fmt(data.totals.openingQty)}</Text>
                  <Text style={st.totalsAmount}>{formatCurrency(data.totals.openingAmount)}</Text>
                </View>
                <View style={st.totalsCol}>
                  <Text style={st.totalsLabel}>Орлого</Text>
                  <Text style={[st.totalsValue, { color: '#34C759' }]}>{fmt(data.totals.incomeQty)}</Text>
                  <Text style={[st.totalsAmount, { color: '#34C759' }]}>{formatCurrency(data.totals.incomeAmount)}</Text>
                </View>
              </View>
              <View style={st.totalsRow}>
                <View style={st.totalsCol}>
                  <Text style={st.totalsLabel}>Зарлага</Text>
                  <Text style={[st.totalsValue, { color: '#FF3B30' }]}>{fmt(data.totals.expenseQty)}</Text>
                  <Text style={[st.totalsAmount, { color: '#FF3B30' }]}>{formatCurrency(data.totals.expenseAmount)}</Text>
                </View>
                <View style={st.totalsCol}>
                  <Text style={st.totalsLabel}>Эцсийн үлдэгдэл</Text>
                  <Text style={[st.totalsValue, { color: '#007AFF' }]}>{fmt(data.totals.closingQty)}</Text>
                  <Text style={[st.totalsAmount, { color: '#007AFF' }]}>{formatCurrency(data.totals.closingAmount)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Products list */}
          <Text style={st.sectionTitle}>БАРААНУУД ({(data.products ?? []).length})</Text>
          {(data.products ?? []).map((item: any) => {
            const isExpanded = expanded.has(item.product.id);
            const hasTx = item.transactions && item.transactions.length > 0;
            return (
              <View key={item.product.id} style={[st.prodCard, isExpanded && st.prodCardActive]}>
                <TouchableOpacity onPress={() => hasTx && toggle(item.product.id)} activeOpacity={0.7}>
                  <View style={st.prodHeader}>
                    <View style={{ flex: 1 }}>
                      <Text style={st.prodSku}>{primaryBarcode(item.product) ?? '—'}</Text>
                      <Text style={st.prodName}>{item.product.name}</Text>
                      <Text style={st.prodUnit}>Нэгж: {UNIT_LABELS[item.product.unit] || item.product.unit} · Өртөг: {formatCurrency(item.unitCost)}</Text>
                    </View>
                    {hasTx && (
                      <Ionicons
                        name={isExpanded ? 'chevron-up' : 'chevron-down'}
                        size={18} color="#8E8E93"
                      />
                    )}
                  </View>

                  <View style={st.statRow}>
                    <View style={st.statCell}>
                      <Text style={st.statLabel}>Эхний</Text>
                      <Text style={st.statQty}>{fmt(item.openingQty)}</Text>
                      <Text style={st.statAmount}>{formatCurrency(item.openingAmount)}</Text>
                    </View>
                    <View style={[st.statCell, st.borderL]}>
                      <Text style={st.statLabel}>Орлого</Text>
                      <Text style={[st.statQty, { color: '#34C759' }]}>+{fmt(item.incomeQty)}</Text>
                      <Text style={[st.statAmount, { color: '#34C759' }]}>{formatCurrency(item.incomeAmount)}</Text>
                    </View>
                  </View>
                  <View style={st.statRow}>
                    <View style={st.statCell}>
                      <Text style={st.statLabel}>Зарлага</Text>
                      <Text style={[st.statQty, { color: '#FF3B30' }]}>−{fmt(item.expenseQty)}</Text>
                      <Text style={[st.statAmount, { color: '#FF3B30' }]}>{formatCurrency(item.expenseAmount)}</Text>
                    </View>
                    <View style={[st.statCell, st.borderL]}>
                      <Text style={st.statLabel}>Эцсийн</Text>
                      <Text style={[st.statQty, { color: '#007AFF' }]}>{fmt(item.closingQty)}</Text>
                      <Text style={[st.statAmount, { color: '#007AFF', fontWeight: '800' }]}>{formatCurrency(item.closingAmount)}</Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Transaction details */}
                {isExpanded && hasTx && (
                  <View style={st.txContainer}>
                    <Text style={st.txTitle}>ХӨДӨЛГӨӨН</Text>
                    {item.transactions.map((tx: any, idx: number) => (
                      <View key={idx} style={st.txRow}>
                        <View style={{ flex: 1 }}>
                          <Text style={st.txDesc}>{tx.description}</Text>
                          <Text style={st.txDate}>{formatDate(tx.date)}</Text>
                        </View>
                        <View style={{ alignItems: 'flex-end' }}>
                          {tx.incomeQty > 0 ? (
                            <>
                              <Text style={[st.txQty, { color: '#34C759' }]}>+{fmt(tx.incomeQty)}</Text>
                              <Text style={[st.txAmount, { color: '#34C759' }]}>{formatCurrency(tx.incomeAmount)}</Text>
                            </>
                          ) : tx.expenseQty > 0 ? (
                            <>
                              <Text style={[st.txQty, { color: '#FF3B30' }]}>−{fmt(tx.expenseQty)}</Text>
                              <Text style={[st.txAmount, { color: '#FF3B30' }]}>{formatCurrency(tx.expenseAmount)}</Text>
                            </>
                          ) : null}
                          <Text style={st.txRunning}>Үлд: {fmt(tx.runningQty)}</Text>
                        </View>
                      </View>
                    ))}
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
  filterCard: { backgroundColor: '#fff', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0' },
  searchBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 12, marginTop: 4 },
  searchText: { fontSize: 14, fontWeight: '700', color: '#fff' },

  totalsCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#E8ECF0' },
  totalsTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 10 },
  totalsRow: { flexDirection: 'row', marginBottom: 8 },
  totalsCol: { flex: 1, paddingHorizontal: 4 },
  totalsLabel: { fontSize: 10, fontWeight: '600', color: '#8E8E93', textTransform: 'uppercase' },
  totalsValue: { fontSize: 16, fontWeight: '800', color: '#1C1C1E', marginTop: 2 },
  totalsAmount: { fontSize: 12, fontWeight: '600', color: '#1C1C1E', marginTop: 1 },

  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginTop: 16, marginBottom: 8, marginLeft: 4 },

  prodCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  prodCardActive: { borderColor: '#007AFF40', backgroundColor: '#007AFF03' },
  prodHeader: { flexDirection: 'row', alignItems: 'flex-start', marginBottom: 10 },
  prodSku: { fontSize: 11, fontWeight: '700', color: '#007AFF', fontFamily: 'monospace' },
  prodName: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginTop: 2 },
  prodUnit: { fontSize: 11, color: '#8E8E93', marginTop: 2 },

  statRow: { flexDirection: 'row', marginTop: 6 },
  statCell: { flex: 1, paddingHorizontal: 8 },
  borderL: { borderLeftWidth: StyleSheet.hairlineWidth, borderLeftColor: '#E8ECF0' },
  statLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93', textTransform: 'uppercase', letterSpacing: 0.3 },
  statQty: { fontSize: 14, fontWeight: '700', color: '#1C1C1E', marginTop: 2 },
  statAmount: { fontSize: 11, color: '#8E8E93', marginTop: 1 },

  txContainer: { marginTop: 12, paddingTop: 10, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0' },
  txTitle: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3, marginBottom: 6 },
  txRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 6, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  txDesc: { fontSize: 12, color: '#1C1C1E', fontWeight: '500' },
  txDate: { fontSize: 10, color: '#AEAEB2', marginTop: 1 },
  txQty: { fontSize: 13, fontWeight: '700' },
  txAmount: { fontSize: 11, fontWeight: '500', marginTop: 1 },
  txRunning: { fontSize: 9, color: '#AEAEB2', marginTop: 2 },
});
