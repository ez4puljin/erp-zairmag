import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ProductPicker, QuantitySheet, BarcodeScannerModal, normalizeCode,
  type PickerProduct, type QuantityResult,
} from '../../src/components/admin';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Modal,
  TextInput,
  Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';

interface TruckLoadItem {
  id: string;
  product: { id: string; name: string; sku: string; sellingPrice: number | string };
  loadedQty: number;
  soldQty: number;
  returnedQty?: number;
  damagedQty?: number;
}

interface TruckSale {
  id: string;
  saleNumber?: number;
  customer?: { storeName: string; phone?: string };
  totalAmount: number | string;
  paymentMethod?: string;
  createdAt: string;
  items?: { product?: { name: string }; quantity: number; unitPrice: number | string; lineTotal: number | string }[];
}

interface TruckLoad {
  id: string;
  loadNumber: number;
  status: string;
  items: TruckLoadItem[];
  sales?: TruckSale[];
  totalSalesAmount?: number;
}

export default function LoadScreen() {
  const [truckLoad, setTruckLoad] = useState<TruckLoad | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  // Нэмэлт ачилт
  const [products, setProducts] = useState<PickerProduct[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [pendingProduct, setPendingProduct] = useState<PickerProduct | null>(null);
  const [addLines, setAddLines] = useState<{ productId: string; name: string; qty: number }[]>([]);
  const [submittingAdd, setSubmittingAdd] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);
  const [completing, setCompleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      const { data } = await api.get('/api/truck-loads/driver/active');
      setTruckLoad(data);
    } catch (err: any) {
      if (err?.response?.status === 404) {
        setTruckLoad(null);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    if (!modalVisible || products.length > 0) return;
    api.get('/api/products?limit=100')
      .then(r => setProducts(r.data?.data ?? r.data ?? []))
      .catch(() => {});
  }, [modalVisible, products.length]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchData();
  };

  const totalLoaded = (truckLoad?.items ?? []).reduce((s, i) => s + (i.loadedQty ?? 0), 0);
  const totalSold = (truckLoad?.items ?? []).reduce((s, i) => s + (i.soldQty ?? 0), 0);
  const totalRemaining = totalLoaded - totalSold;
  const sales = truckLoad?.sales ?? [];
  const salesAmount = truckLoad?.totalSalesAmount || sales.reduce((s, sale) => s + Number(sale.totalAmount ?? 0), 0);
  const [expandedSale, setExpandedSale] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<'default' | 'sold_desc' | 'sold_asc' | 'remain_desc' | 'remain_asc'>('default');

  const sortedItems = useMemo(() => {
    const items = [...(truckLoad?.items ?? [])];
    switch (sortBy) {
      case 'sold_desc': return items.sort((a, b) => b.soldQty - a.soldQty);
      case 'sold_asc': return items.sort((a, b) => a.soldQty - b.soldQty);
      case 'remain_desc': return items.sort((a, b) => (b.loadedQty - b.soldQty) - (a.loadedQty - a.soldQty));
      case 'remain_asc': return items.sort((a, b) => (a.loadedQty - a.soldQty) - (b.loadedQty - b.soldQty));
      default: return items;
    }
  }, [truckLoad?.items, sortBy]);

  /** Нэмэлт ачилтын жагсаалтад бараа нэмнэ. */
  const handlePickQty = (result: QuantityResult) => {
    if (!pendingProduct) return;
    setAddLines(prev => {
      const idx = prev.findIndex(l => l.productId === pendingProduct.id);
      if (idx >= 0) {
        const next = [...prev];
        next[idx] = { ...next[idx], qty: next[idx].qty + result.quantity };
        return next;
      }
      return [...prev, { productId: pendingProduct.id, name: pendingProduct.name, qty: result.quantity }];
    });
    setPendingProduct(null);
    setPickerOpen(false);
  };

  /** Зураасан кодыг SKU-тай тааруулна. */
  const handleScanned = (code: string) => {
    setScannerOpen(false);
    const target = normalizeCode(code);
    const found = products.find(p => normalizeCode(p.sku ?? '') === target);
    if (!found) {
      Alert.alert('Олдсонгүй', `"${code}" кодтой бараа бүртгэлгүй байна.`);
      return;
    }
    setPickerOpen(false);
    setPendingProduct(found);
  };

  const handleSubmitAdditional = async () => {
    if (!truckLoad || addLines.length === 0) return;
    setSubmittingAdd(true);
    try {
      await api.post(`/api/truck-loads/${truckLoad.id}/add-items`, {
        items: addLines.map(l => ({ productId: l.productId, loadedQty: l.qty })),
      });
      setAddLines([]);
      setModalVisible(false);
      await fetchData();
      Alert.alert('Амжилттай', 'Нэмэлт ачилт бүртгэгдлээ.');
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Алдаа гарлаа');
    } finally {
      setSubmittingAdd(false);
    }
  };

  const handleRequestCompletion = () => {
    if (!truckLoad) return;
    Alert.alert(
      'Ачилт дуусгах',
      'Та ачилтаа дуусгахаар Админд хүсэлт илгээх үү? Админ бараа болгоны үлдэгдлийг шалгаад баталгаажуулах хүртэл та шинэ борлуулалт хийх боломжгүй болно.',
      [
        { text: 'Болих', style: 'cancel' },
        {
          text: 'Илгээх',
          style: 'destructive',
          onPress: async () => {
            setCompleting(true);
            try {
              await api.post(`/api/truck-loads/${truckLoad.id}/request-completion`);
              Alert.alert('Амжилттай', 'Хүсэлт илгээгдлээ. Админ баталгаажуулахыг хүлээнэ үү.');
              fetchData();
            } catch (e: any) {
              Alert.alert('Алдаа', e?.response?.data?.message || 'Хүсэлт илгээхэд алдаа гарлаа');
            } finally {
              setCompleting(false);
            }
          },
        },
      ],
    );
  };

  const isCompletionRequested = truckLoad?.status === 'COMPLETION_REQUESTED';

  if (loading) {
    return (
      <SafeAreaView style={styles.centered}>
        <ActivityIndicator size="large" color="#007AFF" />
      </SafeAreaView>
    );
  }

  if (!truckLoad) {
    return (
      <SafeAreaView style={styles.centered}>
        <Text style={styles.emptyIcon}>🚚</Text>
        <Text style={styles.emptyTitle}>Идэвхтэй ачилт байхгүй</Text>
        <Text style={styles.emptySubtitle}>Агуулахаас ачилт хүлээн авна уу</Text>
        <TouchableOpacity style={styles.refreshBtn} onPress={() => { setLoading(true); fetchData(); }}>
          <Text style={styles.refreshBtnText}>Шинэчлэх</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView
        style={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <Text style={styles.header}>Ачилт #{truckLoad.loadNumber}</Text>

        {/* Stat Cards */}
        <View style={styles.statsGrid}>
          <View style={[styles.statCard, { backgroundColor: '#E8F0FE' }]}>
            <Text style={[styles.statCardValue, { color: '#007AFF' }]}>{totalLoaded}</Text>
            <Text style={styles.statCardLabel}>Нийт ачсан</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#E8F8EE' }]}>
            <Text style={[styles.statCardValue, { color: '#34C759' }]}>{totalSold}</Text>
            <Text style={styles.statCardLabel}>Зарагдсан</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#FFF3E0' }]}>
            <Text style={[styles.statCardValue, { color: '#FF9500' }]}>{totalRemaining}</Text>
            <Text style={styles.statCardLabel}>Үлдэгдэл</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: '#F3E8FF' }]}>
            <Text style={[styles.statCardValue, { color: '#AF52DE' }]}>₮{salesAmount.toLocaleString()}</Text>
            <Text style={styles.statCardLabel}>Борлуулалт</Text>
          </View>
        </View>

        {/* Product List */}
        <View style={styles.card}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={styles.cardTitle}>Барааны жагсаалт</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 10 }} contentContainerStyle={{ gap: 6 }}>
            {([
              { key: 'default', label: 'Бүгд' },
              { key: 'sold_desc', label: 'Их зарсан ↓' },
              { key: 'sold_asc', label: 'Бага зарсан ↑' },
              { key: 'remain_desc', label: 'Их үлдсэн ↓' },
              { key: 'remain_asc', label: 'Бага үлдсэн ↑' },
            ] as const).map(opt => (
              <TouchableOpacity key={opt.key} onPress={() => setSortBy(opt.key)}
                style={{ paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8, backgroundColor: sortBy === opt.key ? '#007AFF' : '#F2F2F7' }}>
                <Text style={{ fontSize: 12, fontWeight: '600', color: sortBy === opt.key ? '#fff' : '#4A4D5C' }}>{opt.label}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
          {sortedItems.map((item) => {
            const progress = item.loadedQty > 0 ? item.soldQty / item.loadedQty : 0;
            return (
              <View key={item.id} style={styles.productRow}>
                <View style={styles.productInfo}>
                  <Text style={styles.productName}>{item.product.name}</Text>
                  <View style={styles.productQtyRow}>
                    <Text style={styles.qtyLabel}>Ачсан: <Text style={styles.qtyValue}>{item.loadedQty}</Text></Text>
                    <Text style={styles.qtyLabel}>Зарсан: <Text style={[styles.qtyValue, { color: '#34C759' }]}>{item.soldQty}</Text></Text>
                    <Text style={styles.qtyLabel}>Үлдсэн: <Text style={[styles.qtyValue, { color: '#FF9500' }]}>{(item.loadedQty - item.soldQty)}</Text></Text>
                  </View>
                  <View style={styles.progressBar}>
                    <View style={[styles.progressFill, { width: `${Math.min(progress * 100, 100)}%` }]} />
                  </View>
                </View>
              </View>
            );
          })}
        </View>

        {/* Sales Summary */}
        {sales.length > 0 && (
          <View style={styles.card}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={styles.cardTitle}>Борлуулалтын задаргаа</Text>
              <Text style={{ fontSize: 14, fontWeight: '700', color: '#AF52DE' }}>{sales.length} борлуулалт</Text>
            </View>

            <TouchableOpacity
              style={styles.salesToggle}
              activeOpacity={0.6}
              onPress={() => setSalesOpen(v => !v)}
            >
              <Text style={styles.salesToggleText}>
                {salesOpen ? 'Хураах' : 'Борлуулалтуудыг харах'}
              </Text>
              <Text style={styles.salesToggleChevron}>{salesOpen ? '⌃' : '⌄'}</Text>
            </TouchableOpacity>

            {salesOpen && sales.map((sale) => {
              const isExpanded = expandedSale === sale.id;
              const pmLabels: Record<string, string> = { CASH: 'Бэлэн', BANK_TRANSFER: 'Шилжүүлэг', CARD: 'Карт', CREDIT: 'Зээл', COMBINED: 'Хосолсон' };
              return (
                <TouchableOpacity key={sale.id} onPress={() => setExpandedSale(isExpanded ? null : sale.id)} activeOpacity={0.7}>
                  <View style={[styles.saleRow, isExpanded && { backgroundColor: '#F9F9FB', borderRadius: 10, marginHorizontal: -4, paddingHorizontal: 4 }]}>
                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E' }}>
                          #{sale.saleNumber || '-'} {sale.customer?.storeName || ''}
                        </Text>
                      </View>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 2 }}>
                        <Text style={{ fontSize: 11, color: '#8E8E93' }}>
                          {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}
                        </Text>
                        {sale.paymentMethod && (
                          <View style={{ backgroundColor: '#007AFF15', borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 }}>
                            <Text style={{ fontSize: 10, fontWeight: '600', color: '#007AFF' }}>{pmLabels[sale.paymentMethod] || sale.paymentMethod}</Text>
                          </View>
                        )}
                      </View>
                    </View>
                    <View style={{ alignItems: 'flex-end' }}>
                      <Text style={{ fontSize: 15, fontWeight: '700', color: '#1C1C1E' }}>₮{Number(sale.totalAmount).toLocaleString()}</Text>
                      <Ionicons name={isExpanded ? 'chevron-up' : 'chevron-down'} size={14} color="#AEAEB2" style={{ marginTop: 2 }} />
                    </View>
                  </View>
                  {isExpanded && sale.items && sale.items.length > 0 && (
                    <View style={{ paddingLeft: 8, paddingBottom: 8 }}>
                      {sale.items.map((si, idx) => (
                        <View key={idx} style={{ flexDirection: 'row', paddingVertical: 4, borderBottomWidth: idx < sale.items!.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: '#E8ECF0' }}>
                          <Text style={{ flex: 1, fontSize: 12, color: '#4A4D5C' }} numberOfLines={1}>{si.product?.name || '-'}</Text>
                          <Text style={{ fontSize: 12, color: '#8E8E93', marginRight: 8 }}>×{si.quantity}</Text>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1C1C1E', width: 70, textAlign: 'right' }}>₮{Number(si.lineTotal).toLocaleString()}</Text>
                        </View>
                      ))}
                    </View>
                  )}
                </TouchableOpacity>
              );
            })}
            {/* Payment method breakdown */}
            {(() => {
              const pmLabels: Record<string, string> = { CASH: 'Бэлэн', BANK_TRANSFER: 'Шилжүүлэг', CARD: 'Карт', CREDIT: 'Зээл', COMBINED: 'Хосолсон' };
              const pmColors: Record<string, string> = { CASH: '#34C759', BANK_TRANSFER: '#007AFF', CARD: '#AF52DE', CREDIT: '#FF9500', COMBINED: '#FF3B30' };
              const byMethod: Record<string, number> = {};
              sales.forEach(s => {
                const m = s.paymentMethod || 'CASH';
                byMethod[m] = (byMethod[m] || 0) + Number(s.totalAmount ?? 0);
              });
              const entries = Object.entries(byMethod).filter(([, v]) => v > 0);
              if (entries.length === 0) return null;
              return (
                <View style={{ borderTopWidth: 1, borderTopColor: '#E8ECF0', marginTop: 8, paddingTop: 10 }}>
                  {entries.map(([method, amount]) => (
                    <View key={method} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: pmColors[method] || '#8E8E93' }} />
                        <Text style={{ fontSize: 13, color: '#4A4D5C', fontWeight: '500' }}>{pmLabels[method] || method}</Text>
                      </View>
                      <Text style={{ fontSize: 14, fontWeight: '700', color: '#1C1C1E' }}>₮{amount.toLocaleString()}</Text>
                    </View>
                  ))}
                </View>
              );
            })()}
            <View style={{ borderTopWidth: 1, borderTopColor: '#E8ECF0', marginTop: 8, paddingTop: 10, flexDirection: 'row', justifyContent: 'space-between' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1C1E' }}>Нийт борлуулалт</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#AF52DE' }}>₮{salesAmount.toLocaleString()}</Text>
            </View>
          </View>
        )}

        {/* Waiting banner */}
        {isCompletionRequested && (
          <View style={styles.waitingBanner}>
            <Ionicons name="time-outline" size={22} color="#FF9500" />
            <View style={{ flex: 1 }}>
              <Text style={styles.waitingTitle}>Ачилт дуусгах хүсэлт хүлээгдэж байна</Text>
              <Text style={styles.waitingText}>Админ баталгаажуулах хүртэл шинэ борлуулалт хийх боломжгүй</Text>
            </View>
          </View>
        )}

        {/* Additional Items Button */}
        <TouchableOpacity style={styles.additionalBtn} onPress={() => setModalVisible(true)}>
          <Ionicons name="add-circle-outline" size={18} color="#fff" />
          <Text style={styles.additionalBtnText}>Нэмэлт бараа авах</Text>
        </TouchableOpacity>

        {/* Complete Load Button */}
        <TouchableOpacity
          style={[styles.completeBtn, isCompletionRequested && { opacity: 0.5 }]}
          onPress={handleRequestCompletion}
          disabled={isCompletionRequested || completing}
        >
          {completing ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Ionicons name={isCompletionRequested ? 'hourglass-outline' : 'checkmark-circle-outline'} size={20} color="#fff" />
          )}
          <Text style={styles.completeBtnText}>
            {isCompletionRequested ? 'Хүсэлт илгээгдсэн — хүлээгдэж байна' : 'Ачилт дуусгах'}
          </Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Нэмэлт ачилт */}
      <Modal visible={modalVisible} animationType="slide" transparent>
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Нэмэлт ачилт</Text>

            {addLines.length === 0 ? (
              <Text style={styles.addHint}>Агуулахаас нэмж авах барааг сонгоно уу</Text>
            ) : (
              addLines.map((l) => (
                <View key={l.productId} style={styles.addRow}>
                  <Text style={styles.addName} numberOfLines={1}>{l.name}</Text>
                  <Text style={styles.addQty}>{l.qty}ш</Text>
                  <TouchableOpacity onPress={() => setAddLines(p => p.filter(x => x.productId !== l.productId))}>
                    <Text style={styles.addRemove}>✕</Text>
                  </TouchableOpacity>
                </View>
              ))
            )}

            <View style={styles.addActions}>
              <TouchableOpacity style={styles.addSearchBtn} onPress={() => setPickerOpen(true)}>
                <Text style={styles.addSearchText}>🔍  Бараа хайх</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.addScanBtn} onPress={() => setScannerOpen(true)}>
                <Text style={styles.addScanText}>▥</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelBtn}
                onPress={() => { setModalVisible(false); setAddLines([]); }}
              >
                <Text style={styles.modalCancelText}>Болих</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSubmitBtn, (addLines.length === 0 || submittingAdd) && { opacity: 0.4 }]}
                onPress={handleSubmitAdditional}
                disabled={addLines.length === 0 || submittingAdd}
              >
                <Text style={styles.modalSubmitText}>
                  {submittingAdd ? 'Нэмж байна...' : `Ачилтад нэмэх${addLines.length ? ` (${addLines.reduce((s, l) => s + l.qty, 0)}ш)` : ''}`}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ProductPicker
        visible={pickerOpen}
        products={products}
        onClose={() => setPickerOpen(false)}
        onSelect={p => setPendingProduct(p)}
        onScanRequest={() => setScannerOpen(true)}
      />

      <QuantitySheet
        product={pendingProduct}
        onCancel={() => setPendingProduct(null)}
        onConfirm={handlePickQty}
        confirmLabel="Жагсаалтад нэмэх"
      />

      <BarcodeScannerModal
        visible={scannerOpen}
        onClose={() => setScannerOpen(false)}
        onScanned={handleScanned}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  salesToggle: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, marginBottom: 2 },
  salesToggleText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
  salesToggleChevron: { fontSize: 15, color: '#007AFF', lineHeight: 16 },

  addHint: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 18 },
  addRow: { flexDirection: 'row', alignItems: 'center', gap: 10, paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F0F2F5' },
  addName: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  addQty: { fontSize: 15, fontWeight: '700', color: '#5856D6' },
  addRemove: { fontSize: 17, color: '#FF3B30', paddingHorizontal: 4 },
  addActions: { flexDirection: 'row', gap: 8, marginTop: 12 },
  addSearchBtn: { flex: 1, alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, backgroundColor: '#5856D612', borderWidth: 1, borderColor: '#5856D630' },
  addSearchText: { fontSize: 15, fontWeight: '600', color: '#5856D6' },
  addScanBtn: { width: 52, alignItems: 'center', justifyContent: 'center', height: 46, borderRadius: 12, backgroundColor: '#5856D6' },
  addScanText: { fontSize: 19, color: '#fff' },

  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { flex: 1 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F2F2F7' },
  header: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  emptyIcon: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#1C1C1E', marginBottom: 4 },
  emptySubtitle: { fontSize: 14, color: '#8E8E93' },
  refreshBtn: { marginTop: 16, backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 24, paddingVertical: 12 },
  refreshBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 12, gap: 8, marginBottom: 12 },
  statCard: {
    width: '47%',
    borderRadius: 12,
    padding: 16,
    flexGrow: 1,
  },
  statCardValue: { fontSize: 20, fontWeight: '700' },
  statCardLabel: { fontSize: 12, color: '#8E8E93', marginTop: 4 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 12 },
  productRow: { paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E', marginBottom: 6 },
  productQtyRow: { flexDirection: 'row', gap: 12, marginBottom: 8 },
  qtyLabel: { fontSize: 13, color: '#8E8E93' },
  qtyValue: { fontWeight: '700', color: '#1C1C1E' },
  progressBar: { height: 6, backgroundColor: '#E5E5EA', borderRadius: 3, overflow: 'hidden' },
  progressFill: { height: '100%', backgroundColor: '#34C759', borderRadius: 3 },
  saleRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E5E5EA' },
  additionalBtn: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FF9500',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  additionalBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  completeBtn: {
    marginHorizontal: 16,
    backgroundColor: '#34C759',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  completeBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  waitingBanner: {
    marginHorizontal: 16,
    marginBottom: 10,
    backgroundColor: '#FFF7E6',
    borderRadius: 12,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#FFD699',
  },
  waitingTitle: { fontSize: 14, fontWeight: '700', color: '#FF6D00' },
  waitingText: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24, paddingBottom: 40 },
  modalTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 16 },
  modalInput: {
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 14,
    fontSize: 15,
    color: '#1C1C1E',
    minHeight: 100,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  modalCancelBtn: { flex: 1, backgroundColor: '#F2F2F7', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalCancelText: { fontSize: 15, fontWeight: '600', color: '#8E8E93' },
  modalSubmitBtn: { flex: 1, backgroundColor: '#007AFF', borderRadius: 10, paddingVertical: 14, alignItems: 'center' },
  modalSubmitText: { fontSize: 15, fontWeight: '600', color: '#fff' },
});
