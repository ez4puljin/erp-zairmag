'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import {
  Package, AlertTriangle, TrendingUp, RefreshCw, Search,
  Boxes, XCircle, CheckCircle2,
} from 'lucide-react';

export default function InventoryPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'low' | 'out'>('all');
  const [categoryFilter, setCategoryFilter] = useState('');

  const fetchData = () => {
    setLoading(true);
    api.get('/api/inventory').then(res => {
      setProducts(res.data ?? []);
    }).catch((err) => {
      console.error(err);
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
    api.get('/api/categories').then(r => setCategories(r.data?.data ?? r.data ?? [])).catch(() => {});
  }, []);

  const totalProducts = products.length;
  const lowStockCount = products.filter((p: any) => {
    const stock = p.stockAvailable ?? p.totalStock ?? 0;
    return stock > 0 && stock <= (p.reorderLevel ?? 0);
  }).length;
  const outOfStockCount = products.filter((p: any) => (p.stockAvailable ?? p.totalStock ?? 0) <= 0).length;
  const totalValue = products.reduce((sum: number, p: any) => sum + (Number(p.costPrice) * Number(p.stockAvailable ?? p.totalStock ?? 0)), 0);

  const filtered = useMemo(() => {
    return products.filter((p: any) => {
      if (search) {
        const q = search.toLowerCase();
        if (!p.name?.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q)) return false;
      }
      if (categoryFilter && p.categoryId !== categoryFilter && p.category?.id !== categoryFilter) return false;
      const stock = p.stockAvailable ?? p.totalStock ?? 0;
      const reorder = p.reorderLevel ?? 0;
      if (statusFilter === 'low' && !(stock > 0 && stock <= reorder)) return false;
      if (statusFilter === 'out' && stock > 0) return false;
      return true;
    });
  }, [products, search, statusFilter, categoryFilter]);

  const stats: Array<{ label: string; value: number | string; icon: any; color: string; filterKey: 'all' | 'low' | 'out' | null }> = [
    { label: 'Нийт бараа', value: totalProducts, icon: Boxes, color: '#007AFF', filterKey: 'all' },
    { label: 'Бага үлдэгдэл', value: lowStockCount, icon: AlertTriangle, color: '#FF9500', filterKey: 'low' },
    { label: 'Дууссан', value: outOfStockCount, icon: XCircle, color: '#FF3B30', filterKey: 'out' },
    { label: 'Нийт өртөг', value: `₮${totalValue.toLocaleString()}`, icon: TrendingUp, color: '#34C759', filterKey: null },
  ];

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#1C1C1E] tracking-tight">Агуулахын удирдлага</h1>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">Барааны үлдэгдэл, нөөцийн хяналт</p>
        </div>
        <button
          onClick={fetchData}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#4A4D5C] bg-white border border-[#E5E5EA]/60 hover:bg-[#F2F4F7] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Сэргээх
        </button>
      </div>

      {/* Stats - clickable cards with left accent border */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {stats.map((s) => {
          const Icon = s.icon;
          const active = s.filterKey !== null && s.filterKey === statusFilter;
          const clickable = s.filterKey !== null;
          return (
            <button
              key={s.label}
              onClick={() => { if (clickable && s.filterKey) setStatusFilter(s.filterKey); }}
              disabled={!clickable}
              className={`bg-white rounded-2xl p-4 border-l-4 border border-[#E5E5EA]/50 text-left transition-all ${
                clickable ? 'hover:shadow-md cursor-pointer' : 'cursor-default'
              }`}
              style={{
                borderLeftColor: s.color,
                ...(active ? { boxShadow: `0 0 0 2px ${s.color}40` } : {}),
              }}
            >
              <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">{s.label}</span>
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${s.color}15` }}>
                  <Icon className="w-4 h-4" style={{ color: s.color }} />
                </div>
              </div>
              <div className="text-[22px] font-bold text-[#1C1C1E]">{s.value}</div>
            </button>
          );
        })}
      </div>

      {/* Search + Category filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
          <input
            type="text"
            placeholder="Бараа хайх (нэр, баркод)..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E5E5EA]/60 text-[14px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => setCategoryFilter('')}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all ${
              !categoryFilter
                ? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25'
                : 'bg-white text-[#4A4D5C] border border-[#E5E5EA]/60 hover:bg-[#F2F4F7]'
            }`}
          >
            Бүх ангилал
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                categoryFilter === cat.id
                  ? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25'
                  : 'bg-white text-[#4A4D5C] border border-[#E5E5EA]/60 hover:bg-[#F2F4F7]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[auto_1fr_140px_120px_120px_140px] gap-4 px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E5EA]/50 text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">
          <div className="w-10" />
          <div>Бараа</div>
          <div className="text-center">Ангилал</div>
          <div className="text-right">Үлдэгдэл</div>
          <div className="text-right">Доод хэмжээ</div>
          <div className="text-right">Нийт өртөг</div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#8E8E93] mx-auto animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F2F2F7] flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-[#AEAEB2]" />
            </div>
            <p className="text-[17px] font-bold text-[#1C1C1E] mb-1">Бараа олдсонгүй</p>
            <p className="text-[13px] text-[#8E8E93]">Хайлт эсвэл шүүлтүүрийн үр дүн хоосон байна</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {filtered.map((p: any) => {
              const stock = p.stockAvailable ?? p.totalStock ?? 0;
              const reorder = p.reorderLevel ?? 0;
              const isOut = stock <= 0;
              const isLow = !isOut && stock <= reorder;
              const lineValue = Number(p.costPrice ?? 0) * stock;
              return (
                <div
                  key={p.id}
                  className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_140px_120px_120px_140px] gap-4 px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors items-center"
                >
                  {/* Status icon */}
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                      isOut ? 'bg-[#FF3B30]/10' : isLow ? 'bg-[#FF9500]/10' : 'bg-[#34C759]/10'
                    }`}
                  >
                    {isOut ? <XCircle className="w-5 h-5 text-[#FF3B30]" /> :
                     isLow ? <AlertTriangle className="w-5 h-5 text-[#FF9500]" /> :
                     <CheckCircle2 className="w-5 h-5 text-[#34C759]" />}
                  </div>

                  {/* Name + SKU */}
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#1C1C1E] truncate">{p.name}</p>
                      {isOut && (
                        <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#FF3B30]/10 text-[#FF3B30] uppercase">Дууссан</span>
                      )}
                      {isLow && (
                        <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#FF9500]/10 text-[#FF9500] uppercase">Бага</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#8E8E93] truncate mt-0.5">
                      <span className="font-mono text-[#AEAEB2]">{p.sku}</span>
                      <span className="md:hidden"> · {p.category?.name ?? '—'}</span>
                    </p>
                  </div>

                  {/* Category (desktop only) */}
                  <div className="hidden md:flex justify-center">
                    {p.category?.name && (
                      <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#F2F4F7] text-[#4A4D5C]">
                        {p.category.name}
                      </span>
                    )}
                  </div>

                  {/* Stock */}
                  <div className="text-right">
                    <p className={`text-[16px] font-bold ${isOut ? 'text-[#FF3B30]' : isLow ? 'text-[#FF9500]' : 'text-[#1C1C1E]'}`}>
                      {stock}
                    </p>
                    <p className="text-[10px] text-[#AEAEB2] md:hidden">/ {reorder}</p>
                  </div>

                  {/* Reorder (desktop only) */}
                  <div className="hidden md:block text-right">
                    <p className="text-[13px] text-[#8E8E93]">{reorder}</p>
                  </div>

                  {/* Line value (desktop only) */}
                  <div className="hidden md:block text-right">
                    <p className="text-[13px] font-semibold text-[#1C1C1E]">₮{lineValue.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
