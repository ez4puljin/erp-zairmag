'use client';

import { useState, useEffect, useMemo } from 'react';
import api from '@/lib/api';
import { primaryBarcode, matchesSearch, hasBarcode } from '@/lib/barcode';
import {
  Package, AlertTriangle, TrendingUp, RefreshCw,
  Boxes, XCircle, CheckCircle2,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, SearchField, ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

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
        if (!matchesSearch(p, q)) return false;
      }
      if (categoryFilter && p.categoryId !== categoryFilter && p.category?.id !== categoryFilter) return false;
      const stock = p.stockAvailable ?? p.totalStock ?? 0;
      const reorder = p.reorderLevel ?? 0;
      if (statusFilter === 'low' && !(stock > 0 && stock <= reorder)) return false;
      if (statusFilter === 'out' && stock > 0) return false;
      return true;
    });
  }, [products, search, statusFilter, categoryFilter]);

  const stats: Array<{ label: string; value: number | string; icon: any; color: string; gradient: 'blue' | 'orange' | 'red' | 'green'; filterKey: 'all' | 'low' | 'out' | null }> = [
    { label: 'Нийт бараа', value: totalProducts, icon: Boxes, color: '#007AFF', gradient: 'blue', filterKey: 'all' },
    { label: 'Бага үлдэгдэл', value: lowStockCount, icon: AlertTriangle, color: '#FF9500', gradient: 'orange', filterKey: 'low' },
    { label: 'Дууссан', value: outOfStockCount, icon: XCircle, color: '#FF3B30', gradient: 'red', filterKey: 'out' },
    { label: 'Нийт өртөг', value: formatMnt(totalValue), icon: TrendingUp, color: '#34C759', gradient: 'green', filterKey: null },
  ];

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Агуулахын удирдлага"
        subtitle="Барааны үлдэгдэл, нөөцийн хяналт"
        icon={Package}
        actions={
          <ActionButton variant="ghost" onClick={fetchData}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Сэргээх
          </ActionButton>
        }
      />

      {/* Stats - clickable gradient cards (filter by status) */}
      <StatGrid cols={4}>
        {stats.map((s, i) => {
          const active = s.filterKey !== null && s.filterKey === statusFilter;
          const clickable = s.filterKey !== null;
          const card = <StatCard label={s.label} value={s.value} icon={s.icon} gradient={s.gradient} index={i} />;
          return clickable ? (
            <button
              key={s.label}
              onClick={() => { if (s.filterKey) setStatusFilter(s.filterKey); }}
              className="block w-full text-left rounded-2xl transition-all"
              style={active ? { boxShadow: `0 0 0 2px #F5F6FA, 0 0 0 4px ${s.color}` } : undefined}
            >
              {card}
            </button>
          ) : (
            <div key={s.label}>{card}</div>
          );
        })}
      </StatGrid>

      {/* Search + Category filter */}
      <FilterBar>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Бараа хайх (нэр, баркод)..."
          className="flex-1 min-w-[220px]"
        />
        <div className="flex gap-1.5 flex-wrap items-end">
          <button
            onClick={() => setCategoryFilter('')}
            className={`h-9 px-3.5 rounded-xl text-[12px] font-semibold transition-all ${
              !categoryFilter
                ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25'
                : 'bg-white text-[#4A4D5C] border border-[#E8ECF0]/70 hover:bg-[#F2F4F7]'
            }`}
          >
            Бүх ангилал
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => setCategoryFilter(cat.id)}
              className={`h-9 px-3.5 rounded-xl text-[12px] font-semibold transition-all ${
                categoryFilter === cat.id
                  ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25'
                  : 'bg-white text-[#4A4D5C] border border-[#E8ECF0]/70 hover:bg-[#F2F4F7]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </FilterBar>

      {/* Table */}
      <SectionCard title="Барааны жагсаалт" noPadding>
        {/* Table header */}
        <div className="hidden md:grid grid-cols-[auto_1fr_140px_120px_120px_140px] gap-4 px-5 py-3 bg-[#F9FAFB] border-b border-[#F0F2F5] text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wider">
          <div className="w-10" />
          <div>Бараа</div>
          <div className="text-center">Ангилал</div>
          <div className="text-right">Үлдэгдэл</div>
          <div className="text-right">Доод хэмжээ</div>
          <div className="text-right">Нийт өртөг</div>
        </div>

        {loading ? (
          <div className="p-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#8C8FA3] mx-auto animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Package}
            title="Бараа олдсонгүй"
            hint="Хайлт эсвэл шүүлтүүрийн үр дүн хоосон байна"
          />
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
                  className="grid grid-cols-[auto_1fr_auto] md:grid-cols-[auto_1fr_140px_120px_120px_140px] gap-4 px-5 py-3.5 hover:bg-[#F7F9FC] transition-colors items-center"
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
                      <p className="text-[14px] font-semibold text-[#1A1D26] truncate">{p.name}</p>
                      {isOut && (
                        <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#FF3B30]/10 text-[#FF3B30] uppercase">Дууссан</span>
                      )}
                      {isLow && (
                        <span className="hidden md:inline-flex items-center px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#FF9500]/10 text-[#FF9500] uppercase">Бага</span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#8C8FA3] truncate mt-0.5">
                      <span className="font-mono text-[#AEAEB2]">{primaryBarcode(p) ?? "—"}</span>
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
                    <p className={`text-[16px] font-bold tabular-nums ${isOut ? 'text-[#FF3B30]' : isLow ? 'text-[#FF9500]' : 'text-[#1A1D26]'}`}>
                      {stock}
                    </p>
                    <p className="text-[10px] text-[#AEAEB2] md:hidden">/ {reorder}</p>
                  </div>

                  {/* Reorder (desktop only) */}
                  <div className="hidden md:block text-right">
                    <p className="text-[13px] text-[#8C8FA3] tabular-nums">{reorder}</p>
                  </div>

                  {/* Line value (desktop only) */}
                  <div className="hidden md:block text-right">
                    <p className="text-[13px] font-semibold text-[#1A1D26] tabular-nums">{formatMnt(lineValue)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
