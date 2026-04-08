import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  ActivityIndicator, SafeAreaView, RefreshControl, Modal,
  TextInput, Alert, FlatList, Image, Dimensions, BackHandler,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import api from '../../src/lib/api';

const SCREEN_W = Dimensions.get('window').width;
const GRID_GAP = 8;
const GRID_COLS = 2;
const CARD_W = (SCREEN_W - 32 - GRID_GAP) / GRID_COLS;

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  PENDING: { bg: '#FFF7ED', text: '#FF9500', label: 'Хүлээгдэж буй' },
  APPROVED: { bg: '#EFF6FF', text: '#007AFF', label: 'Баталсан' },
  SHIPPING: { bg: '#ECFDF5', text: '#10B981', label: 'Хүргэлтэнд' },
  DELIVERED: { bg: '#ECFDF5', text: '#10B981', label: 'Хүргэгдсэн' },
  CANCELLED: { bg: '#FEF2F2', text: '#EF4444', label: 'Цуцлагдсан' },
  CANCELLATION_REQUESTED: { bg: '#FEF2F2', text: '#EF4444', label: 'Цуцлах хүсэлт' },
};

export default function OrdersScreen() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);

  // New order
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('ALL');
  const [cart, setCart] = useState<Record<string, { name: string; qty: number; unitPrice: number; stock: number; unitsPerBox: number }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [step, setStep] = useState<'customer' | 'products'>('customer');

  const today = new Date().toISOString().split('T')[0];

  // Android back button handling for modal
  useEffect(() => {
    const onBack = () => {
      if (!modalVisible) return false;
      if (step === 'products') {
        setStep('customer');
      } else {
        setModalVisible(false);
      }
      return true;
    };
    const sub = BackHandler.addEventListener('hardwareBackPress', onBack);
    return () => sub.remove();
  }, [modalVisible, step]);

  const fetchOrders = useCallback(async () => {
    try {
      const { data } = await api.get(`/api/orders?dateFrom=${today}&limit=50`);
      setOrders(data?.data || data || []);
    } catch {} finally { setLoading(false); setRefreshing(false); }
  }, [today]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const openNewOrder = async () => {
    setModalVisible(true);
    setStep('customer');
    setSelectedCustomer(null);
    setCart({});
    setProductSearch('');
    setSelectedCategory('ALL');
    try {
      const [cRes, pRes, catRes] = await Promise.all([
        api.get('/api/customers?limit=100'),
        api.get('/api/products?limit=100'),
        api.get('/api/categories'),
      ]);
      setCustomers(cRes.data?.data || cRes.data || []);
      setProducts((pRes.data?.data || pRes.data || []).filter((p: any) => p.isActive));
      setCategories(catRes.data?.data || catRes.data || []);
    } catch {}
  };

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 15);
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) =>
      (c.storeName ?? '').toLowerCase().includes(q) || (c.phone ?? '').includes(q)
    ).slice(0, 15);
  }, [customers, customerSearch]);

  const filteredProducts = useMemo(() => {
    let list = products;
    if (selectedCategory !== 'ALL') {
      list = list.filter((p: any) => p.categoryId === selectedCategory);
    }
    if (productSearch) {
      const q = productSearch.toLowerCase();
      list = list.filter((p: any) => (p.name ?? '').toLowerCase().includes(q) || (p.sku ?? '').includes(q));
    }
    return list;
  }, [products, selectedCategory, productSearch]);

  const cartItems = Object.entries(cart).filter(([, v]) => v.qty > 0);
  const cartTotal = cartItems.reduce((s, [, v]) => s + v.qty * v.unitPrice, 0);
  const cartCount = cartItems.reduce((s, [, v]) => s + v.qty, 0);

  const setQty = (product: any, newQty: number) => {
    const id = product.id;
    if (newQty <= 0) {
      setCart(prev => { const next = { ...prev }; delete next[id]; return next; });
    } else {
      setCart(prev => ({
        ...prev,
        [id]: {
          name: product.name,
          qty: Math.min(newQty, product.stockAvailable ?? 999),
          unitPrice: Number(product.sellingPrice ?? 0),
          stock: product.stockAvailable ?? 0,
          unitsPerBox: product.unitsPerBox ?? 1,
        },
      }));
    }
  };

  const addBox = (product: any) => {
    const upb = product.unitsPerBox ?? 1;
    const current = cart[product.id]?.qty ?? 0;
    setQty(product, current + upb);
  };

  const handleSubmit = async () => {
    if (!selectedCustomer || cartItems.length === 0) return;
    setSubmitting(true);
    try {
      await api.post('/api/orders/admin', {
        customerId: selectedCustomer.id,
        items: cartItems.map(([productId, v]) => ({ productId, quantity: v.qty })),
      });
      Alert.alert('Амжилттай', 'Захиалга бүртгэгдлээ');
      setModalVisible(false);
      fetchOrders();
    } catch (e: any) {
      Alert.alert('Алдаа', e?.response?.data?.message || 'Алдаа гарлаа');
    } finally { setSubmitting(false); }
  };

  const getApiUrl = () => { try { const { getCurrentBaseUrl } = require('../../src/lib/api'); return getCurrentBaseUrl(); } catch { return process.env.EXPO_PUBLIC_API_URL || 'http://10.0.2.2:3000'; } };

  if (loading) {
    return <SafeAreaView style={s.center}><ActivityIndicator size="large" color="#007AFF" /></SafeAreaView>;
  }

  return (
    <SafeAreaView style={s.container}>
      <View style={s.header}>
        <Text style={s.headerTitle}>Захиалга</Text>
        <Text style={s.headerSub}>Өнөөдрийн ({orders.length})</Text>
      </View>

      <FlatList
        data={orders}
        keyExtractor={(item) => item.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => { setRefreshing(true); fetchOrders(); }} />}
        ListEmptyComponent={
          <View style={s.empty}><Ionicons name="clipboard-outline" size={48} color="#D0D2DA" /><Text style={s.emptyText}>Захиалга байхгүй</Text></View>
        }
        renderItem={({ item }) => {
          const st = STATUS_COLORS[item.status] ?? STATUS_COLORS.PENDING;
          return (
            <View style={s.orderCard}>
              <View style={s.row}>
                <Text style={s.orderNum}>#{item.orderNumber}</Text>
                <View style={[s.badge, { backgroundColor: st.bg }]}><Text style={[s.badgeText, { color: st.text }]}>{st.label}</Text></View>
              </View>
              <Text style={s.orderCustomer}>{item.customer?.storeName ?? '-'}</Text>
              <View style={s.row}>
                <Text style={s.orderAmount}>₮{Number(item.totalAmount ?? 0).toLocaleString()}</Text>
                <Text style={s.orderTime}>{item.createdAt ? new Date(item.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}</Text>
              </View>
            </View>
          );
        }}
      />

      {/* FAB */}
      <TouchableOpacity style={s.fab} onPress={openNewOrder}>
        <Ionicons name="add" size={22} color="#fff" />
        <Text style={s.fabText}>Захиалга авах</Text>
      </TouchableOpacity>

      {/* =================== NEW ORDER MODAL =================== */}
      <Modal visible={modalVisible} animationType="slide">
        <SafeAreaView style={s.container}>
          {/* Modal Header */}
          <View style={s.modalHeader}>
            <TouchableOpacity onPress={() => { if (step === 'products') setStep('customer'); else setModalVisible(false); }}>
              <Text style={s.modalBack}>{step === 'products' ? '← Буцах' : 'Болих'}</Text>
            </TouchableOpacity>
            <Text style={s.modalTitle}>{step === 'customer' ? 'Харилцагч' : 'Бараа сонгох'}</Text>
            {cartItems.length > 0 ? (
              <TouchableOpacity onPress={handleSubmit} disabled={submitting}>
                <Text style={s.modalDone}>{submitting ? '...' : `Илгээх (${cartCount})`}</Text>
              </TouchableOpacity>
            ) : <View style={{ width: 60 }} />}
          </View>

          {/* Step 1: Customer */}
          {step === 'customer' && (
            <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
              <TextInput
                style={s.searchInput}
                placeholder="Харилцагч хайх (нэр, утас)..."
                placeholderTextColor="#A0A3B1"
                value={customerSearch}
                onChangeText={setCustomerSearch}
              />
              {filteredCustomers.map((c: any) => (
                <TouchableOpacity
                  key={c.id}
                  style={[s.custItem, selectedCustomer?.id === c.id && s.custItemActive]}
                  onPress={() => { setSelectedCustomer(c); setStep('products'); }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={s.custName}>{c.storeName}</Text>
                    <Text style={s.custDetail}>{c.phone ?? ''} · {c.address ?? ''}</Text>
                  </View>
                  {selectedCustomer?.id === c.id && <Ionicons name="checkmark-circle" size={22} color="#10B981" />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Step 2: Products */}
          {step === 'products' && (
            <View style={{ flex: 1 }}>
              {/* Selected customer banner */}
              <View style={s.custBanner}>
                <Ionicons name="person" size={16} color="#10B981" />
                <Text style={s.custBannerText}>{selectedCustomer?.storeName}</Text>
                <TouchableOpacity onPress={() => setStep('customer')}><Text style={s.custBannerChange}>Солих</Text></TouchableOpacity>
              </View>

              {/* Search */}
              <View style={{ paddingHorizontal: 16, paddingTop: 8 }}>
                <View style={s.searchRow}>
                  <Ionicons name="search" size={18} color="#A0A3B1" />
                  <TextInput
                    style={s.searchField}
                    placeholder="Бараа хайх (нэр, баркод)..."
                    placeholderTextColor="#A0A3B1"
                    value={productSearch}
                    onChangeText={setProductSearch}
                  />
                  {productSearch.length > 0 && (
                    <TouchableOpacity onPress={() => setProductSearch('')}><Ionicons name="close-circle" size={18} color="#A0A3B1" /></TouchableOpacity>
                  )}
                </View>
              </View>

              {/* Category Filter */}
              <View style={{ marginTop: 8, marginBottom: 4 }}>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, gap: 6, alignItems: 'center' }}>
                <TouchableOpacity
                  style={[s.catChip, selectedCategory === 'ALL' && s.catChipActive]}
                  onPress={() => setSelectedCategory('ALL')}
                >
                  <Text style={[s.catChipText, selectedCategory === 'ALL' && s.catChipTextActive]}>Бүгд</Text>
                </TouchableOpacity>
                {categories.map((cat: any) => (
                  <TouchableOpacity
                    key={cat.id}
                    style={[s.catChip, selectedCategory === cat.id && s.catChipActive]}
                    onPress={() => setSelectedCategory(cat.id)}
                  >
                    <Text style={[s.catChipText, selectedCategory === cat.id && s.catChipTextActive]}>{cat.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              </View>

              {/* Product Grid */}
              <FlatList
                data={filteredProducts}
                numColumns={2}
                keyExtractor={(item) => item.id}
                contentContainerStyle={{ padding: 12, paddingBottom: cartItems.length > 0 ? 140 : 20 }}
                columnWrapperStyle={{ gap: GRID_GAP }}
                renderItem={({ item: p }) => <ProductCard p={p} cart={cart} setQty={setQty} addBox={addBox} getApiUrl={getApiUrl} />}
                ItemSeparatorComponent={() => <View style={{ height: GRID_GAP }} />}
              />

              {/* Cart Summary Bar */}
              {cartItems.length > 0 && (
                <View style={s.cartBar}>
                  <View>
                    <Text style={s.cartBarCount}>{cartItems.length} бараа · {cartCount} ш</Text>
                    <Text style={s.cartBarTotal}>₮{cartTotal.toLocaleString()}</Text>
                  </View>
                  <TouchableOpacity style={s.cartBarBtn} onPress={handleSubmit} disabled={submitting}>
                    {submitting ? <ActivityIndicator color="#fff" /> : <Text style={s.cartBarBtnText}>Захиалга илгээх</Text>}
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// =================== PRODUCT CARD WITH BOX/PIECE TOGGLE ===================
function ProductCard({ p, cart, setQty, addBox, getApiUrl }: any) {
  const [mode, setMode] = useState<'box' | 'piece'>('box');
  const qty = cart[p.id]?.qty ?? 0;
  const stock = p.stockAvailable ?? 0;
  const upb = p.unitsPerBox ?? 1;
  const hasImage = !!p.imageUrl;
  const boxes = upb > 1 ? Math.floor(qty / upb) : 0;
  const pieces = upb > 1 ? qty % upb : qty;
  const hasBoxOption = upb > 1;

  const increment = () => {
    if (mode === 'box' && hasBoxOption) addBox(p);
    else setQty(p, qty + 1);
  };
  const decrement = () => {
    if (mode === 'box' && hasBoxOption) setQty(p, Math.max(0, qty - upb));
    else setQty(p, qty - 1);
  };

  return (
    <View style={[s.prodCard, qty > 0 && s.prodCardActive, { width: CARD_W }]}>
      {/* Image */}
      <View style={s.prodImgWrap}>
        {hasImage ? (
          <Image source={{ uri: `${getApiUrl()}${p.imageUrl}` }} style={s.prodImg} resizeMode="cover" />
        ) : (
          <View style={s.prodImgPlaceholder}><Ionicons name="cube-outline" size={28} color="#D0D2DA" /></View>
        )}
        <View style={[s.stockBadge, stock <= 0 ? s.stockOut : stock <= 5 ? s.stockLow : s.stockOk]}>
          <Text style={s.stockText}>{stock}</Text>
        </View>
      </View>

      {/* Info */}
      <Text style={s.prodName} numberOfLines={2}>{p.name}</Text>
      <Text style={s.prodPrice}>₮{Number(p.sellingPrice ?? 0).toLocaleString()}</Text>

      {/* Box/Piece Toggle */}
      {hasBoxOption && (
        <View style={s.toggleRow}>
          <TouchableOpacity
            style={[s.toggleBtn, mode === 'box' && s.toggleActive]}
            onPress={() => setMode('box')}
          >
            <Text style={[s.toggleText, mode === 'box' && s.toggleTextActive]}>Хайрцаг</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[s.toggleBtn, mode === 'piece' && s.toggleActive]}
            onPress={() => setMode('piece')}
          >
            <Text style={[s.toggleText, mode === 'piece' && s.toggleTextActive]}>Ширхэг</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Qty Controls */}
      {qty > 0 ? (
        <View>
          <View style={s.qtyRow}>
            <TouchableOpacity style={s.qtyBtn} onPress={decrement}>
              <Text style={s.qtyBtnText}>−</Text>
            </TouchableOpacity>
            <View style={s.qtyCenter}>
              <Text style={s.qtyNum}>{mode === 'box' && hasBoxOption ? boxes : qty}</Text>
              <Text style={s.qtyUnit}>{mode === 'box' && hasBoxOption ? 'хайрцаг' : 'ширхэг'}</Text>
            </View>
            <TouchableOpacity style={s.qtyBtn} onPress={increment} disabled={qty >= stock}>
              <Text style={s.qtyBtnText}>+</Text>
            </TouchableOpacity>
          </View>
          {hasBoxOption && <Text style={s.qtyBreakdown}>Нийт: {boxes}х + {pieces}ш = {qty}ш</Text>}
        </View>
      ) : (
        <TouchableOpacity
          style={[s.addFullBtn, stock <= 0 && { opacity: 0.3 }]}
          onPress={() => { if (mode === 'box' && hasBoxOption) addBox(p); else setQty(p, 1); }}
          disabled={stock <= 0}
        >
          <Ionicons name="add" size={16} color="#fff" />
          <Text style={s.addFullText}>{mode === 'box' && hasBoxOption ? '1 хайрцаг' : '1 ширхэг'}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA' },
  header: { paddingTop: 52, paddingHorizontal: 16, paddingBottom: 4 },
  headerTitle: { fontSize: 24, fontWeight: '700', color: '#1A1D26' },
  headerSub: { fontSize: 13, color: '#8C8FA3', marginTop: 2 },
  empty: { alignItems: 'center', paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 15, color: '#8C8FA3' },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  orderCard: { backgroundColor: '#fff', borderRadius: 14, padding: 14, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  orderNum: { fontSize: 15, fontWeight: '700', color: '#007AFF' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  orderCustomer: { fontSize: 13, color: '#4A4D5C', marginVertical: 4 },
  orderAmount: { fontSize: 16, fontWeight: '700', color: '#1A1D26' },
  orderTime: { fontSize: 12, color: '#8C8FA3' },
  fab: {
    position: 'absolute', bottom: 20, left: 16, right: 16,
    backgroundColor: '#007AFF', borderRadius: 14, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    shadowColor: '#007AFF', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 6,
  },
  fabText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  // Modal
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: '#E8ECF0' },
  modalBack: { color: '#007AFF', fontSize: 15, fontWeight: '600' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1A1D26' },
  modalDone: { color: '#10B981', fontSize: 15, fontWeight: '700' },
  // Customer
  searchInput: { backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8ECF0', paddingHorizontal: 14, paddingVertical: 12, fontSize: 15, color: '#1A1D26', marginBottom: 8 },
  custItem: { backgroundColor: '#fff', borderRadius: 12, padding: 14, marginBottom: 6, borderWidth: 1, borderColor: '#E8ECF0', flexDirection: 'row', alignItems: 'center' },
  custItemActive: { borderColor: '#10B981', backgroundColor: '#ECFDF5' },
  custName: { fontSize: 15, fontWeight: '600', color: '#1A1D26' },
  custDetail: { fontSize: 12, color: '#8C8FA3', marginTop: 2 },
  custBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#ECFDF5', paddingHorizontal: 16, paddingVertical: 10, borderBottomWidth: 1, borderColor: '#A7F3D0' },
  custBannerText: { flex: 1, fontSize: 14, fontWeight: '600', color: '#1A1D26' },
  custBannerChange: { fontSize: 13, color: '#007AFF', fontWeight: '600' },
  // Search
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#fff', borderRadius: 12, borderWidth: 1, borderColor: '#E8ECF0', paddingHorizontal: 12, paddingVertical: 10 },
  searchField: { flex: 1, fontSize: 14, color: '#1A1D26' },
  // Category
  catChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8ECF0', height: 36, justifyContent: 'center' },
  catChipActive: { backgroundColor: '#007AFF', borderColor: '#007AFF' },
  catChipText: { fontSize: 13, fontWeight: '600', color: '#4A4D5C' },
  catChipTextActive: { color: '#fff' },
  // Product Grid
  prodCard: { backgroundColor: '#fff', borderRadius: 14, padding: 10, borderWidth: 1, borderColor: '#E8ECF0' },
  prodCardActive: { borderColor: '#007AFF', backgroundColor: '#EFF6FF' },
  prodImgWrap: { width: '100%', height: 100, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F5F6FA', marginBottom: 8, position: 'relative' },
  prodImg: { width: '100%', height: '100%' },
  prodImgPlaceholder: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  stockBadge: { position: 'absolute', top: 6, right: 6, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 6 },
  stockOk: { backgroundColor: '#ECFDF5' },
  stockLow: { backgroundColor: '#FFFBEB' },
  stockOut: { backgroundColor: '#FEF2F2' },
  stockText: { fontSize: 10, fontWeight: '700', color: '#1A1D26' },
  prodName: { fontSize: 13, fontWeight: '600', color: '#1A1D26', marginBottom: 2, lineHeight: 17 },
  prodPrice: { fontSize: 13, fontWeight: '700', color: '#007AFF', marginBottom: 6 },
  prodBox: { fontSize: 10, color: '#8C8FA3', marginBottom: 6 },
  toggleRow: { flexDirection: 'row', backgroundColor: '#E8ECF0', borderRadius: 8, padding: 2, marginBottom: 6 },
  toggleBtn: { flex: 1, paddingVertical: 5, alignItems: 'center', borderRadius: 6 },
  toggleActive: { backgroundColor: '#007AFF' },
  toggleText: { fontSize: 11, fontWeight: '600', color: '#4A4D5C' },
  toggleTextActive: { color: '#fff' },
  // Qty
  qtyRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, backgroundColor: '#F5F6FA', borderWidth: 1, borderColor: '#E8ECF0', justifyContent: 'center', alignItems: 'center' },
  qtyBtnText: { fontSize: 18, fontWeight: '600', color: '#4A4D5C' },
  qtyInput: { flex: 1, height: 32, textAlign: 'center', fontSize: 15, fontWeight: '700', color: '#1A1D26', backgroundColor: '#fff', borderRadius: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  qtyBreakdown: { fontSize: 10, color: '#007AFF', fontWeight: '600', textAlign: 'center', marginTop: 2 },
  addRow: { flexDirection: 'row', gap: 4, marginTop: 4 },
  addBoxBtn: { flex: 1, backgroundColor: '#EFF6FF', borderRadius: 8, paddingVertical: 8, alignItems: 'center', borderWidth: 1, borderColor: '#007AFF30' },
  addBoxText: { fontSize: 12, fontWeight: '700', color: '#007AFF' },
  addOneBtn: { width: 36, height: 36, borderRadius: 8, backgroundColor: '#007AFF', justifyContent: 'center', alignItems: 'center' },
  addFullBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 4, backgroundColor: '#007AFF', borderRadius: 8, paddingVertical: 8 },
  addFullText: { fontSize: 12, fontWeight: '700', color: '#fff' },
  qtyCenter: { flex: 1, alignItems: 'center' },
  qtyNum: { fontSize: 18, fontWeight: '700', color: '#1A1D26' },
  qtyUnit: { fontSize: 10, color: '#8C8FA3', marginTop: -2 },
  // Cart bar
  cartBar: {
    position: 'absolute', bottom: 0, left: 0, right: 0,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', paddingHorizontal: 16, paddingVertical: 12,
    borderTopWidth: 1, borderColor: '#E8ECF0',
    shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 8,
  },
  cartBarCount: { fontSize: 12, color: '#8C8FA3' },
  cartBarTotal: { fontSize: 18, fontWeight: '700', color: '#1A1D26' },
  cartBarBtn: { backgroundColor: '#10B981', paddingHorizontal: 20, paddingVertical: 12, borderRadius: 12 },
  cartBarBtnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
});
