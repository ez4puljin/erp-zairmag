import React, { useCallback, useEffect, useMemo, useState, useRef } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity, Alert, StyleSheet,
  ActivityIndicator, RefreshControl, Platform, BackHandler, Modal,
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import api from '../../src/lib/api';
import { getImageUrl } from '../../src/lib/image-url';
import ViewShot from 'react-native-view-shot';
import { SaleReceipt, widthForPaper } from '../../src/components/PrintableReceipt';
import { fetchReceiptSettings, loadCachedSettings, DEFAULT_SETTINGS, type ReceiptSettings } from '../../src/lib/receipt-settings';
import { printImageBase64, feedLines, getSavedPrinter, scanBluetoothDevices, connectPrinter, savePrinter } from '../../src/lib/printer';
import { BarcodeScannerModal, hasBarcode } from '../../src/components/admin';
import { matchesSearch } from '@/src/lib/barcode';

// Image URL is now built dynamically via getImageUrl()

interface TruckLoadItem {
  id: string;
  product: { id: string; name: string; barcodes?: { code: string }[]; sellingPrice: number | string; sellingPriceRural?: number | string; unitsPerBox?: number; imageUrl?: string | null };
  loadedQty: number;
  soldQty: number;
}
interface TruckLoad { id: string; loadNumber: number; status: string; locationType?: 'URBAN' | 'RURAL'; items: TruckLoadItem[]; driver?: { firstName?: string; lastName?: string; phone?: string }; }
interface Customer { id: string; storeName: string; contactName: string; phone: string; address: string; }
interface CartItem { productId: string; productName: string; unitPrice: number; quantity: number; maxQuantity: number; unitsPerBox: number; }
interface CombinedLine { method: string; amount: string; }
interface SaleResult { id: string; saleNumber?: number; totalAmount: number; createdAt: string; customer?: Customer; items?: any[]; }

const PAYMENT_METHODS = [
  { key: 'CASH', label: 'Бэлэн', icon: 'cash-outline' as const, color: '#34C759' },
  { key: 'BANK_TRANSFER', label: 'Шилжүүлэг', icon: 'business-outline' as const, color: '#007AFF' },
  { key: 'CARD', label: 'Карт', icon: 'card-outline' as const, color: '#AF52DE' },
  { key: 'CREDIT', label: 'Зээл', icon: 'time-outline' as const, color: '#FF9500' },
  { key: 'COMBINED', label: 'Хосолсон', icon: 'layers-outline' as const, color: '#FF3B30' },
];
const COMBINED_OPTIONS = [
  { key: 'CASH', label: 'Бэлэн' }, { key: 'BANK_TRANSFER', label: 'Шилжүүлэг' },
  { key: 'CARD', label: 'Карт' }, { key: 'CREDIT', label: 'Зээл' },
];

function fmtStock(qty: number, upb: number) {
  if (upb <= 1) return `${qty} ширхэг`;
  const b = Math.floor(qty / upb), p = qty % upb;
  if (b > 0 && p > 0) return `${b} хайрцаг, ${p} ш (нийт: ${qty}ш)`;
  if (b > 0) return `${b} хайрцаг (нийт: ${qty}ш)`;
  return `${p} ширхэг`;
}

type Step = 'customer' | 'products' | 'payment' | 'receipt';

export default function POSScreen() {
  const insets = useSafeAreaInsets();
  const [step, setStep] = useState<Step>('customer');
  const [truckLoad, setTruckLoad] = useState<TruckLoad | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [combinedLines, setCombinedLines] = useState<CombinedLine[]>([{ method: 'CASH', amount: '' }, { method: 'BANK_TRANSFER', amount: '' }]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);
  const [showFilter, setShowFilter] = useState(false);
  const [filterType, setFilterType] = useState<'category' | 'supplier' | null>(null);
  const [selectedFilter, setSelectedFilter] = useState<{ type: string; id: string; name: string } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [showPrinterModal, setShowPrinterModal] = useState(false);
  const [printerDevices, setPrinterDevices] = useState<{ address: string; name: string }[]>([]);
  const [scanning, setScanning] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [printing, setPrinting] = useState(false);

  // Android back button
  useEffect(() => {
    const onBack = () => {
      if (step === 'receipt') return true; // block back on receipt
      if (step === 'payment') { setStep('products'); return true; }
      if (step === 'products') { setStep('customer'); return true; }
      return false;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [step]);

  const fetchData = useCallback(async () => {
    try {
      const [loadRes, custRes] = await Promise.all([
        api.get('/api/truck-loads/driver/active'),
        api.get('/api/customers?limit=100'),
      ]);
      setTruckLoad(loadRes.data);
      setCustomers(custRes.data?.data || custRes.data || []);
    } catch (err: any) {
      console.log('POS fetchData error:', err?.response?.status, err?.response?.data, err?.message);
      if (err?.response?.status === 404) setTruckLoad(null);
    } finally { setLoading(false); setRefreshing(false); }
  }, []);

  useEffect(() => {
    fetchData();
    api.get('/api/categories').then(r => setCategories(r.data?.data ?? r.data ?? [])).catch(() => {});
    api.get('/api/suppliers?limit=50').then(r => setSuppliers(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, [fetchData]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers.slice(0, 20);
    const q = customerSearch.toLowerCase();
    return customers.filter(c => c.storeName.toLowerCase().includes(q) || c.phone.includes(q) || c.contactName.toLowerCase().includes(q)).slice(0, 20);
  }, [customers, customerSearch]);

  const availableProducts = useMemo(() => {
    const items = truckLoad?.items ?? [];
    let list = items.filter(i => (i.loadedQty - i.soldQty) > 0);
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter(i => matchesSearch(i.product, q));
    }
    if (selectedFilter) {
      if (selectedFilter.type === 'category') list = list.filter(i => (i.product as any).categoryId === selectedFilter.id || (i.product as any).category?.id === selectedFilter.id);
      if (selectedFilter.type === 'supplier') list = list.filter(i => (i.product as any).supplierId === selectedFilter.id || (i.product as any).supplier?.id === selectedFilter.id);
    }
    return list;
  }, [truckLoad, productSearch, selectedFilter]);

  // Resolve unit price based on truck load location type (URBAN / RURAL)
  const getProductPrice = (product: TruckLoadItem['product']): number => {
    const isRural = truckLoad?.locationType === 'RURAL';
    if (isRural && product.sellingPriceRural !== undefined && Number(product.sellingPriceRural) > 0) {
      return Number(product.sellingPriceRural);
    }
    return Number(product.sellingPrice);
  };

  const setCartQty = (item: TruckLoadItem, qty: number) => {
    const upb = item.product.unitsPerBox || 1;
    const maxQ = item.loadedQty - item.soldQty;
    const safeQty = Math.max(0, Math.min(qty, maxQ));
    const price = getProductPrice(item.product);
    setCart(prev => {
      if (safeQty <= 0) return prev.filter(c => c.productId !== item.product.id);
      const exists = prev.find(c => c.productId === item.product.id);
      if (exists) return prev.map(c => c.productId === item.product.id ? { ...c, quantity: safeQty } : c);
      return [...prev, { productId: item.product.id, productName: item.product.name, unitPrice: price, quantity: safeQty, maxQuantity: maxQ, unitsPerBox: upb }];
    });
  };
  /** Сонгогдсон мөрийг сагсанд нэг ширхэгээр нэмнэ. */
  const addScanned = (found: any) => {
    if (found.loadedQty - found.soldQty <= 0) {
      Alert.alert('Дууссан', `${found.product.name}: машинд үлдэгдэлгүй байна.`);
      return;
    }
    // Уншсан бүрт нэг ширхэг нэмнэ — дараалан уншуулахад тоо өснө.
    const current = cart.find(c => c.productId === found.product.id)?.quantity ?? 0;
    setCartQty(found, current + 1);
    setProductSearch('');
  };

  /**
   * Зураасан кодыг ачилтад байгаа бараатай тааруулна.
   * Нэг кодыг хэд хэдэн бараа хуваалцаж болох тул олон таарвал сонгуулна.
   */
  const handleScanned = (code: string) => {
    setScannerOpen(false);
    const matches = availableProducts.filter((it: any) => hasBarcode(it.product, code));

    if (matches.length === 0) {
      Alert.alert('Олдсонгүй', `"${code}" кодтой бараа энэ ачилтад алга.`);
      return;
    }

    if (matches.length > 1) {
      Alert.alert(
        'Аль бараа вэ?',
        `${code.trim()} — ${matches.length} бараанд бүртгэлтэй.`,
        [
          ...matches.map((m: any) => ({
            text: `${m.product.name} (${m.loadedQty - m.soldQty}ш)`,
            onPress: () => addScanned(m),
          })),
          { text: 'Болих', style: 'cancel' as const },
        ],
      );
      return;
    }

    addScanned(matches[0]);
  };

  const removeFromCart = (pid: string) => setCart(prev => prev.filter(c => c.productId !== pid));

  const cartTotal = cart.reduce((s, c) => s + c.unitPrice * c.quantity, 0);
  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);
  const totalLoaded = (truckLoad?.items ?? []).reduce((s, i) => s + (i.loadedQty ?? 0), 0);
  const totalSold = (truckLoad?.items ?? []).reduce((s, i) => s + (i.soldQty ?? 0), 0);
  const combinedTotal = combinedLines.reduce((s, l) => s + (Number(l.amount) || 0), 0);

  const handleSubmit = async () => {
    if (!selectedCustomer || cart.length === 0 || !truckLoad) return;
    if (paymentMethod === 'COMBINED' && Math.abs(combinedTotal - cartTotal) > 1) {
      Alert.alert('Алдаа', 'Хосолсон төлбөрийн дүн тохирохгүй байна');
      return;
    }
    setSubmitting(true);
    try {
      const body: any = { truckLoadId: truckLoad.id, customerId: selectedCustomer.id, paymentMethod,
        items: cart.map(c => ({ productId: c.productId, quantity: c.quantity, unitPrice: c.unitPrice })) };
      if (paymentMethod === 'COMBINED') body.combinedPayments = combinedLines.filter(l => Number(l.amount) > 0).map(l => ({ method: l.method, amount: Number(l.amount) }));
      const { data } = await api.post('/api/truck-sales', body);
      setSaleResult(data);
      setStep('receipt');
    } catch (err: any) {
      Alert.alert('Алдаа', err?.response?.data?.message || 'Борлуулалт бүртгэхэд алдаа гарлаа');
    } finally { setSubmitting(false); }
  };

  const customerReceiptRef = useRef<ViewShot>(null);
  const driverReceiptRef = useRef<ViewShot>(null);
  const [receiptSettings, setReceiptSettings] = useState<ReceiptSettings>(DEFAULT_SETTINGS);

  // Load receipt settings on mount
  useEffect(() => {
    loadCachedSettings().then(setReceiptSettings);
    fetchReceiptSettings().then(setReceiptSettings).catch(() => {});
  }, []);

  const handlePrint = async () => {
    if (!saleResult) return;
    setPrinting(true);
    try {
      const saved = await getSavedPrinter();
      if (!saved) { setShowPrinterModal(true); setPrinting(false); return; }
      const connected = await connectPrinter(saved.address);
      if (!connected) { setShowPrinterModal(true); setPrinting(false); return; }

      const width = widthForPaper(receiptSettings.paperWidth);

      // Capture receipt #1 (customer copy)
      if (!customerReceiptRef.current?.capture) throw new Error('Баримт бэлэн биш байна');
      const base64a = await customerReceiptRef.current.capture();
      await printImageBase64(base64a, width, receiptSettings.paperWidth);
      await feedLines(2);

      // Capture receipt #2 (driver copy) only if enabled
      if (receiptSettings.printTwoCopies && driverReceiptRef.current?.capture) {
        const base64b = await driverReceiptRef.current.capture();
        await printImageBase64(base64b, width, receiptSettings.paperWidth);
        await feedLines(3);
      } else {
        await feedLines(3);
      }

      Alert.alert('Амжилттай', 'Баримт хэвлэгдлээ');
    } catch (e: any) {
      Alert.alert('Хэвлэх алдаа', e.message || 'Алдаа гарлаа');
    } finally { setPrinting(false); }
  };

  const handleScanPrinters = async () => {
    setScanning(true);
    const devices = await scanBluetoothDevices();
    setPrinterDevices(devices);
    setScanning(false);
  };

  const handleSelectPrinter = async (device: { address: string; name: string }) => {
    const ok = await connectPrinter(device.address);
    if (ok) {
      await savePrinter(device.address, device.name);
      setShowPrinterModal(false);
      Alert.alert('Амжилттай', `${device.name} принтер холбогдлоо. Дахин "Баримт хэвлэх" дарна уу.`);
    }
  };

  const handleNewSale = () => {
    setSaleResult(null); setCart([]); setSelectedCustomer(null); setCustomerSearch('');
    setPaymentMethod('CASH'); setCombinedLines([{ method: 'CASH', amount: '' }, { method: 'BANK_TRANSFER', amount: '' }]);
    setStep('customer'); fetchData();
  };

  // --- LOADING ---
  if (loading) return <View style={[st.centered, { paddingTop: insets.top }]}><StatusBar style="dark" /><ActivityIndicator size="large" color="#007AFF" /></View>;
  if (!truckLoad) {
    return (
      <View style={[st.centered, { paddingTop: insets.top }]}>
        <View style={st.emptyIcon}><Ionicons name="car-outline" size={40} color="#AEAEB2" /></View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 }}>Идэвхтэй ачилт байхгүй</Text>
        <Text style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center' }}>Агуулахаас ачилт хүлээн авна уу</Text>
        <TouchableOpacity style={st.retryBtn} onPress={fetchData}><Ionicons name="refresh" size={18} color="#007AFF" /><Text style={{ fontSize: 14, fontWeight: '600', color: '#007AFF' }}>Дахин шалгах</Text></TouchableOpacity>
      </View>
    );
  }

  // --- COMPLETION REQUEST WAITING ---
  if (truckLoad.status === 'COMPLETION_REQUESTED') {
    return (
      <View style={[st.centered, { paddingTop: insets.top }]}>
        <StatusBar style="dark" />
        <View style={[st.emptyIcon, { backgroundColor: '#FFF7E6' }]}>
          <Ionicons name="hourglass-outline" size={44} color="#FF9500" />
        </View>
        <Text style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E', marginTop: 16, textAlign: 'center' }}>
          Ачилт дуусгах хүсэлт{'\n'}хүлээгдэж байна
        </Text>
        <Text style={{ fontSize: 14, color: '#8E8E93', textAlign: 'center', marginTop: 8, paddingHorizontal: 30 }}>
          Админ таны ачилтын үлдэгдлийг шалгаж баталгаажуулах хүртэл шинэ борлуулалт хийх боломжгүй.
        </Text>
        <TouchableOpacity style={st.retryBtn} onPress={fetchData}>
          <Ionicons name="refresh" size={18} color="#007AFF" />
          <Text style={{ fontSize: 14, fontWeight: '600', color: '#007AFF' }}>Дахин шалгах</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- STEP INDICATOR ---
  const steps = [
    { key: 'customer', label: 'Харилцагч', icon: 'person' as const },
    { key: 'products', label: 'Бараа', icon: 'cube' as const },
    { key: 'payment', label: 'Төлбөр', icon: 'card' as const },
  ];
  const stepIndex = step === 'receipt' ? 3 : steps.findIndex(s => s.key === step);

  const StepIndicator = () => (
    <View style={[st.stepBar, { paddingTop: insets.top + 10 }]}>
      {steps.map((s, i) => {
        const done = i < stepIndex;
        const active = i === stepIndex;
        return (
          <React.Fragment key={s.key}>
            {i > 0 && <View style={[st.stepLine, (done || active) && st.stepLineDone]} />}
            <TouchableOpacity style={[st.stepDot, done && st.stepDotDone, active && st.stepDotActive]} onPress={() => { if (done) setStep(s.key as Step); }} disabled={!done}>
              {done ? <Ionicons name="checkmark" size={14} color="#fff" /> : <Ionicons name={s.icon} size={14} color={active ? '#fff' : '#AEAEB2'} />}
            </TouchableOpacity>
          </React.Fragment>
        );
      })}
    </View>
  );

  // ===================== STEP 1: CUSTOMER =====================
  if (step === 'customer') {
    return (
      <View style={st.container}>
        <StepIndicator />
        <View style={st.stepHeader}>
          <Text style={st.stepTitle}>Харилцагч сонгох</Text>
          <Text style={st.stepSub}>Борлуулалт хийх харилцагчаа сонгоно уу</Text>
        </View>
        <View style={st.searchWrap}>
          <Ionicons name="search" size={18} color="#8E8E93" />
          <TextInput style={st.searchField} placeholder="Дэлгүүр нэр, утас хайх..." placeholderTextColor="#AEAEB2" value={customerSearch} onChangeText={setCustomerSearch} autoFocus />
          {customerSearch.length > 0 && <TouchableOpacity onPress={() => setCustomerSearch('')}><Ionicons name="close-circle" size={20} color="#AEAEB2" /></TouchableOpacity>}
        </View>
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: 20 }} keyboardShouldPersistTaps="handled">
          {filteredCustomers.map(c => {
            const selected = selectedCustomer?.id === c.id;
            return (
              <TouchableOpacity key={c.id} style={[st.custCard, selected && st.custCardActive]} onPress={() => setSelectedCustomer(c)}>
                <View style={[st.custAvatar, selected && { backgroundColor: '#34C759' }]}>
                  <Ionicons name={selected ? 'checkmark' : 'storefront-outline'} size={18} color={selected ? '#fff' : '#8E8E93'} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={st.custName}>{c.storeName}</Text>
                  <Text style={st.custInfo}>{c.phone} · {c.address}</Text>
                </View>
                {selected && <Ionicons name="checkmark-circle" size={22} color="#34C759" />}
              </TouchableOpacity>
            );
          })}
        </ScrollView>
        {selectedCustomer && (
          <View style={[st.bottomAction, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <TouchableOpacity style={st.nextBtn} onPress={() => setStep('products')}>
              <Text style={st.nextBtnText}>Бараа сонгох</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}
      </View>
    );
  }

  // ===================== STEP 2: PRODUCTS =====================
  if (step === 'products') {
    return (
      <View style={st.container}>
        <StepIndicator />
        {/* Mini customer bar */}
        <View style={st.miniCustBar}>
          <Ionicons name="storefront" size={14} color="#34C759" />
          <Text style={st.miniCustName} numberOfLines={1}>{selectedCustomer?.storeName}</Text>
          <TouchableOpacity onPress={() => setStep('customer')}><Text style={{ fontSize: 12, color: '#007AFF', fontWeight: '600' }}>Солих</Text></TouchableOpacity>
        </View>
        {/* Search + Filter */}
        <View style={st.searchWrap}>
          <Ionicons name="search" size={18} color="#8E8E93" />
          <TextInput style={st.searchField} placeholder="Бараа хайх (нэр, баркод)..." placeholderTextColor="#AEAEB2" value={productSearch} onChangeText={setProductSearch} />
          {productSearch.length > 0 && <TouchableOpacity onPress={() => setProductSearch('')}><Ionicons name="close-circle" size={20} color="#AEAEB2" /></TouchableOpacity>}
          <TouchableOpacity onPress={() => setScannerOpen(true)} style={st.scanBtn}>
            <Ionicons name="barcode-outline" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity onPress={() => setShowFilter(true)} style={[st.filterBtn, selectedFilter && st.filterBtnActive]}>
            <Ionicons name="filter" size={16} color={selectedFilter ? '#fff' : '#8E8E93'} />
          </TouchableOpacity>
          <View style={st.prodCountBadge}><Text style={st.prodCountText}>{availableProducts.length}</Text></View>
        </View>
        {selectedFilter && (
          <View style={st.activeFilter}>
            <Text style={{ fontSize: 12, color: '#007AFF', fontWeight: '600' }}>{selectedFilter.name}</Text>
            <TouchableOpacity onPress={() => setSelectedFilter(null)}><Ionicons name="close-circle" size={18} color="#FF3B30" /></TouchableOpacity>
          </View>
        )}

        {/* Filter Modal */}
        <Modal visible={showFilter} transparent animationType="slide">
          <View style={st.filterOverlay}>
            <View style={[st.filterSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <Text style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E' }}>Шүүлтүүр</Text>
                <TouchableOpacity onPress={() => { setShowFilter(false); setFilterType(null); }}><Ionicons name="close" size={24} color="#8E8E93" /></TouchableOpacity>
              </View>
              {!filterType ? (
                <View style={{ gap: 8 }}>
                  <TouchableOpacity style={st.filterOption} onPress={() => setFilterType('category')}>
                    <Ionicons name="folder-outline" size={20} color="#FF9500" />
                    <Text style={st.filterOptionText}>Бүлэг (Ангилал)</Text>
                    <Ionicons name="chevron-forward" size={18} color="#AEAEB2" />
                  </TouchableOpacity>
                  <TouchableOpacity style={st.filterOption} onPress={() => setFilterType('supplier')}>
                    <Ionicons name="business-outline" size={20} color="#007AFF" />
                    <Text style={st.filterOptionText}>Нийлүүлэгч</Text>
                    <Ionicons name="chevron-forward" size={18} color="#AEAEB2" />
                  </TouchableOpacity>
                  {selectedFilter && (
                    <TouchableOpacity style={[st.filterOption, { borderColor: '#FF3B3030', backgroundColor: '#FF3B3008' }]} onPress={() => { setSelectedFilter(null); setShowFilter(false); setFilterType(null); }}>
                      <Ionicons name="close-circle-outline" size={20} color="#FF3B30" />
                      <Text style={[st.filterOptionText, { color: '#FF3B30' }]}>Шүүлтүүр арилгах</Text>
                    </TouchableOpacity>
                  )}
                </View>
              ) : (
                <View>
                  <TouchableOpacity onPress={() => setFilterType(null)} style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 12 }}>
                    <Ionicons name="chevron-back" size={18} color="#007AFF" />
                    <Text style={{ fontSize: 14, color: '#007AFF', fontWeight: '600' }}>Буцах</Text>
                  </TouchableOpacity>
                  <ScrollView style={{ maxHeight: 300 }}>
                    {(filterType === 'category' ? categories : suppliers).map((item: any) => (
                      <TouchableOpacity key={item.id} style={[st.filterItem, selectedFilter?.id === item.id && { backgroundColor: '#007AFF10', borderColor: '#007AFF' }]}
                        onPress={() => { setSelectedFilter({ type: filterType, id: item.id, name: item.name }); setShowFilter(false); setFilterType(null); }}>
                        <Text style={{ fontSize: 14, fontWeight: '500', color: '#1C1C1E' }}>{item.name}</Text>
                        {selectedFilter?.id === item.id && <Ionicons name="checkmark-circle" size={20} color="#007AFF" />}
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                </View>
              )}
            </View>
          </View>
        </Modal>
        {/* Product list */}
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingHorizontal: 12, paddingBottom: cart.length > 0 ? 100 : 20 }}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchData(); }} />} keyboardShouldPersistTaps="handled">
          {availableProducts.map(item => {
            const upb = item.product.unitsPerBox || 1;
            const remaining = item.loadedQty - item.soldQty;
            const inCart = cart.find(c => c.productId === item.product.id);
            const qty = inCart?.quantity ?? 0;
            const boxes = upb > 1 ? Math.floor(qty / upb) : 0;
            const pieces = upb > 1 ? qty % upb : qty;
            return (
              <View key={item.id} style={[st.prodCard, qty > 0 && st.prodCardActive]}>
                <View style={{ flexDirection: 'row', gap: 10, alignItems: 'center' }}>
                  {item.product.imageUrl ? (
                    <Image source={{ uri: getImageUrl(item.product.imageUrl) ?? '' }} style={st.prodImg} contentFit="cover" cachePolicy="disk" />
                  ) : (
                    <View style={st.prodImgPh}><Ionicons name="ice-cream-outline" size={20} color="#D1D5DB" /></View>
                  )}
                  <View style={{ flex: 1 }}>
                    <Text style={st.prodName} numberOfLines={2}>{item.product.name}</Text>
                    <Text style={{ fontSize: 11, color: '#007AFF', marginTop: 2 }}>{fmtStock(remaining, upb)}</Text>
                  </View>
                  <View style={{ alignItems: 'flex-end' }}>
                    <Text style={st.prodPrice}>₮{getProductPrice(item.product).toLocaleString()}</Text>
                    {qty > 0 && <View style={st.qtyBadge}><Text style={st.qtyBadgeText}>{qty}ш</Text></View>}
                  </View>
                </View>
                <View style={st.qtyRow}>
                  {upb > 1 ? (<>
                    <View style={{ flex: 1 }}>
                      <Text style={st.qtyLabel}>ХАЙРЦАГ</Text>
                      <TextInput style={[st.qtyInput, { borderColor: '#007AFF50' }]} keyboardType="number-pad" value={qty > 0 ? String(boxes) : ''} placeholder="0" placeholderTextColor="#CCC" selectTextOnFocus
                        onChangeText={t => setCartQty(item, (Math.max(0, parseInt(t) || 0)) * upb + pieces)} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={st.qtyLabel}>ШИРХЭГ</Text>
                      <TextInput style={[st.qtyInput, { borderColor: '#FF950050' }]} keyboardType="number-pad" value={qty > 0 ? String(pieces) : ''} placeholder="0" placeholderTextColor="#CCC" selectTextOnFocus
                        onChangeText={t => setCartQty(item, boxes * upb + Math.max(0, Math.min(parseInt(t) || 0, upb - 1)))} />
                    </View>
                  </>) : (
                    <View style={{ flex: 1 }}>
                      <Text style={st.qtyLabel}>ТОО ШИРХЭГ</Text>
                      <TextInput style={[st.qtyInput, { borderColor: '#34C75950' }]} keyboardType="number-pad" value={qty > 0 ? String(qty) : ''} placeholder="0" placeholderTextColor="#CCC" selectTextOnFocus
                        onChangeText={t => setCartQty(item, Math.max(0, parseInt(t) || 0))} />
                    </View>
                  )}
                  {qty > 0 && <TouchableOpacity style={st.trashBtn} onPress={() => removeFromCart(item.product.id)}><Ionicons name="trash-outline" size={16} color="#FF3B30" /></TouchableOpacity>}
                </View>
                {qty > 0 && <Text style={{ fontSize: 12, color: '#8E8E93', textAlign: 'right', marginTop: 4 }}>{qty}ш × ₮{getProductPrice(item.product).toLocaleString()} = <Text style={{ fontWeight: '700', color: '#1C1C1E' }}>₮{(qty * getProductPrice(item.product)).toLocaleString()}</Text></Text>}
              </View>
            );
          })}
        </ScrollView>
        {cart.length > 0 && (
          <View style={[st.bottomAction, { paddingBottom: Math.max(insets.bottom, 12) }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
              <Text style={{ fontSize: 13, color: '#8E8E93' }}>{cart.length} бараа · {cartCount} ш</Text>
              <Text style={{ fontSize: 18, fontWeight: '800', color: '#1C1C1E' }}>₮{cartTotal.toLocaleString()}</Text>
            </View>
            <TouchableOpacity style={st.nextBtn} onPress={() => setStep('payment')}>
              <Text style={st.nextBtnText}>Төлбөр хийх</Text>
              <Ionicons name="arrow-forward" size={20} color="#fff" />
            </TouchableOpacity>
          </View>
        )}

        <BarcodeScannerModal
          visible={scannerOpen}
          onClose={() => setScannerOpen(false)}
          onScanned={handleScanned}
          hint="Барааны зураасан кодыг хүрээнд байрлуулна уу"
        />
      </View>
    );
  }

  // ===================== STEP 3: PAYMENT =====================
  if (step === 'payment') {
    return (
      <View style={st.container}>
        <StepIndicator />
        <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 100 }} keyboardShouldPersistTaps="handled">
          {/* Summary */}
          <View style={st.payCard}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5 }}>ЗАХИАЛГЫН МЭДЭЭЛЭЛ</Text>
              <TouchableOpacity onPress={() => setStep('products')}><Text style={{ fontSize: 12, color: '#007AFF', fontWeight: '600' }}>Засах</Text></TouchableOpacity>
            </View>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <Ionicons name="storefront" size={16} color="#34C759" />
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#1C1C1E' }}>{selectedCustomer?.storeName}</Text>
            </View>
            {cart.map(c => (
              <View key={c.productId} style={{ flexDirection: 'row', paddingVertical: 5, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#F2F2F7' }}>
                <Text style={{ flex: 1, fontSize: 13, color: '#4A4D5C' }} numberOfLines={1}>{c.productName}</Text>
                <Text style={{ fontSize: 13, color: '#8E8E93' }}>×{c.quantity}</Text>
                <Text style={{ fontSize: 13, fontWeight: '600', color: '#1C1C1E', width: 80, textAlign: 'right' }}>₮{(c.unitPrice * c.quantity).toLocaleString()}</Text>
              </View>
            ))}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E8ECF0' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1C1E' }}>Нийт</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#007AFF' }}>₮{cartTotal.toLocaleString()}</Text>
            </View>
          </View>

          {/* Payment method */}
          <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginTop: 20, marginBottom: 10 }}>ТӨЛБӨРИЙН ХЭЛБЭР</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
            {PAYMENT_METHODS.map(pm => {
              const active = paymentMethod === pm.key;
              return (
                <TouchableOpacity key={pm.key} style={[st.payMethodBtn, active && { backgroundColor: pm.color, borderColor: pm.color }]} onPress={() => setPaymentMethod(pm.key)}>
                  <Ionicons name={pm.icon} size={18} color={active ? '#fff' : '#4A4D5C'} />
                  <Text style={[{ fontSize: 13, fontWeight: '600', color: '#4A4D5C' }, active && { color: '#fff' }]}>{pm.label}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Combined */}
          {paymentMethod === 'COMBINED' && (
            <View style={[st.payCard, { marginTop: 12 }]}>
              <Text style={{ fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 10 }}>ХОСОЛСОН ЗАДАРГАА</Text>
              {combinedLines.map((line, idx) => (
                <View key={idx} style={{ marginBottom: 10 }}>
                  <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 4, marginBottom: 6 }}>
                    {COMBINED_OPTIONS.map(opt => (
                      <TouchableOpacity key={opt.key} onPress={() => setCombinedLines(p => p.map((l, i) => i === idx ? { ...l, method: opt.key } : l))}
                        style={[st.combOpt, line.method === opt.key && st.combOptActive]}>
                        <Text style={[{ fontSize: 11, fontWeight: '600', color: '#8E8E93' }, line.method === opt.key && { color: '#007AFF' }]}>{opt.label}</Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <TextInput style={st.combAmountInput} keyboardType="number-pad" placeholder="₮0" placeholderTextColor="#CCC" value={line.amount} selectTextOnFocus
                      onChangeText={t => setCombinedLines(p => p.map((l, i) => i === idx ? { ...l, amount: t } : l))} />
                    {combinedLines.length > 2 && <TouchableOpacity onPress={() => setCombinedLines(p => p.filter((_, i) => i !== idx))}><Ionicons name="close-circle" size={22} color="#FF3B30" /></TouchableOpacity>}
                  </View>
                </View>
              ))}
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                <TouchableOpacity onPress={() => setCombinedLines(p => [...p, { method: 'CASH', amount: '' }])} style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  <Ionicons name="add-circle" size={18} color="#007AFF" /><Text style={{ fontSize: 13, fontWeight: '600', color: '#007AFF' }}>Мөр нэмэх</Text>
                </TouchableOpacity>
                <View style={{ alignItems: 'flex-end' }}>
                  <Text style={{ fontSize: 12, color: '#8E8E93' }}>₮{combinedTotal.toLocaleString()} / ₮{cartTotal.toLocaleString()}</Text>
                  {Math.abs(combinedTotal - cartTotal) > 1 ? <Text style={{ fontSize: 11, fontWeight: '700', color: '#FF3B30' }}>Зөрүү: ₮{Math.abs(combinedTotal - cartTotal).toLocaleString()}</Text>
                    : combinedTotal > 0 ? <Text style={{ fontSize: 11, fontWeight: '700', color: '#34C759' }}>✓ Тохирсон</Text> : null}
                </View>
              </View>
            </View>
          )}
        </ScrollView>

        <View style={[st.bottomAction, { paddingBottom: Math.max(insets.bottom, 12) }]}>
          <TouchableOpacity style={[st.submitBtn, (!selectedCustomer || submitting || (paymentMethod === 'COMBINED' && Math.abs(combinedTotal - cartTotal) > 1)) && { opacity: 0.5 }]}
            onPress={handleSubmit} disabled={!selectedCustomer || submitting || (paymentMethod === 'COMBINED' && Math.abs(combinedTotal - cartTotal) > 1)}>
            {submitting ? <ActivityIndicator color="#fff" /> : (<>
              <Ionicons name="checkmark-circle" size={22} color="#fff" />
              <Text style={{ fontSize: 17, fontWeight: '700', color: '#fff' }}>Борлуулалт бүртгэх</Text>
            </>)}
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // ===================== STEP 4: RECEIPT =====================
  if (step === 'receipt' && saleResult) {
    const pmLabel = PAYMENT_METHODS.find(m => m.key === paymentMethod)?.label || paymentMethod;
    return (
      <View style={st.container}>
        {/* Hidden printable receipts (rendered off-screen, captured by ViewShot for image printing) */}
        <View style={{ position: 'absolute', left: -10000, top: 0, width: widthForPaper(receiptSettings.paperWidth) }} pointerEvents="none">
          <ViewShot ref={customerReceiptRef} options={{ format: 'png', quality: 1, result: 'base64' }}>
            <SaleReceipt
              sale={saleResult}
              customer={selectedCustomer}
              paymentMethod={paymentMethod}
              copyLabel="ХАРИЛЦАГЧИЙН ХУВЬ"
              driverName={`${truckLoad?.driver?.lastName ?? ''} ${truckLoad?.driver?.firstName ?? ''}`.trim()}
              driverPhone={truckLoad?.driver?.phone}
              combinedPayments={paymentMethod === 'COMBINED' ? combinedLines.filter(l => Number(l.amount) > 0).map(l => ({ method: l.method, amount: Number(l.amount) })) : undefined}
              settings={receiptSettings}
            />
          </ViewShot>
          {receiptSettings.printTwoCopies && (
            <ViewShot ref={driverReceiptRef} options={{ format: 'png', quality: 1, result: 'base64' }}>
              <SaleReceipt
                sale={saleResult}
                customer={selectedCustomer}
                paymentMethod={paymentMethod}
                copyLabel="ЖОЛООЧИЙН ХУВЬ"
                driverName={`${truckLoad?.driver?.lastName ?? ''} ${truckLoad?.driver?.firstName ?? ''}`.trim()}
                driverPhone={truckLoad?.driver?.phone}
                combinedPayments={paymentMethod === 'COMBINED' ? combinedLines.filter(l => Number(l.amount) > 0).map(l => ({ method: l.method, amount: Number(l.amount) })) : undefined}
                settings={receiptSettings}
              />
            </ViewShot>
          )}
        </View>
        <ScrollView contentContainerStyle={{ padding: 20, paddingTop: insets.top + 20, alignItems: 'center' }}>
          <View style={{ width: 64, height: 64, borderRadius: 32, backgroundColor: '#34C759', justifyContent: 'center', alignItems: 'center', marginBottom: 16 }}>
            <Ionicons name="checkmark" size={36} color="#fff" />
          </View>
          <Text style={{ fontSize: 22, fontWeight: '800', color: '#1C1C1E', marginBottom: 4 }}>Амжилттай!</Text>
          <Text style={{ fontSize: 14, color: '#8E8E93', marginBottom: 20 }}>Баримт #{saleResult.saleNumber || saleResult.id}</Text>

          <View style={[st.payCard, { width: '100%' }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: '#8E8E93' }}>Харилцагч</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E' }}>{selectedCustomer?.storeName}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: '#8E8E93' }}>Төлбөр</Text>
              <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E' }}>{pmLabel}</Text>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingTop: 10, borderTopWidth: 1, borderTopColor: '#E8ECF0' }}>
              <Text style={{ fontSize: 16, fontWeight: '700', color: '#1C1C1E' }}>Нийт</Text>
              <Text style={{ fontSize: 22, fontWeight: '800', color: '#34C759' }}>₮{Number(saleResult.totalAmount).toLocaleString()}</Text>
            </View>
          </View>

          <View style={{ flexDirection: 'row', gap: 10, marginTop: 20, width: '100%' }}>
            <TouchableOpacity style={[st.receiptBtn, { backgroundColor: '#007AFF' }]} onPress={handlePrint} disabled={printing}>
              {printing ? <ActivityIndicator color="#fff" /> : <Ionicons name="print-outline" size={20} color="#fff" />}
              <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>{printing ? 'Хэвлэж байна...' : 'Баримт хэвлэх'}</Text>
            </TouchableOpacity>
          </View>
          <TouchableOpacity style={{ marginTop: 8, alignItems: 'center', paddingVertical: 8 }} onPress={() => setShowPrinterModal(true)}>
            <Text style={{ fontSize: 13, color: '#007AFF' }}>Принтер тохиргоо</Text>
          </TouchableOpacity>

          {/* Printer Modal */}
          <Modal visible={showPrinterModal} transparent animationType="slide">
            <View style={st.filterOverlay}>
              <View style={[st.filterSheet, { paddingBottom: Math.max(insets.bottom, 16) }]}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                  <Text style={{ fontSize: 18, fontWeight: '700', color: '#1C1C1E' }}>Bluetooth Принтер</Text>
                  <TouchableOpacity onPress={() => setShowPrinterModal(false)}><Ionicons name="close" size={24} color="#8E8E93" /></TouchableOpacity>
                </View>
                <Text style={{ fontSize: 13, color: '#8E8E93', marginBottom: 12 }}>Bluetooth принтерийг утсанд холбоод доорх "Хайх" товч дарна уу</Text>
                <TouchableOpacity style={[st.nextBtn, { marginBottom: 12 }]} onPress={handleScanPrinters} disabled={scanning}>
                  {scanning ? <ActivityIndicator color="#fff" /> : <Ionicons name="bluetooth" size={18} color="#fff" />}
                  <Text style={st.nextBtnText}>{scanning ? 'Хайж байна...' : 'Bluetooth төхөөрөмж хайх'}</Text>
                </TouchableOpacity>
                {printerDevices.length > 0 && (
                  <ScrollView style={{ maxHeight: 200 }}>
                    {printerDevices.map((d, i) => (
                      <TouchableOpacity key={i} style={st.filterItem} onPress={() => handleSelectPrinter(d)}>
                        <Ionicons name="print-outline" size={18} color="#007AFF" />
                        <View style={{ flex: 1, marginLeft: 8 }}>
                          <Text style={{ fontSize: 14, fontWeight: '600', color: '#1C1C1E' }}>{d.name}</Text>
                          <Text style={{ fontSize: 11, color: '#8E8E93' }}>{d.address}</Text>
                        </View>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                )}
              </View>
            </View>
          </Modal>
          <TouchableOpacity style={[st.receiptBtn, { marginTop: 10, width: '100%', backgroundColor: '#34C759' }]} onPress={handleNewSale}>
            <Ionicons name="add-circle-outline" size={20} color="#fff" />
            <Text style={{ fontSize: 15, fontWeight: '600', color: '#fff' }}>Шинэ борлуулалт</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>
    );
  }

  return null;
}

const st = StyleSheet.create({
  scanBtn: { width: 34, height: 34, borderRadius: 9, backgroundColor: '#14B8A6', justifyContent: 'center', alignItems: 'center' },
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA', padding: 32 },
  emptyIcon: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  retryBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 20, backgroundColor: '#007AFF15', paddingHorizontal: 20, paddingVertical: 10, borderRadius: 12 },

  // Steps
  stepBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, paddingHorizontal: 40, backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0' },
  stepDot: { width: 30, height: 30, borderRadius: 15, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  stepDotDone: { backgroundColor: '#34C759' },
  stepDotActive: { backgroundColor: '#007AFF' },
  stepLine: { flex: 1, height: 2, backgroundColor: '#E8ECF0', marginHorizontal: 4 },
  stepLineDone: { backgroundColor: '#34C759' },

  stepHeader: { paddingHorizontal: 16, paddingTop: 16, paddingBottom: 8 },
  stepTitle: { fontSize: 22, fontWeight: '800', color: '#1C1C1E' },
  stepSub: { fontSize: 13, color: '#8E8E93', marginTop: 2 },

  // Search
  searchWrap: { flexDirection: 'row', alignItems: 'center', gap: 8, marginHorizontal: 12, marginVertical: 8, backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, borderWidth: 1, borderColor: '#E8ECF0' },
  searchField: { flex: 1, fontSize: 15, color: '#1C1C1E' },
  prodCountBadge: { backgroundColor: '#007AFF', borderRadius: 10, paddingHorizontal: 8, paddingVertical: 2 },
  prodCountText: { fontSize: 11, fontWeight: '700', color: '#fff' },

  // Customer
  custCard: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 6, borderWidth: 1.5, borderColor: '#E8ECF0' },
  custCardActive: { borderColor: '#34C759', backgroundColor: '#34C75908' },
  custAvatar: { width: 40, height: 40, borderRadius: 12, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  custName: { fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  custInfo: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  miniCustBar: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 16, paddingVertical: 8, backgroundColor: '#34C75908', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#34C75930' },
  miniCustName: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1C1C1E' },

  // Products
  prodCard: { backgroundColor: '#fff', borderRadius: 14, padding: 12, marginBottom: 8, borderWidth: 1.5, borderColor: '#E8ECF0' },
  prodCardActive: { borderColor: '#34C759', backgroundColor: '#34C75906' },
  prodImg: { width: 44, height: 44, borderRadius: 10 },
  prodImgPh: { width: 44, height: 44, borderRadius: 10, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  prodName: { fontSize: 14, fontWeight: '600', color: '#1C1C1E', lineHeight: 18 },
  prodPrice: { fontSize: 14, fontWeight: '800', color: '#1C1C1E' },
  qtyBadge: { marginTop: 4, backgroundColor: '#34C759', borderRadius: 8, paddingHorizontal: 6, paddingVertical: 2 },
  qtyBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  qtyRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 8, marginTop: 8, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0' },
  qtyLabel: { fontSize: 9, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 3 },
  qtyInput: { backgroundColor: '#FAFAFA', borderWidth: 1.5, borderRadius: 10, paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontSize: 17, fontWeight: '700', textAlign: 'center', color: '#1C1C1E' },
  trashBtn: { width: 38, height: 38, borderRadius: 10, backgroundColor: '#FF3B3010', justifyContent: 'center', alignItems: 'center' },

  // Bottom action
  bottomAction: { backgroundColor: '#fff', borderTopWidth: 1, borderTopColor: '#E8ECF0', paddingHorizontal: 16, paddingTop: 10 },
  nextBtn: { backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 15, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  nextBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },

  // Payment
  payCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: '#E8ECF0' },
  payMethodBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12, backgroundColor: '#fff', borderWidth: 1.5, borderColor: '#E8ECF0' },
  combOpt: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 8, backgroundColor: '#F2F2F7' },
  combOptActive: { backgroundColor: '#007AFF15' },
  combAmountInput: { flex: 1, backgroundColor: '#F5F6FA', borderWidth: 1, borderColor: '#E8ECF0', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 6, fontSize: 16, fontWeight: '700', textAlign: 'right', color: '#1C1C1E' },
  submitBtn: { backgroundColor: '#34C759', borderRadius: 14, paddingVertical: 16, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },

  // Receipt
  receiptBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, borderRadius: 14, paddingVertical: 15 },

  // Filter
  filterBtn: { width: 36, height: 36, borderRadius: 10, backgroundColor: '#F2F2F7', justifyContent: 'center', alignItems: 'center' },
  filterBtnActive: { backgroundColor: '#007AFF' },
  activeFilter: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginHorizontal: 12, marginBottom: 4, backgroundColor: '#007AFF10', borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  filterOverlay: { flex: 1, justifyContent: 'flex-end', backgroundColor: 'rgba(0,0,0,0.4)' },
  filterSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 20, maxHeight: '60%' },
  filterOption: { flexDirection: 'row', alignItems: 'center', gap: 12, padding: 14, borderRadius: 12, borderWidth: 1, borderColor: '#E8ECF0', backgroundColor: '#FAFAFA' },
  filterOptionText: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  filterItem: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, paddingHorizontal: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0', borderRadius: 8, borderWidth: 1, borderColor: 'transparent', marginBottom: 4 },
});
