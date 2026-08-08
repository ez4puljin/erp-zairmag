'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import {
  ShoppingCart, Plus, X, Search, Check, Package,
  RefreshCw, User, Clock,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

const STATUS_COLORS: Record<string, { label: string; color: string; bg: string }> = {
  PENDING: { label: 'Хүлээгдэж буй', color: '#FF9500', bg: '#FFF7ED' },
  APPROVED: { label: 'Зөвшөөрсөн', color: '#007AFF', bg: '#EFF6FF' },
  SHIPPING: { label: 'Хүргэлтэнд', color: '#5856D6', bg: '#EEF2FF' },
  DELIVERED: { label: 'Хүргэсэн', color: '#10B981', bg: '#ECFDF5' },
  CANCELLED: { label: 'Цуцалсан', color: '#EF4444', bg: '#FEF2F2' },
};

export default function DriverOrdersPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showNew, setShowNew] = useState(false);

  // New order form
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [cart, setCart] = useState<{ productId: string; name: string; qty: number; unitPrice: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const today = new Date().toISOString().split('T')[0];
      const res = await api.get('/api/orders', { params: { dateFrom: today, limit: 50 } });
      setOrders(res.data?.data ?? res.data ?? []);
    } catch {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  useEffect(() => {
    if (!showNew) return;
    Promise.all([
      api.get('/api/customers', { params: { limit: 100 } }),
      api.get('/api/products', { params: { limit: 100 } }),
    ]).then(([cRes, pRes]) => {
      setCustomers(cRes.data?.data ?? cRes.data ?? []);
      setProducts((pRes.data?.data ?? pRes.data ?? []).filter((p: any) => p.isActive));
    }).catch(() => {});
  }, [showNew]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 20);
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) =>
      (c.storeName ?? '').toLowerCase().includes(q) ||
      (c.phone ?? '').includes(q)
    ).slice(0, 20);
  }, [customers, customerSearch]);

  const cartTotal = cart.reduce((s, c) => s + c.qty * c.unitPrice, 0);
  const ordersTotal = orders.reduce((s, o: any) => s + Number(o.totalAmount ?? 0), 0);

  const addToCart = (product: any) => {
    const existing = cart.find((c) => c.productId === product.id);
    if (existing) {
      setCart((prev) => prev.map((c) => c.productId === product.id ? { ...c, qty: c.qty + 1 } : c));
    } else {
      setCart((prev) => [...prev, { productId: product.id, name: product.name, qty: 1, unitPrice: Number(product.sellingPrice ?? 0) }]);
    }
  };

  const handleSubmitOrder = async () => {
    if (!selectedCustomer || cart.length === 0) {
      alert('Харилцагч болон бараа сонгоно уу.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/orders/admin', {
        customerId: selectedCustomer.id,
        items: cart.map((c) => ({ productId: c.productId, quantity: c.qty })),
      });
      setShowNew(false);
      setSelectedCustomer(null);
      setCart([]);
      setCustomerSearch('');
      fetchOrders();
      alert('Захиалга амжилттай илгээгдлээ!');
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-5 animate-ios-fade-in">
      {/* Header */}
      <PageHeader
        title="Захиалга"
        subtitle="Өнөөдрийн захиалгууд"
        icon={ShoppingCart}
        iconColor="#FF9500"
        actions={
          <button
            onClick={() => setShowNew(true)}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-white text-[13px] font-semibold shadow-sm shadow-[#FF9500]/25 transition-all active:scale-[0.97] hover:brightness-105"
            style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}
          >
            <Plus className="w-4 h-4" /> Захиалга авах
          </button>
        }
      />

      {/* KPIs */}
      <StatGrid cols={2}>
        <StatCard label="Өнөөдрийн захиалга" value={orders.length} icon={ShoppingCart} gradient="orange" index={0} />
        <StatCard label="Нийт дүн" value={formatMnt(ordersTotal)} icon={Package} gradient="green" index={1} />
      </StatGrid>

      {/* Today's orders */}
      <SectionCard title="Өнөөдрийн захиалга" noPadding>
        {loading ? (
          <div className="py-14 text-center"><RefreshCw className="w-6 h-6 text-[#8C8FA3] mx-auto animate-spin" /></div>
        ) : orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Захиалга алга" hint="Өнөөдөр захиалга авагдаагүй байна" />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {orders.map((order: any) => {
              const st = STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING;
              return (
                <div key={order.id} className="px-4 lg:px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors">
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-bold text-[#007AFF]">#{order.orderNumber}</span>
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                        {st.label}
                      </span>
                    </div>
                    <span className="text-[15px] font-bold text-[#1A1D26] tabular-nums">{formatMnt(order.totalAmount)}</span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-[#8C8FA3]">
                    <span className="flex items-center gap-1 min-w-0">
                      <User className="w-3 h-3 shrink-0" />
                      <span className="truncate text-[#4A4D5C] font-medium">{order.customer?.storeName ?? 'Харилцагч'}</span>
                    </span>
                    <span className="flex items-center gap-1 shrink-0">
                      <Clock className="w-3 h-3" />
                      {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* New Order Bottom Sheet */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowNew(false); setSelectedCustomer(null); setCart([]); setCustomerSearch(''); }} />
          <div className="relative mt-auto bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto animate-ios-slide-up">
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-[#F0F2F5] flex items-center justify-between rounded-t-3xl">
              <h2 className="text-[16px] font-bold text-[#1A1D26]">Захиалга авах</h2>
              <button onClick={() => { setShowNew(false); setSelectedCustomer(null); setCart([]); setCustomerSearch(''); }} className="p-2 rounded-lg hover:bg-[#F5F6FA] transition-colors">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Customer selection */}
              {!selectedCustomer ? (
                <div>
                  <label className="text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wide mb-1.5 block">Харилцагч сонгох</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A3B1]" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Нэр, утас хайх..."
                      className="w-full pl-10 pr-4 h-11 rounded-xl bg-[#F5F6FA] border border-transparent text-[14px] text-[#1A1D26] outline-none focus:border-[#007AFF]/40 focus:bg-white transition-all"
                    />
                  </div>
                  <div className="space-y-1.5 max-h-[200px] overflow-y-auto">
                    {filteredCustomers.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className="w-full text-left p-3 rounded-xl bg-white hover:bg-[#F5F6FA] border border-[#E8ECF0]/70 transition-colors"
                      >
                        <p className="text-[13px] font-semibold text-[#1A1D26]">{c.storeName}</p>
                        <p className="text-[11px] text-[#8C8FA3]">{c.phone ?? ''} · {c.address ?? ''}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                  <div className="w-9 h-9 rounded-xl bg-white/70 flex items-center justify-center shrink-0">
                    <Check className="w-5 h-5 text-[#10B981]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-[#1A1D26] truncate">{selectedCustomer.storeName}</p>
                    <p className="text-[11px] text-[#8C8FA3]">{selectedCustomer.phone}</p>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-1.5 rounded-lg hover:bg-white/60 transition-colors">
                    <X className="w-4 h-4 text-[#8C8FA3]" />
                  </button>
                </div>
              )}

              {/* Product selection */}
              {selectedCustomer && (
                <div>
                  <label className="text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wide mb-1.5 block">
                    Бараа сонгох
                    {cart.length > 0 && <span className="ml-2 text-[#007AFF] normal-case">{cart.length} бараа · {formatMnt(cartTotal)}</span>}
                  </label>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {products.map((p: any) => {
                      const inCart = cart.find((c) => c.productId === p.id);
                      const qty = inCart?.qty ?? 0;
                      return (
                        <div key={p.id} className={`rounded-xl border p-3 transition-colors ${qty > 0 ? 'bg-[#EFF6FF] border-[#007AFF]/30' : 'bg-white border-[#E8ECF0]/70'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 mr-2 min-w-0">
                              <p className="text-[13px] font-semibold text-[#1A1D26] truncate">{p.name}</p>
                              <p className="text-[10px] text-[#8C8FA3]">{formatMnt(p.sellingPrice)} · Нөөц: {p.stockAvailable ?? 0}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (qty <= 1) setCart((prev) => prev.filter((c) => c.productId !== p.id));
                                else setCart((prev) => prev.map((c) => c.productId === p.id ? { ...c, qty: c.qty - 1 } : c));
                              }}
                              disabled={qty <= 0}
                              className="w-10 h-10 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70 flex items-center justify-center text-[16px] font-bold text-[#4A4D5C] disabled:opacity-30 active:scale-95 transition-all"
                            >−</button>
                            <span className="w-10 text-center text-[14px] font-bold text-[#1A1D26] tabular-nums">{qty}</span>
                            <button
                              onClick={() => addToCart(p)}
                              className="w-10 h-10 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70 flex items-center justify-center text-[16px] font-bold text-[#4A4D5C] active:scale-95 transition-all"
                            >+</button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Submit */}
              {selectedCustomer && (
                <button
                  onClick={handleSubmitOrder}
                  disabled={submitting || cart.length === 0}
                  className="w-full h-12 rounded-xl text-white text-[14px] font-semibold shadow-sm shadow-[#FF9500]/25 disabled:opacity-50 active:scale-[0.99] transition-all"
                  style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}
                >
                  {submitting ? 'Илгээж байна...' : `Захиалга илгээх · ${formatMnt(cartTotal)}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
