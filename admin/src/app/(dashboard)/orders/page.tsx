'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  ShoppingCart, Plus, X, Package, User,
  RefreshCw, CheckCircle, Truck, Printer, Search,
  DollarSign, CreditCard, Banknote, Building2, Clock,
} from 'lucide-react';

const COLUMNS = [
  { id: 'pending', label: 'Захиалга', status: 'PENDING', color: '#FF9500', bg: '#FFF7ED', border: '#FED7AA' },
  { id: 'approved', label: 'Бэлдэж буй', status: 'APPROVED', color: '#007AFF', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'shipping', label: 'Хүргэлт', status: 'SHIPPING', color: '#AF52DE', bg: '#F5F3FF', border: '#DDD6FE' },
  { id: 'delivered', label: 'Баримт хэвлэх', status: 'DELIVERED', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  { id: 'archive', label: 'Архив', status: 'ARCHIVE', color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
];

const PAYMENT_LABELS: Record<string, { label: string; color: string }> = {
  CASH: { label: 'Бэлэн', color: '#10B981' },
  BANK_TRANSFER: { label: 'Шилжүүлэг', color: '#007AFF' },
  CARD: { label: 'Карт', color: '#5856D6' },
  CREDIT: { label: 'Зээл', color: '#F59E0B' },
  COMBINED: { label: 'Хосолсон', color: '#EF4444' },
};

const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15';

export default function OrdersKanban() {
  const router = useRouter();
  const [orders, setOrders] = useState<any[]>([]);
  const [archiveOrders, setArchiveOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState(0);
  const [showNewOrder, setShowNewOrder] = useState(false);
  const [driverModal, setDriverModal] = useState<string | null>(null);
  const [paymentModal, setPaymentModal] = useState<string | null>(null);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [customers, setCustomers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [customerSearch, setCustomerSearch] = useState('');
  const [cart, setCart] = useState<{ productId: string; name: string; qty: number; unitPrice: number }[]>([]);
  const [orderPaymentMethod, setOrderPaymentMethod] = useState('CASH');
  const [orderNotes, setOrderNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [activeRes, archiveRes] = await Promise.all([
        api.get('/api/orders', { params: { statuses: 'PENDING,APPROVED,SHIPPING,DELIVERED', limit: 100 } }),
        api.get('/api/orders', { params: { statuses: 'CANCELLED', limit: 30 } }),
      ]);
      setOrders(activeRes.data?.data ?? activeRes.data ?? []);
      setArchiveOrders(archiveRes.data?.data ?? archiveRes.data ?? []);
    } catch (e) { console.error(e); } finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);
  useEffect(() => { const i = setInterval(fetchOrders, 30000); return () => clearInterval(i); }, [fetchOrders]);

  useEffect(() => {
    if (!showNewOrder && !driverModal) return;
    const p: Promise<any>[] = [];
    if (showNewOrder) {
      p.push(api.get('/api/customers', { params: { limit: 100 } }).then(r => setCustomers(r.data?.data ?? r.data ?? [])));
      p.push(api.get('/api/products', { params: { limit: 100 } }).then(r => setProducts((r.data?.data ?? r.data ?? []).filter((pr: any) => pr.isActive))));
    }
    if (driverModal) p.push(api.get('/api/drivers').then(r => setDrivers(r.data?.data ?? r.data ?? [])));
    Promise.all(p).catch(() => {});
  }, [showNewOrder, driverModal]);

  const columnData = COLUMNS.map((col) => {
    if (col.status === 'PENDING') return { ...col, items: orders.filter((o) => o.status === 'PENDING') };
    if (col.status === 'APPROVED') return { ...col, items: orders.filter((o) => o.status === 'APPROVED') };
    if (col.status === 'SHIPPING') return { ...col, items: orders.filter((o) => o.status === 'SHIPPING') };
    if (col.status === 'DELIVERED') return { ...col, items: orders.filter((o) => o.status === 'DELIVERED' && !o.receiptPrintedAt) };
    return { ...col, items: [...orders.filter((o) => o.status === 'DELIVERED' && o.receiptPrintedAt), ...archiveOrders] };
  });

  // Actions
  const doAction = async (fn: () => Promise<any>) => { try { await fn(); fetchOrders(); } catch (e: any) { alert(e.response?.data?.message ?? 'Алдаа'); } };

  const handleApprove = (id: string) => { if (!confirm('Захиалга батлах уу?')) return; setActionLoading(id); doAction(() => api.patch(`/api/orders/${id}/status`, { status: 'APPROVED' })).finally(() => setActionLoading(null)); };
  const handleShip = (orderId: string, driverId: string) => { setActionLoading(orderId); doAction(() => api.patch(`/api/orders/${orderId}/status`, { status: 'SHIPPING', driverId })).then(() => setDriverModal(null)).finally(() => setActionLoading(null)); };
  const handleDeliver = (orderId: string, pm: string) => { setActionLoading(orderId); doAction(() => api.patch(`/api/orders/${orderId}/status`, { status: 'DELIVERED', paymentMethod: pm })).then(() => setPaymentModal(null)).finally(() => setActionLoading(null)); };
  const handleCancel = (id: string) => { if (!confirm('Захиалга цуцлах уу?')) return; setActionLoading(id); doAction(() => api.patch(`/api/orders/${id}/cancel`)).finally(() => setActionLoading(null)); };

  const handlePrint = async (order: any) => {
    const c = order.customer ?? {};
    const items = order.items ?? [];
    const d = order.deliveryRoute?.driver;
    const dn = d ? `${d.lastName ?? ''} ${d.firstName ?? ''}`.trim() : '-';
    const pm = PAYMENT_LABELS[order.paymentMethod]?.label ?? order.paymentMethod ?? '-';
    const total = Number(order.totalAmount ?? 0);
    const date = new Date().toLocaleString('mn-MN');
    const build = (copy: string) => {
      let r = `====================================\n      ЗАХИАЛГЫН БАРИМТ\n       ${copy}\n====================================\nЗахиалга №: ${order.orderNumber}\nОгноо:      ${date}\nЖолооч:     ${dn}\n------------------------------------\nХарилцагч:  ${c.storeName ?? '-'}\nУтас:       ${c.phone ?? '-'}\nХаяг:       ${c.address ?? '-'}\n------------------------------------\nБАРАА                    Тоо    Нийт`;
      for (const it of items) { r += `\n${(it.product?.name ?? '').substring(0, 24).padEnd(24)} ${String(it.quantity).padStart(4)} ${String(Number(it.lineTotal ?? 0).toLocaleString()).padStart(8)}`; }
      r += `\n------------------------------------\nНИЙТ ДҮН:               ₮${total.toLocaleString()}\nТөлбөр:                  ${pm}\n------------------------------------\n\nХүлээлгэн өгсөн: ___________________\n\nХүлээн авсан:    ___________________\n====================================`;
      return r;
    };
    const content = build('ЖОЛООЧИЙН ХУВЬ') + '\n\n' + build('ДЭЛГҮҮРИЙН ХУВЬ');
    const win = window.open('', '_blank', 'width=400,height=700');
    if (!win) { alert('Popup хаалттай.'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Захиалга №${order.orderNumber}</title><style>body{font-family:monospace;font-size:12px;margin:0;padding:8px;}pre{margin:0;white-space:pre-wrap;}.page-break{page-break-after:always;}@media print{body{margin:0;padding:4px;}}</style></head><body><pre>${content}</pre><script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script></body></html>`);
    win.document.close();
    try { await api.patch(`/api/orders/${order.id}/receipt-printed`); fetchOrders(); } catch {}
  };

  // New order
  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers.slice(0, 15);
    const q = customerSearch.toLowerCase();
    return customers.filter((c: any) => (c.storeName ?? '').toLowerCase().includes(q) || (c.phone ?? '').includes(q)).slice(0, 15);
  }, [customers, customerSearch]);
  const cartTotal = cart.reduce((s, c) => s + c.qty * c.unitPrice, 0);

  const handleCreateOrder = async () => {
    if (!selectedCustomer || cart.length === 0) { alert('Харилцагч болон бараа сонгоно уу.'); return; }
    setSubmitting(true);
    try {
      await api.post('/api/orders/admin', { customerId: selectedCustomer.id, items: cart.map(c => ({ productId: c.productId, quantity: c.qty })), paymentMethod: orderPaymentMethod, notes: orderNotes || undefined });
      setShowNewOrder(false); setSelectedCustomer(null); setCart([]); setOrderPaymentMethod('CASH'); setOrderNotes(''); setCustomerSearch(''); fetchOrders();
    } catch (e: any) { alert(e.response?.data?.message ?? 'Алдаа'); } finally { setSubmitting(false); }
  };

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 animate-ios-fade-in">
      <div className="flex items-center justify-between flex-shrink-0">
        <h1 className="text-[22px] font-bold text-[#1A1D26]">Захиалга</h1>
        <div className="flex items-center gap-2">
          <button onClick={fetchOrders} className="p-2.5 rounded-xl bg-white border border-[#E8ECF0] hover:bg-[#F5F6FA]">
            <RefreshCw className={`w-4 h-4 text-[#8C8FA3] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button onClick={() => setShowNewOrder(true)} className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#FF9500] text-white text-[13px] font-semibold shadow-md shadow-[#FF9500]/25">
            <Plus className="w-4 h-4" /> Захиалга
          </button>
        </div>
      </div>

      {/* Mobile Tabs */}
      <div className="flex lg:hidden gap-1 bg-white rounded-xl p-1 border border-[#E8ECF0] flex-shrink-0 overflow-x-auto">
        {columnData.map((col, i) => (
          <button key={col.id} onClick={() => setActiveTab(i)} className={`flex-shrink-0 py-2 px-3 rounded-lg text-[10px] font-semibold ${activeTab === i ? 'bg-[#007AFF] text-white' : 'text-[#8C8FA3]'}`}>
            {col.label.split(' ')[0]} ({col.items.length})
          </button>
        ))}
      </div>

      {/* Kanban */}
      <div className="flex-1 min-h-0">
        <div className="hidden lg:grid grid-cols-5 gap-3 h-full">
          {columnData.map((col) => (
            <div key={col.id} className="flex flex-col h-full">
              <div className="flex items-center gap-2 px-3 py-2.5 rounded-t-2xl border border-b-0" style={{ background: col.bg, borderColor: col.border }}>
                <div className="w-2 h-2 rounded-full" style={{ background: col.color }} />
                <span className="text-[12px] font-bold" style={{ color: col.color }}>{col.label}</span>
                <span className="ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: `${col.color}20`, color: col.color }}>{col.items.length}</span>
              </div>
              <div className="flex-1 overflow-y-auto p-1.5 space-y-1.5 rounded-b-2xl border border-t-0" style={{ borderColor: col.border, background: `${col.bg}80` }}>
                {col.items.length === 0 ? (
                  <div className="flex flex-col items-center py-8 opacity-40"><Package className="w-7 h-7 text-[#D0D2DA] mb-1" /><p className="text-[11px] text-[#8C8FA3]">Хоосон</p></div>
                ) : col.items.map((order: any) => (
                  <OCard key={order.id} order={order} isArchive={col.status === 'ARCHIVE'} al={actionLoading}
                    onApprove={handleApprove} onShip={(id: string) => setDriverModal(id)} onDeliver={(id: string) => setPaymentModal(id)}
                    onCancel={handleCancel} onPrint={handlePrint} onClick={() => router.push(`/orders/${order.id}`)} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="lg:hidden h-full overflow-y-auto space-y-2 pb-4">
          {columnData[activeTab].items.length === 0 ? (
            <div className="py-16 text-center"><Package className="w-10 h-10 text-[#D0D2DA] mx-auto mb-3" /><p className="text-[13px] text-[#8C8FA3]">Хоосон</p></div>
          ) : columnData[activeTab].items.map((order: any) => (
            <OCard key={order.id} order={order} isArchive={columnData[activeTab].status === 'ARCHIVE'} al={actionLoading}
              onApprove={handleApprove} onShip={(id: string) => setDriverModal(id)} onDeliver={(id: string) => setPaymentModal(id)}
              onCancel={handleCancel} onPrint={handlePrint} onClick={() => router.push(`/orders/${order.id}`)} />
          ))}
        </div>
      </div>

      {/* Driver Modal */}
      {driverModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDriverModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5">
            <h3 className="text-[16px] font-bold text-[#1A1D26] mb-3">Жолооч сонгох</h3>
            <div className="space-y-2 max-h-[300px] overflow-y-auto">
              {drivers.map((d: any) => (
                <button key={d.id} onClick={() => handleShip(driverModal, d.id)} disabled={actionLoading === driverModal}
                  className="w-full text-left p-3 rounded-xl border border-[#E8ECF0] hover:bg-[#F5F6FA] disabled:opacity-50">
                  <p className="text-[13px] font-semibold">{d.firstName} {d.lastName}</p>
                  <p className="text-[11px] text-[#8C8FA3]">{d.phone}</p>
                </button>
              ))}
            </div>
            <button onClick={() => setDriverModal(null)} className="mt-3 w-full py-2 rounded-xl bg-[#F5F6FA] text-[13px] text-[#8C8FA3] font-semibold">Болих</button>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {paymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={() => setPaymentModal(null)} />
          <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 p-5">
            <h3 className="text-[16px] font-bold text-[#1A1D26] mb-3">Төлбөрийн хэлбэр</h3>
            <div className="space-y-2">
              {Object.entries(PAYMENT_LABELS).map(([key, pm]) => (
                <button key={key} onClick={() => handleDeliver(paymentModal, key)} disabled={actionLoading === paymentModal}
                  className="w-full text-left p-3 rounded-xl border border-[#E8ECF0] hover:bg-[#F5F6FA] disabled:opacity-50 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: `${pm.color}15` }}>
                    <DollarSign className="w-4 h-4" style={{ color: pm.color }} />
                  </div>
                  <span className="text-[13px] font-semibold">{pm.label}</span>
                </button>
              ))}
            </div>
            <button onClick={() => setPaymentModal(null)} className="mt-3 w-full py-2 rounded-xl bg-[#F5F6FA] text-[13px] text-[#8C8FA3] font-semibold">Болих</button>
          </div>
        </div>
      )}

      {/* New Order Sheet */}
      {showNewOrder && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowNewOrder(false); setSelectedCustomer(null); setCart([]); }} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto">
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-[#E8ECF0] flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-[#1A1D26]">Шинэ захиалга</h2>
              <button onClick={() => { setShowNewOrder(false); setSelectedCustomer(null); setCart([]); }} className="p-2 rounded-lg hover:bg-[#F5F6FA]"><X className="w-5 h-5 text-[#8C8FA3]" /></button>
            </div>
            <div className="p-5 space-y-4">
              {/* Customer */}
              {!selectedCustomer ? (
                <div>
                  <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Харилцагч *</label>
                  <input type="text" value={customerSearch} onChange={e => setCustomerSearch(e.target.value)} placeholder="Нэр, утас хайх..." className={inputClass + ' mb-2'} />
                  <div className="space-y-1 max-h-[200px] overflow-y-auto">
                    {filteredCustomers.map((c: any) => (
                      <button key={c.id} onClick={() => setSelectedCustomer(c)} className="w-full text-left p-3 rounded-xl hover:bg-[#F5F6FA] border border-[#E8ECF0]">
                        <p className="text-[13px] font-semibold">{c.storeName}</p><p className="text-[11px] text-[#8C8FA3]">{c.phone}</p>
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-[#ECFDF5] border border-[#A7F3D0]">
                  <CheckCircle className="w-5 h-5 text-[#10B981]" /><div className="flex-1"><p className="text-[13px] font-semibold">{selectedCustomer.storeName}</p></div>
                  <button onClick={() => setSelectedCustomer(null)} className="p-1 rounded"><X className="w-4 h-4 text-[#8C8FA3]" /></button>
                </div>
              )}
              {/* Payment */}
              <div>
                <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Төлбөрийн хэлбэр</label>
                <div className="grid grid-cols-3 gap-1.5">
                  {Object.entries(PAYMENT_LABELS).map(([key, pm]) => (
                    <button key={key} type="button" onClick={() => setOrderPaymentMethod(key)}
                      className={`py-2 px-2 rounded-xl text-[11px] font-semibold border ${orderPaymentMethod === key ? 'text-white border-transparent' : 'text-[#4A4D5C] border-[#E8ECF0]'}`}
                      style={orderPaymentMethod === key ? { background: pm.color } : {}}>
                      {pm.label}
                    </button>
                  ))}
                </div>
              </div>
              {/* Products */}
              {selectedCustomer && (
                <div>
                  <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Бараа {cart.length > 0 && <span className="text-[#007AFF]">· ₮{cartTotal.toLocaleString()}</span>}</label>
                  <div className="space-y-1.5 max-h-[300px] overflow-y-auto">
                    {products.map((p: any) => {
                      const inCart = cart.find(c => c.productId === p.id);
                      const qty = inCart?.qty ?? 0;
                      const stock = p.stockAvailable ?? 0;
                      return (
                        <div key={p.id} className={`rounded-xl border p-3 ${qty > 0 ? 'bg-[#EFF6FF] border-[#007AFF]/30' : 'bg-white border-[#E8ECF0]'}`}>
                          <div className="flex items-center justify-between mb-1">
                            <p className="text-[12px] font-semibold truncate flex-1 mr-2">{p.name}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${stock > 0 ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>{stock}</span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] text-[#8C8FA3]">₮{Number(p.sellingPrice ?? 0).toLocaleString()}</span>
                            <div className="flex items-center gap-1">
                              <button onClick={() => { if (qty <= 1) setCart(prev => prev.filter(c => c.productId !== p.id)); else setCart(prev => prev.map(c => c.productId === p.id ? { ...c, qty: c.qty - 1 } : c)); }}
                                disabled={qty <= 0} className="w-8 h-8 rounded-lg bg-[#F5F6FA] border border-[#E8ECF0] flex items-center justify-center font-bold disabled:opacity-30">−</button>
                              <span className="w-8 text-center text-[13px] font-bold">{qty}</span>
                              <button onClick={() => { if (qty >= stock) return; const ex = cart.find(c => c.productId === p.id); if (ex) setCart(prev => prev.map(c => c.productId === p.id ? { ...c, qty: c.qty + 1 } : c)); else setCart(prev => [...prev, { productId: p.id, name: p.name, qty: 1, unitPrice: Number(p.sellingPrice ?? 0) }]); }}
                                disabled={stock <= 0 || qty >= stock} className="w-8 h-8 rounded-lg bg-[#F5F6FA] border border-[#E8ECF0] flex items-center justify-center font-bold disabled:opacity-30">+</button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              <button onClick={handleCreateOrder} disabled={submitting || !selectedCustomer || cart.length === 0}
                className="w-full py-3 rounded-xl bg-[#FF9500] text-white text-[14px] font-semibold disabled:opacity-50">
                {submitting ? 'Илгээж байна...' : `Захиалга · ₮${cartTotal.toLocaleString()}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function OCard({ order, isArchive, al, onApprove, onShip, onDeliver, onCancel, onPrint, onClick }: any) {
  const items = order.items ?? [];
  const totalQty = items.reduce((s: number, i: any) => s + (i.quantity ?? 0), 0);
  const pm = PAYMENT_LABELS[order.paymentMethod];
  const driver = order.deliveryRoute?.driver;
  const busy = al === order.id;

  return (
    <div onClick={onClick} className={`bg-white rounded-xl border border-[#E8ECF0] p-2.5 cursor-pointer hover:shadow-md transition-all ${isArchive ? 'opacity-60' : ''} ${busy ? 'opacity-50 pointer-events-none' : ''}`}>
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-[13px] font-bold text-[#007AFF]">#{order.orderNumber}</span>
        <span className="text-[9px] text-[#8C8FA3]">{order.createdAt ? new Date(order.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}</span>
      </div>
      <div className="flex items-center gap-1 mb-1"><User className="w-3 h-3 text-[#8C8FA3]" /><span className="text-[11px] font-medium text-[#4A4D5C] truncate">{order.customer?.storeName ?? ''}</span></div>
      {driver && <div className="flex items-center gap-1 mb-1"><Truck className="w-3 h-3 text-[#AF52DE]" /><span className="text-[10px] text-[#8C8FA3]">{driver.lastName} {driver.firstName}</span></div>}

      {/* Product list */}
      <div className="space-y-0.5 my-1.5 py-1.5 border-y border-[#F2F4F7]">
        {items.slice(0, 5).map((item: any, idx: number) => (
          <div key={idx} className="flex items-center justify-between">
            <span className="text-[10px] text-[#4A4D5C] truncate flex-1 mr-2">{item.product?.name ?? 'Бараа'}</span>
            <span className="text-[10px] font-semibold text-[#1A1D26] shrink-0">{item.quantity}ш · ₮{Number(item.lineTotal ?? 0).toLocaleString()}</span>
          </div>
        ))}
        {items.length > 5 && <p className="text-[9px] text-[#8C8FA3]">+{items.length - 5} бараа...</p>}
      </div>

      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-[#8C8FA3]">{items.length} бараа · {totalQty} ш</span>
        <span className="text-[14px] font-bold text-[#1A1D26]">₮{Number(order.totalAmount ?? 0).toLocaleString()}</span>
      </div>
      {pm && <span className="inline-block text-[9px] font-bold px-1.5 py-0.5 rounded-full mb-1" style={{ background: `${pm.color}15`, color: pm.color }}>{pm.label}</span>}
      {!isArchive && (
        <div className="flex gap-1 pt-1.5 border-t border-[#F2F4F7]" onClick={e => e.stopPropagation()}>
          {order.status === 'PENDING' && <><button onClick={() => onApprove(order.id)} className="flex-1 py-1.5 rounded-lg bg-[#007AFF] text-white text-[10px] font-semibold flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" />Батлах</button><button onClick={() => onCancel(order.id)} className="p-1.5 rounded-lg border border-[#E8ECF0] text-[#EF4444]"><X className="w-3 h-3" /></button></>}
          {order.status === 'APPROVED' && <><button onClick={() => onShip(order.id)} className="flex-1 py-1.5 rounded-lg bg-[#AF52DE] text-white text-[10px] font-semibold flex items-center justify-center gap-1"><Truck className="w-3 h-3" />Хүргэлт</button><button onClick={() => onCancel(order.id)} className="p-1.5 rounded-lg border border-[#E8ECF0] text-[#EF4444]"><X className="w-3 h-3" /></button></>}
          {order.status === 'SHIPPING' && <><button onClick={() => onDeliver(order.id)} className="flex-1 py-1.5 rounded-lg bg-[#10B981] text-white text-[10px] font-semibold flex items-center justify-center gap-1"><CheckCircle className="w-3 h-3" />Хүргэсэн</button><button onClick={() => onCancel(order.id)} className="p-1.5 rounded-lg border border-[#E8ECF0] text-[#EF4444]"><X className="w-3 h-3" /></button></>}
          {order.status === 'DELIVERED' && !order.receiptPrintedAt && <button onClick={() => onPrint(order)} className="flex-1 py-1.5 rounded-lg bg-[#10B981] text-white text-[10px] font-semibold flex items-center justify-center gap-1"><Printer className="w-3 h-3" />Хэвлэх</button>}
        </div>
      )}
    </div>
  );
}
