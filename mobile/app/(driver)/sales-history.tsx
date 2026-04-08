import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, RefreshControl, Platform, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ViewShot from 'react-native-view-shot';
import api from '../../src/lib/api';
import { SaleReceipt, widthForPaper } from '../../src/components/PrintableReceipt';
import { fetchReceiptSettings, loadCachedSettings, DEFAULT_SETTINGS, type ReceiptSettings } from '../../src/lib/receipt-settings';
import { printImageBase64, feedLines, getSavedPrinter, connectPrinter } from '../../src/lib/printer';

interface SaleItem {
  id: string;
  product: { name: string };
  quantity: number;
  unitPrice: number | string;
  lineTotal: number | string;
}

interface Sale {
  id: string;
  saleNumber?: number;
  customer?: { storeName: string; contactName?: string; phone?: string };
  totalAmount: number | string;
  paymentMethod: string;
  createdAt: string;
  items: SaleItem[];
  notes?: string | null;
}

interface TruckLoadSummary {
  id: string;
  loadNumber: number;
  loadDate: string;
  status: string;
  createdAt?: string;
  driver?: { firstName?: string; lastName?: string; phone?: string };
  sales?: Sale[];
}

// Parse COMBINED:CASH:5000,CARD:3000 from notes field
function parseCombined(notes: string | null | undefined): Array<{ method: string; amount: number }> {
  if (!notes) return [];
  const m = notes.match(/COMBINED:([^|]+)/);
  if (!m) return [];
  return m[1].trim().split(',').map(p => {
    const [method, amount] = p.split(':').map(s => s.trim());
    return { method, amount: Number(amount) || 0 };
  }).filter(p => p.method && p.amount > 0);
}

const PM: Record<string, { label: string; color: string }> = {
  CASH: { label: 'Бэлэн', color: '#34C759' },
  BANK_TRANSFER: { label: 'Шилжүүлэг', color: '#007AFF' },
  CARD: { label: 'Карт', color: '#AF52DE' },
  CREDIT: { label: 'Зээл', color: '#FF9500' },
  COMBINED: { label: 'Хосолсон', color: '#FF3B30' },
  MOBILE_MONEY: { label: 'Мобайл', color: '#5856D6' },
};

function pmLabel(m: string) { return PM[m]?.label || m; }
function pmColor(m: string) { return PM[m]?.color || '#8E8E93'; }

function formatDate(d: string) {
  const dt = new Date(d);
  return `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
}
function formatTime(d: string) {
  const dt = new Date(d);
  return `${String(dt.getHours()).padStart(2, '0')}:${String(dt.getMinutes()).padStart(2, '0')}`;
}
function isToday(d: string) { return formatDate(d) === formatDate(new Date().toISOString()); }

export default function SalesHistoryScreen() {
  const insets = useSafeAreaInsets();
  const [loads, setLoads] = useState<TruckLoadSummary[]>([]);
  const [selectedLoadId, setSelectedLoadId] = useState<string | null>(null);
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadingSales, setLoadingSales] = useState(false);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(DEFAULT_SETTINGS);
  const [printingSaleId, setPrintingSaleId] = useState<string | null>(null);
  const [printSale, setPrintSale] = useState<Sale | null>(null);
  const customerReceiptRef = useRef<ViewShot>(null);
  const driverReceiptRef = useRef<ViewShot>(null);

  useEffect(() => {
    loadCachedSettings().then(setReceiptSettings);
    fetchReceiptSettings().then(setReceiptSettings).catch(() => {});
  }, []);

  const fetchLoads = useCallback(async () => {
    try {
      const res = await api.get('/api/truck-loads?limit=20&order=desc');
      const data = res.data?.data ?? res.data ?? [];
      const allLoads = Array.isArray(data) ? data : [];
      setLoads(allLoads);
      // Auto-select first (most recent) load
      if (allLoads.length > 0 && !selectedLoadId) {
        setSelectedLoadId(allLoads[0].id);
      }
    } catch { }
    finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => { fetchLoads(); }, [fetchLoads]);

  // Fetch sales when selected load changes
  useEffect(() => {
    if (!selectedLoadId) return;
    setLoadingSales(true);
    setSales([]);
    api.get(`/api/truck-sales/truck-load/${selectedLoadId}`)
      .then(res => setSales(res.data?.data ?? res.data ?? []))
      .catch(() => setSales([]))
      .finally(() => setLoadingSales(false));
  }, [selectedLoadId]);

  const selectedLoad = loads.find(l => l.id === selectedLoadId);

  // Payment breakdown
  const paymentBreakdown = useMemo(() => {
    const map: Record<string, number> = {};
    sales.forEach(s => {
      const m = s.paymentMethod || 'CASH';
      map[m] = (map[m] || 0) + Number(s.totalAmount ?? 0);
    });
    return Object.entries(map).filter(([, v]) => v > 0);
  }, [sales]);

  const totalSales = sales.reduce((s, sale) => s + Number(sale.totalAmount ?? 0), 0);

  const handlePrint = async (sale: Sale) => {
    setPrintingSaleId(sale.id);
    try {
      const saved = await getSavedPrinter();
      if (!saved) {
        Alert.alert('Принтер тохиргоогүй', 'Принтерт холбогдохын тулд POS дэлгэц дээр Bluetooth принтер тохируулна уу.');
        return;
      }
      const connected = await connectPrinter(saved.address);
      if (!connected) return;

      // Trigger offscreen render
      setPrintSale(sale);
      // Give React Native time to render the ViewShot
      await new Promise(r => setTimeout(r, 300));

      const width = widthForPaper(receiptSettings.paperWidth);

      if (customerReceiptRef.current?.capture) {
        const b64 = await customerReceiptRef.current.capture();
        await printImageBase64(b64, width, receiptSettings.paperWidth);
        await feedLines(2);
      }
      if (receiptSettings.printTwoCopies && driverReceiptRef.current?.capture) {
        const b64 = await driverReceiptRef.current.capture();
        await printImageBase64(b64, width, receiptSettings.paperWidth);
        await feedLines(3);
      } else {
        await feedLines(3);
      }

      Alert.alert('Амжилттай', 'Баримт хэвлэгдлээ');
    } catch (e: any) {
      Alert.alert('Хэвлэх алдаа', e?.message || 'Алдаа гарлаа');
    } finally {
      setPrintingSaleId(null);
      setPrintSale(null);
    }
  };

  if (loading) {
    return <View style={[st.centered, { paddingTop: insets.top }]}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  if (loads.length === 0) {
    return (
      <View style={[st.centered, { paddingTop: insets.top }]}>
        <Ionicons name="receipt-outline" size={48} color="#AEAEB2" />
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginTop: 12 }}>Түүх байхгүй</Text>
        <Text style={{ fontSize: 14, color: '#8E8E93', marginTop: 4 }}>Ачилтын борлуулалтын мэдээлэл олдсонгүй</Text>
      </View>
    );
  }

  const printDriverName = `${selectedLoad?.driver?.lastName ?? ''} ${selectedLoad?.driver?.firstName ?? ''}`.trim();

  return (
    <View style={st.container}>
      {/* Hidden ViewShot for printing current sale */}
      {printSale && (
        <View style={{ position: 'absolute', left: -10000, top: 0, width: widthForPaper(receiptSettings.paperWidth) }} pointerEvents="none">
          <ViewShot ref={customerReceiptRef} options={{ format: 'png', quality: 1, result: 'base64' }}>
            <SaleReceipt
              sale={printSale}
              customer={printSale.customer}
              paymentMethod={printSale.paymentMethod}
              copyLabel="ХАРИЛЦАГЧИЙН ХУВЬ"
              driverName={printDriverName}
              driverPhone={selectedLoad?.driver?.phone}
              combinedPayments={printSale.paymentMethod === 'COMBINED' ? parseCombined(printSale.notes) : undefined}
              settings={receiptSettings}
            />
          </ViewShot>
          {receiptSettings.printTwoCopies && (
            <ViewShot ref={driverReceiptRef} options={{ format: 'png', quality: 1, result: 'base64' }}>
              <SaleReceipt
                sale={printSale}
                customer={printSale.customer}
                paymentMethod={printSale.paymentMethod}
                copyLabel="ЖОЛООЧИЙН ХУВЬ"
                driverName={printDriverName}
                driverPhone={selectedLoad?.driver?.phone}
                combinedPayments={printSale.paymentMethod === 'COMBINED' ? parseCombined(printSale.notes) : undefined}
                settings={receiptSettings}
              />
            </ViewShot>
          )}
        </View>
      )}

      {/* Date/Load selector */}
      <View style={[st.dateBar, { paddingTop: insets.top + 8 }]}>
        <Text style={st.dateBarTitle}>Борлуулалтын түүх</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 6, paddingHorizontal: 12, paddingBottom: 10 }}>
          {loads.map(load => {
            const active = load.id === selectedLoadId;
            const today = isToday(load.loadDate || load.createdAt || '');
            return (
              <TouchableOpacity key={load.id} onPress={() => setSelectedLoadId(load.id)}
                style={[st.dateChip, active && st.dateChipActive]}>
                <Text style={[st.dateChipText, active && { color: '#fff' }]}>
                  {today ? 'Өнөөдөр' : formatDate(load.loadDate || '')}
                </Text>
                <Text style={[st.dateChipSub, active && { color: 'rgba(255,255,255,0.7)' }]}>
                  #{load.loadNumber}
                </Text>
              </TouchableOpacity>
            );
          })}
        </ScrollView>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 30 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchLoads(); }} />}>

        {/* Stats */}
        <View style={st.statsRow}>
          <View style={[st.statCard, { backgroundColor: '#007AFF12' }]}>
            <Text style={[st.statVal, { color: '#007AFF' }]}>{sales.length}</Text>
            <Text style={st.statLbl}>Борлуулалт</Text>
          </View>
          <View style={[st.statCard, { backgroundColor: '#34C75912' }]}>
            <Text style={[st.statVal, { color: '#34C759' }]}>₮{totalSales.toLocaleString()}</Text>
            <Text style={st.statLbl}>Нийт дүн</Text>
          </View>
        </View>

        {/* Payment breakdown */}
        {paymentBreakdown.length > 0 && (
          <View style={st.section}>
            <Text style={st.sectionTitle}>ТӨЛБӨРИЙН ХЭЛБЭРЭЭР</Text>
            {paymentBreakdown.map(([method, amount]) => (
              <View key={method} style={st.pmRow}>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                  <View style={[st.pmDot, { backgroundColor: pmColor(method) }]} />
                  <Text style={st.pmLabel}>{pmLabel(method)}</Text>
                </View>
                <Text style={st.pmAmount}>₮{amount.toLocaleString()}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Sales list */}
        <View style={st.section}>
          <Text style={st.sectionTitle}>БОРЛУУЛАЛТЫН ЖАГСААЛТ</Text>
          {loadingSales ? (
            <ActivityIndicator color="#007AFF" style={{ marginVertical: 30 }} />
          ) : sales.length === 0 ? (
            <View style={{ alignItems: 'center', paddingVertical: 30 }}>
              <Ionicons name="receipt-outline" size={36} color="#D1D5DB" />
              <Text style={{ fontSize: 14, color: '#8E8E93', marginTop: 8 }}>Борлуулалт байхгүй</Text>
            </View>
          ) : sales.map(sale => {
            const expanded = expandedId === sale.id;
            return (
              <TouchableOpacity key={sale.id} onPress={() => setExpandedId(expanded ? null : sale.id)} activeOpacity={0.7}
                style={[st.saleCard, expanded && { borderColor: '#007AFF40' }]}>
                <View style={st.saleHeader}>
                  <View style={{ flex: 1 }}>
                    <Text style={st.saleCust}>{sale.customer?.storeName || 'Харилцагч'}</Text>
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 3 }}>
                      <Text style={st.saleTime}>{formatTime(sale.createdAt)}</Text>
                      <View style={[st.pmBadge, { backgroundColor: pmColor(sale.paymentMethod) + '18', borderColor: pmColor(sale.paymentMethod) + '40' }]}>
                        <Text style={[st.pmBadgeText, { color: pmColor(sale.paymentMethod) }]}>{pmLabel(sale.paymentMethod)}</Text>
                      </View>
                      {sale.saleNumber && <Text style={st.saleNum}>#{sale.saleNumber}</Text>}
                    </View>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.saleAmount}>₮{Number(sale.totalAmount).toLocaleString()}</Text>
                    <Ionicons name={expanded ? 'chevron-up' : 'chevron-down'} size={16} color="#AEAEB2" style={{ marginTop: 4 }} />
                  </View>
                </View>
                {expanded && (
                  <View style={st.saleItems}>
                    {sale.items && sale.items.length > 0 && sale.items.map((item, idx) => (
                      <View key={item.id || idx} style={st.saleItemRow}>
                        <Text style={st.saleItemName} numberOfLines={1}>{item.product?.name || '-'}</Text>
                        <Text style={st.saleItemQty}>×{item.quantity}</Text>
                        <Text style={st.saleItemTotal}>₮{Number(item.lineTotal).toLocaleString()}</Text>
                      </View>
                    ))}

                    {/* Combined payment breakdown */}
                    {sale.paymentMethod === 'COMBINED' && (() => {
                      const parts = parseCombined(sale.notes);
                      if (parts.length === 0) return null;
                      return (
                        <View style={st.combinedBox}>
                          <Text style={st.combinedTitle}>Төлбөрийн задаргаа</Text>
                          {parts.map((p, i) => (
                            <View key={i} style={st.combinedRow}>
                              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                                <View style={[st.pmDot, { backgroundColor: pmColor(p.method) }]} />
                                <Text style={{ fontSize: 13, color: '#1C1C1E', fontWeight: '500' }}>{pmLabel(p.method)}</Text>
                              </View>
                              <Text style={{ fontSize: 14, fontWeight: '700', color: '#1C1C1E' }}>₮{p.amount.toLocaleString()}</Text>
                            </View>
                          ))}
                        </View>
                      );
                    })()}

                    {/* Print button */}
                    <TouchableOpacity
                      style={st.printBtn}
                      onPress={(e) => { e.stopPropagation(); handlePrint(sale); }}
                      disabled={printingSaleId === sale.id}
                    >
                      {printingSaleId === sale.id
                        ? <ActivityIndicator color="#fff" size="small" />
                        : <Ionicons name="print-outline" size={18} color="#fff" />}
                      <Text style={st.printBtnText}>
                        {printingSaleId === sale.id ? 'Хэвлэж байна...' : 'Баримт хэвлэх'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                )}
              </TouchableOpacity>
            );
          })}
        </View>
      </ScrollView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA', padding: 32 },

  // Date bar
  dateBar: { backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0', paddingBottom: 0 },
  dateBarTitle: { fontSize: 20, fontWeight: '800', color: '#1C1C1E', paddingHorizontal: 16, marginBottom: 10 },
  dateChip: { backgroundColor: '#F2F2F7', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 8, alignItems: 'center', minWidth: 80 },
  dateChipActive: { backgroundColor: '#007AFF' },
  dateChipText: { fontSize: 13, fontWeight: '700', color: '#1C1C1E' },
  dateChipSub: { fontSize: 10, color: '#8E8E93', marginTop: 1 },

  // Stats
  statsRow: { flexDirection: 'row', gap: 8, paddingHorizontal: 12, paddingTop: 12 },
  statCard: { flex: 1, borderRadius: 14, padding: 14, alignItems: 'center' },
  statVal: { fontSize: 18, fontWeight: '800' },
  statLbl: { fontSize: 11, color: '#8E8E93', marginTop: 2, fontWeight: '600' },

  // Section
  section: { marginHorizontal: 12, marginTop: 12, backgroundColor: '#fff', borderRadius: 16, padding: 14 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 10 },

  // Payment rows
  pmRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 8, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  pmDot: { width: 10, height: 10, borderRadius: 5 },
  pmLabel: { fontSize: 14, fontWeight: '500', color: '#1C1C1E' },
  pmAmount: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },

  // Sale cards
  saleCard: { backgroundColor: '#FAFAFA', borderRadius: 12, padding: 12, marginBottom: 6, borderWidth: 1, borderColor: '#E8ECF0' },
  saleHeader: { flexDirection: 'row', justifyContent: 'space-between' },
  saleCust: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  saleTime: { fontSize: 11, color: '#8E8E93' },
  saleNum: { fontSize: 10, color: '#AEAEB2' },
  saleAmount: { fontSize: 16, fontWeight: '700', color: '#007AFF' },
  pmBadge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2, borderWidth: 1 },
  pmBadgeText: { fontSize: 10, fontWeight: '700' },

  // Sale items
  saleItems: { marginTop: 10, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0' },
  saleItemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4 },
  saleItemName: { flex: 1, fontSize: 13, color: '#4A4D5C' },
  saleItemQty: { fontSize: 13, color: '#8E8E93', marginRight: 10 },
  saleItemTotal: { fontSize: 13, fontWeight: '600', color: '#1C1C1E', width: 75, textAlign: 'right' },

  // Combined breakdown
  combinedBox: { marginTop: 10, padding: 10, backgroundColor: '#FF3B3008', borderRadius: 10, borderWidth: 1, borderColor: '#FF3B3020' },
  combinedTitle: { fontSize: 11, fontWeight: '700', color: '#FF3B30', letterSpacing: 0.3, marginBottom: 6 },
  combinedRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 3 },

  // Print button
  printBtn: { marginTop: 10, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF', paddingVertical: 10, borderRadius: 10 },
  printBtnText: { fontSize: 14, fontWeight: '700', color: '#fff' },
});
