'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { primaryBarcode, matchesSearch, hasBarcode } from '@/lib/barcode';
import {
  Package, Truck, RefreshCw, Plus, X, AlertTriangle,
  DollarSign, ShoppingBag, TrendingUp,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

export default function DriverLoadPage() {
  const [load, setLoad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showAddItems, setShowAddItems] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [addItems, setAddItems] = useState<{ productId: string; productName: string; qty: number; unitsPerBox: number }[]>([]);
  const [submitting, setSubmitting] = useState(false);

  const fetchLoad = useCallback(async () => {
    try {
      setLoading(true);
      setError('');
      const res = await api.get('/api/truck-loads/driver/active');
      setLoad(res.data);
    } catch {
      setLoad(null);
      setError('Идэвхтэй ачилт олдсонгүй');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchLoad(); }, [fetchLoad]);

  useEffect(() => {
    if (!showAddItems) return;
    api.get('/api/products', { params: { limit: 100 } })
      .then((res) => setProducts((res.data?.data ?? res.data ?? []).filter((p: any) => p.isActive)))
      .catch(() => {});
  }, [showAddItems]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-[#007AFF] animate-spin" />
      </div>
    );
  }

  if (!load) {
    return (
      <div className="p-4 animate-ios-fade-in">
        <SectionCard>
          <EmptyState
            icon={Truck}
            title="Идэвхтэй ачилт олдсонгүй"
            hint="Админ ачилт илгээсний дараа энд харагдана"
            action={
              <button
                onClick={fetchLoad}
                className="inline-flex items-center gap-1.5 h-9 px-5 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold shadow-sm shadow-[#007AFF]/25 active:scale-[0.97] transition-all"
              >
                <RefreshCw className="w-4 h-4" /> Дахин шалгах
              </button>
            }
          />
        </SectionCard>
      </div>
    );
  }

  const items = load.items ?? [];
  const totalLoaded = items.reduce((s: number, i: any) => s + (i.loadedQty || 0), 0);
  const totalSold = items.reduce((s: number, i: any) => s + (i.soldQty || 0), 0);
  const totalRemaining = items.reduce((s: number, i: any) => s + Math.max(0, (i.loadedQty || 0) - (i.soldQty || 0) - (i.returnedQty || 0) - (i.damagedQty || 0)), 0);
  const salesTotal = (load.sales ?? []).reduce((s: number, sale: any) => s + Number(sale.totalAmount ?? 0), 0);
  const lowStockItems = items.filter((i: any) => {
    const remaining = (i.loadedQty || 0) - (i.soldQty || 0) - (i.returnedQty || 0) - (i.damagedQty || 0);
    return remaining > 0 && remaining <= 3;
  });

  const handleRequestItems = async () => {
    if (addItems.length === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/api/truck-loads/${load.id}/add-items`, {
        items: addItems.map((ai) => ({ productId: ai.productId, loadedQty: ai.qty })),
      });
      setShowAddItems(false);
      setAddItems([]);
      fetchLoad();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-4 space-y-5 animate-ios-fade-in">
      {/* Load header */}
      <PageHeader
        title={`Ачилт #${load.loadNumber}`}
        subtitle={load.vehicleInfo || 'Идэвхтэй ачилт'}
        icon={Truck}
        iconColor="#007AFF"
        actions={
          <button onClick={fetchLoad} className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-[#E8ECF0]/70 shadow-sm hover:bg-[#F2F4F7] active:scale-95 transition-all">
            <RefreshCw className="w-4 h-4 text-[#8C8FA3]" />
          </button>
        }
      />

      {/* Stats */}
      <StatGrid cols={2}>
        <StatCard label="Нийт ачсан" value={totalLoaded} icon={Package} gradient="blue" index={0} />
        <StatCard label="Зарагдсан" value={totalSold} icon={ShoppingBag} gradient="green" index={1} />
        <StatCard label="Үлдэгдэл" value={totalRemaining} icon={TrendingUp} gradient="orange" index={2} />
        <StatCard label="Борлуулалт" value={formatMnt(salesTotal)} icon={DollarSign} gradient="indigo" index={3} />
      </StatGrid>

      {/* Low stock alert */}
      {lowStockItems.length > 0 && (
        <div className="bg-[#FFFBEB] border border-[#FDE68A] rounded-2xl p-4">
          <div className="flex items-center gap-2 mb-2.5">
            <div className="w-7 h-7 rounded-lg bg-[#FEF3C7] flex items-center justify-center">
              <AlertTriangle className="w-4 h-4 text-[#D97706]" />
            </div>
            <span className="text-[13px] font-bold text-[#92400E]">Дуусаж буй бараа</span>
          </div>
          <div className="space-y-1.5">
            {lowStockItems.map((item: any) => {
              const remaining = (item.loadedQty || 0) - (item.soldQty || 0) - (item.returnedQty || 0) - (item.damagedQty || 0);
              return (
                <div key={item.id} className="flex items-center justify-between">
                  <span className="text-[12px] text-[#92400E] truncate mr-2">{item.product?.name}</span>
                  <span className="text-[12px] font-bold text-[#DC2626] shrink-0 tabular-nums">{remaining} ш үлдсэн</span>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Product list */}
      <SectionCard
        title={`Бараа (${items.length})`}
        action={
          <button
            onClick={() => setShowAddItems(true)}
            className="inline-flex items-center gap-1 h-8 px-3 rounded-lg bg-[#007AFF] text-white text-[12px] font-semibold shadow-sm shadow-[#007AFF]/25 active:scale-95 transition-all"
          >
            <Plus className="w-3.5 h-3.5" /> Нэмэлт бараа
          </button>
        }
      >
        <div className="space-y-2">
          {items.map((item: any) => {
            const remaining = Math.max(0, (item.loadedQty || 0) - (item.soldQty || 0) - (item.returnedQty || 0) - (item.damagedQty || 0));
            const soldPct = item.loadedQty > 0 ? ((item.soldQty || 0) / item.loadedQty) * 100 : 0;
            return (
              <div key={item.id} className="rounded-xl border border-[#E8ECF0]/70 bg-white p-3">
                <div className="flex items-center justify-between mb-2">
                  <p className="text-[13px] font-semibold text-[#1A1D26] truncate flex-1 mr-2">{item.product?.name}</p>
                  <span className={`text-[12px] font-bold tabular-nums shrink-0 ${remaining <= 3 ? 'text-[#EF4444]' : 'text-[#10B981]'}`}>
                    {remaining} ш
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-[#8C8FA3] mb-2">
                  <span>Ачсан: <span className="font-semibold text-[#4A4D5C]">{item.loadedQty}</span></span>
                  <span>Зарсан: <span className="font-semibold text-[#4A4D5C]">{item.soldQty || 0}</span></span>
                </div>
                <div className="w-full h-1.5 bg-[#F0F2F5] rounded-full overflow-hidden">
                  <div className="h-full bg-[#10B981] rounded-full transition-all" style={{ width: `${Math.min(100, soldPct)}%` }} />
                </div>
              </div>
            );
          })}
        </div>
      </SectionCard>

      {/* Add Items Sheet */}
      {showAddItems && (
        <div className="fixed inset-0 z-50 flex flex-col">
          <div className="absolute inset-0 bg-black/40" onClick={() => { setShowAddItems(false); setAddItems([]); }} />
          <div className="relative mt-auto bg-white rounded-t-3xl shadow-2xl max-h-[85vh] overflow-y-auto animate-ios-slide-up">
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-[#F0F2F5] flex items-center justify-between rounded-t-3xl">
              <h2 className="text-[16px] font-bold text-[#1A1D26]">Нэмэлт бараа хүсэлт</h2>
              <button onClick={() => { setShowAddItems(false); setAddItems([]); }} className="p-2 rounded-lg hover:bg-[#F5F6FA] transition-colors">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>
            <div className="p-4 space-y-2">
              <p className="text-[12px] text-[#8C8FA3] mb-2">Бараа сонгож тоо ширхэг оруулна уу. Админ батлах хэрэгтэй.</p>
              {products.map((p: any) => {
                const selected = addItems.find((a) => a.productId === p.id);
                const qty = selected?.qty ?? 0;
                const stock = p.stockAvailable ?? 0;
                return (
                  <div key={p.id} className={`rounded-xl border p-3 transition-colors ${qty > 0 ? 'bg-[#EFF6FF] border-[#007AFF]/30' : 'bg-white border-[#E8ECF0]/70'}`}>
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex-1 mr-2 min-w-0">
                        <p className="text-[13px] font-semibold text-[#1A1D26] truncate">{p.name}</p>
                        <p className="text-[10px] text-[#8C8FA3]">{primaryBarcode(p) ?? "—"} · {formatMnt(p.sellingPrice)}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-lg shrink-0 ${stock > 0 ? 'bg-[#ECFDF5] text-[#10B981]' : 'bg-[#FEF2F2] text-[#EF4444]'}`}>
                        {stock} нөөц
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => {
                          if (qty <= 1) setAddItems((prev) => prev.filter((a) => a.productId !== p.id));
                          else setAddItems((prev) => prev.map((a) => a.productId === p.id ? { ...a, qty: a.qty - 1 } : a));
                        }}
                        disabled={qty <= 0}
                        className="w-10 h-10 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70 flex items-center justify-center text-[16px] font-bold text-[#4A4D5C] disabled:opacity-30 active:scale-95 transition-all"
                      >−</button>
                      <input
                        type="number"
                        min={0}
                        value={qty || ''}
                        placeholder="0"
                        onChange={(e) => {
                          const v = Math.max(0, parseInt(e.target.value) || 0);
                          if (v === 0) setAddItems((prev) => prev.filter((a) => a.productId !== p.id));
                          else {
                            const existing = addItems.find((a) => a.productId === p.id);
                            if (existing) setAddItems((prev) => prev.map((a) => a.productId === p.id ? { ...a, qty: v } : a));
                            else setAddItems((prev) => [...prev, { productId: p.id, productName: p.name, qty: v, unitsPerBox: p.unitsPerBox ?? 1 }]);
                          }
                        }}
                        className="w-16 h-10 text-center rounded-xl bg-white border border-[#E8ECF0]/70 text-[14px] font-bold text-[#1A1D26] outline-none focus:border-[#007AFF]/40 transition-all"
                      />
                      <button
                        onClick={() => {
                          const existing = addItems.find((a) => a.productId === p.id);
                          if (existing) setAddItems((prev) => prev.map((a) => a.productId === p.id ? { ...a, qty: a.qty + 1 } : a));
                          else setAddItems((prev) => [...prev, { productId: p.id, productName: p.name, qty: 1, unitsPerBox: p.unitsPerBox ?? 1 }]);
                        }}
                        disabled={stock <= 0}
                        className="w-10 h-10 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70 flex items-center justify-center text-[16px] font-bold text-[#4A4D5C] disabled:opacity-30 active:scale-95 transition-all"
                      >+</button>
                    </div>
                  </div>
                );
              })}
              <button
                onClick={handleRequestItems}
                disabled={submitting || addItems.length === 0}
                className="w-full h-12 rounded-xl bg-[#007AFF] text-white text-[14px] font-semibold shadow-sm shadow-[#007AFF]/25 disabled:opacity-50 active:scale-[0.99] transition-all mt-4"
              >
                {submitting ? 'Илгээж байна...' : `Хүсэлт илгээх (${addItems.length} бараа)`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
