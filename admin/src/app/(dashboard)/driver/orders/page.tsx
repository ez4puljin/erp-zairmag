'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import {
  ShoppingCart, Plus, X, Search, Check, Package,
  RefreshCw, User, Clock,
} from 'lucide-react';

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
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-[18px] font-bold text-[#1A1D26]">Захиалга</h2>
        <button
          onClick={() => setShowNew(true)}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-[#FF9500] text-white text-[13px] font-semibold shadow-md shadow-[#FF9500]/25"
        >
          <Plus className="w-4 h-4" /> Захиалга авах
        </button>
      </div>

      {/* Today's orders */}
      {loading ? (
        <div className="py-12 text-center"><RefreshCw className="w-6 h-6 text-[#8C8FA3] mx-auto animate-spin" /></div>
      ) : orders.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8ECF0] py-12 text-center">
          <ShoppingCart className="w-10 h-10 text-[#D0D2DA] mx-auto mb-3" />
          <p className="text-[14px] text-[#8C8FA3]">Өнөөдөр захиалга авагдаагүй</p>
        </div>
      ) : (
        <div className="space-y-2">
          {orders.map((order: any) => {
            const st = STATUS_COLORS[order.status] ?? STATUS_COLORS.PENDING;
            return (
              <div key={order.id} className="bg-white rounded-xl border border-[#E8ECF0] p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-[14px] font-bold text-[#007AFF]">#{order.orderNumber}</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: st.bg, color: st.color }}>
                    {st.label}
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-[#8C8FA3] mb-1">
                  <User className="w-3 h-3" />
                  <span>{order.customer?.storeName ?? 'Харилцагч'}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8C8FA3] flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {order.createdAt ? new Date(order.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                  <span className="text-[15px] font-bold text-[#1A1D26]">₮{Number(order.totalAmount ?? 0).toLocaleString()}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* New Order Bottom Sheet */}
      {showNew && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowNew(false); setSelectedCustomer(null); setCart([]); setCustomerSearch(''); }} />
          <div className="relative mt-auto bg-white rounded-t-3xl shadow-2xl max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-[#E8ECF0] flex items-center justify-between rounded-t-3xl">
              <h2 className="text-[16px] font-bold text-[#1A1D26]">Захиалга авах</h2>
              <button onClick={() => { setShowNew(false); setSelectedCustomer(null); setCart([]); setCustomerSearch(''); }} className="p-2 rounded-lg hover:bg-[#F5F6FA]">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            <div className="p-4 space-y-4">
              {/* Customer selection */}
              {!selectedCustomer ? (
                <div>
                  <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Харилцагч сонгох</label>
                  <div className="relative mb-2">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A3B1]" />
                    <input
                      type="text"
                      value={customerSearch}
                      onChange={(e) => setCustomerSearch(e.target.value)}
                      placeholder="Нэр, утас хайх..."
                      className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {filteredCustomers.map((c: any) => (
                      <button
                        key={c.id}
                        onClick={() => setSelectedCustomer(c)}
                        className="w-full text-left p-3 rounded-xl hover:bg-[#F5F6FA] border border-[#E8ECF0]"
                      >
                        <p className="text-[13px] font-semibold text-[#1A1D26]">{c.storeName}</p>
                        <p className="text-[11px] text-[#8C8FA3]">{c.phone ?? ''} · {c.address ?? ''}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                  <Check className="w-5 h-5 text-[#10B981]" />
                  <div className="flex-1">
                    <p className="text-[13px] font-semibold text-[#1A1D26]">{selectedCustomer.storeName}</p>
                    <p className="text-[11px] text-[#8C8FA3]">{selectedCustomer.phone}</p>
                  </div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded hover:bg-white/50">
                    <X className="w-4 h-4 text-[#8C8FA3]" />
                  </button>
                </div>
              )}

              {/* Product selection */}
              {selectedCustomer && (
                <div>
                  <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">
                    Бараа сонгох
                    {cart.length > 0 && <span className="ml-2 text-[#007AFF]">{cart.length} бараа · ₮{cartTotal.toLocaleString()}</span>}
                  </label>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {products.map((p: any) => {
                      const inCart = cart.find((c) => c.productId === p.id);
                      const qty = inCart?.qty ?? 0;
                      return (
                        <div key={p.id} className={`rounded-xl border p-3 ${qty > 0 ? 'bg-[#EFF6FF] border-[#007AFF]/30' : 'bg-white border-[#E8ECF0]'}`}>
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex-1 mr-2">
                              <p className="text-[13px] font-semibold text-[#1A1D26] truncate">{p.name}</p>
                              <p className="text-[10px] text-[#8C8FA3]">₮{Number(p.sellingPrice ?? 0).toLocaleString()} · Нөөц: {p.stockAvailable ?? 0}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                if (qty <= 1) setCart((prev) => prev.filter((c) => c.productId !== p.id));
                                else setCart((prev) => prev.map((c) => c.productId === p.id ? { ...c, qty: c.qty - 1 } : c));
                              }}
                              disabled={qty <= 0}
                              className="w-10 h-10 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] flex items-center justify-center text-[16px] font-bold disabled:opacity-30"
                            >−</button>
                            <span className="w-10 text-center text-[14px] font-bold text-[#1A1D26]">{qty}</span>
                            <button
                              onClick={() => addToCart(p)}
                              className="w-10 h-10 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] flex items-center justify-center text-[16px] font-bold"
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
                  className="w-full py-3.5 rounded-xl bg-[#FF9500] text-white text-[14px] font-semibold disabled:opacity-50"
                >
                  {submitting ? 'Илгээж байна...' : `Захиалга илгээх · ₮${cartTotal.toLocaleString()}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
