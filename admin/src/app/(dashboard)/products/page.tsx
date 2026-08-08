'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Package, Plus, ChevronRight, ChevronLeft, AlertTriangle, Pencil, Trash2, Upload, TrendingUp } from 'lucide-react';
import { ErrorBanner } from '@/components/shared/error-banner';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid, type StatGradient } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, SearchField } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export default function ProductsPage() {
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchProducts = () => {
    setLoading(true);
    setError(null);
    const params = new URLSearchParams({ page: String(page), limit: '20' });
    if (search) params.set('search', search);
    if (selectedCategory) params.set('categoryId', selectedCategory);
    api.get(`/api/products?${params}`).then(res => {
      setProducts(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    }).catch((err) => {
      setError(err.response?.data?.message ?? 'Бүтээгдэхүүний жагсаалт ачааллахад алдаа гарлаа');
    }).finally(() => setLoading(false));
  };

  useEffect(() => {
    api.get('/api/categories').then(res => setCategories(res.data?.data ?? res.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => { fetchProducts(); }, [page, search, selectedCategory]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/api/products/${deleteId}`);
      setDeleteId(null);
      fetchProducts();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Бүтээгдэхүүн устгахад алдаа гарлаа');
      setDeleteId(null);
    } finally { setDeleting(false); }
  };

  // Stats
  const totalProducts = meta?.total ?? products.length;
  const lowStockCount = products.filter(p => p.stockAvailable <= p.reorderLevel).length;
  const totalValue = products.reduce((s, p) => s + Number(p.sellingPrice) * p.stockAvailable, 0);

  const stats: { label: string; value: string | number; icon: typeof Package; gradient: StatGradient }[] = [
    { label: 'Нийт бараа', value: totalProducts, icon: Package, gradient: 'blue' },
    { label: 'Нөөц дутуу', value: lowStockCount, icon: AlertTriangle, gradient: 'red' },
    { label: 'Нөөцийн үнэлгээ', value: formatMnt(totalValue), icon: TrendingUp, gradient: 'green' },
  ];

  return (
    <div className="space-y-5 animate-ios-fade-in">
      {/* Header */}
      <PageHeader
        title="Бүтээгдэхүүн"
        subtitle="Бүтээгдэхүүний бүртгэл, нөөцийн удирдлага"
        icon={Package}
        actions={
          <>
            <Link href="/products/import"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-[#007AFF] bg-[#007AFF]/8 hover:bg-[#007AFF]/15 border border-[#007AFF]/15 transition-all active:scale-[0.97]">
              <Upload className="w-4 h-4" /> Импорт
            </Link>
            <Link href="/products/new"
              className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] hover:brightness-105"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
              <Plus className="w-4 h-4" /> Шинэ бараа
            </Link>
          </>
        }
      />

      {/* Stats */}
      <StatGrid cols={3}>
        {stats.map((s, i) => (
          <StatCard key={s.label} label={s.label} value={s.value} icon={s.icon} gradient={s.gradient} index={i} />
        ))}
      </StatGrid>

      {/* Search + Category Filter */}
      <FilterBar>
        <SearchField
          value={search}
          onChange={(v) => { setSearch(v); setPage(1); }}
          placeholder="Бараа хайх (нэр, баркод)..."
          className="flex-1 min-w-[200px]"
        />
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => { setSelectedCategory(''); setPage(1); }}
            className={`h-9 px-3.5 rounded-xl text-[12px] font-semibold transition-all ${
              !selectedCategory ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25' : 'bg-white text-[#4A4D5C] border border-[#E8ECF0]/70 hover:bg-[#F2F4F7]'
            }`}
          >
            Бүгд
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
              className={`h-9 px-3.5 rounded-xl text-[12px] font-semibold transition-all ${
                selectedCategory === cat.id ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25' : 'bg-white text-[#4A4D5C] border border-[#E8ECF0]/70 hover:bg-[#F2F4F7]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </FilterBar>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Products Table */}
      <SectionCard noPadding>
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-[#F9FAFB] border-b border-[#F0F2F5] text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wider">
          <div className="w-12" />
          <div>Бараа</div>
          <div className="w-20 text-center">Ангилал</div>
          <div className="w-24 text-right">Зарах үнэ</div>
          <div className="w-20 text-right">Нөөц</div>
          <div className="w-20 text-center">Үйлдэл</div>
        </div>

        {loading ? (
          <div className="divide-y divide-[#F2F4F7]">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="px-5 py-4 flex items-center gap-4 animate-pulse">
                <div className="w-12 h-12 rounded-xl bg-[#F2F2F7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-48 bg-[#F2F2F7] rounded-lg" />
                  <div className="h-3 w-28 bg-[#F2F2F7] rounded-lg" />
                </div>
                <div className="h-4 w-16 bg-[#F2F2F7] rounded-lg" />
                <div className="h-4 w-16 bg-[#F2F2F7] rounded-lg" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <EmptyState icon={Package} title="Бараа олдсонгүй" hint="Хайлтын үр дүн хоосон байна" />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {products.map((product: any) => {
              const isLow = product.stockAvailable <= product.reorderLevel;
              const isOut = product.stockAvailable <= 0;
              const profit = Number(product.sellingPrice) - Number(product.costPrice);
              const margin = Number(product.sellingPrice) > 0 ? Math.round((profit / Number(product.sellingPrice)) * 100) : 0;

              return (
                <div key={product.id} className="flex items-center gap-4 px-4 lg:px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors group">
                  {/* Image */}
                  {product.imageUrl ? (
                    <img src={`${API_URL}${product.imageUrl}`} alt={product.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-[#E8ECF0]/70" />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOut ? 'bg-[#FF3B30]/8' : isLow ? 'bg-[#FF9500]/8' : 'bg-[#34C759]/8'}`}>
                      <Package className={`w-5 h-5 ${isOut ? 'text-[#FF3B30]' : isLow ? 'text-[#FF9500]' : 'text-[#34C759]'}`} />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#1A1D26] truncate">{product.name}</p>
                      {isOut && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#FF3B30]/10 text-[#FF3B30] uppercase shrink-0">
                          Дууссан
                        </span>
                      )}
                      {isLow && !isOut && (
                        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold bg-[#FF9500]/10 text-[#FF9500] uppercase shrink-0">
                          <AlertTriangle className="w-2.5 h-2.5" /> Бага
                        </span>
                      )}
                    </div>
                    <p className="text-[12px] text-[#8C8FA3] truncate mt-0.5">
                      <span className="font-mono text-[#AEAEB2]">{product.sku}</span>
                      {product.supplier && <span> · {product.supplier.name}</span>}
                      {product.unitsPerBox > 1 && <span className="text-[#007AFF]"> · {product.unitsPerBox}ш/хайрцаг</span>}
                    </p>
                  </div>

                  {/* Category */}
                  <div className="hidden md:block w-20 shrink-0">
                    {product.category?.name && (
                      <span className="inline-flex px-2 py-1 rounded-lg text-[10px] font-semibold bg-[#F2F4F7] text-[#4A4D5C] truncate max-w-full">
                        {product.category.name}
                      </span>
                    )}
                  </div>

                  {/* Price */}
                  <div className="text-right shrink-0 w-24">
                    <p className="text-[14px] font-bold text-[#1A1D26] tabular-nums">{formatMnt(product.sellingPrice)}</p>
                    <p className="text-[10px] text-[#34C759] font-semibold">
                      +{margin}% ашиг
                    </p>
                  </div>

                  {/* Stock */}
                  <div className="text-right shrink-0 w-20">
                    <p className={`text-[14px] font-bold tabular-nums ${isOut ? 'text-[#FF3B30]' : isLow ? 'text-[#FF9500]' : 'text-[#1A1D26]'}`}>
                      {product.stockAvailable}
                    </p>
                    <p className="text-[10px] text-[#AEAEB2]">
                      {product.unitsPerBox > 1 ? `${Math.floor(product.stockAvailable / product.unitsPerBox)} хайрцаг` : 'ширхэг'}
                    </p>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-0.5 shrink-0 w-20 justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Link href={`/products/${product.id}/edit`}
                      className="p-2 rounded-lg hover:bg-[#007AFF]/10 transition-colors" title="Засах">
                      <Pencil className="w-4 h-4 text-[#007AFF]" />
                    </Link>
                    <button onClick={() => setDeleteId(product.id)}
                      className="p-2 rounded-lg hover:bg-[#FF3B30]/10 transition-colors" title="Устгах">
                      <Trash2 className="w-4 h-4 text-[#FF3B30]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[#8C8FA3]">
            Нийт {meta.total} бараа · {page}/{meta.totalPages} хуудас
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="w-9 h-9 rounded-xl bg-white border border-[#E8ECF0]/70 flex items-center justify-center text-[#8C8FA3] disabled:opacity-30 hover:bg-[#F2F4F7] transition-all active:scale-95">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${
                    p === page ? 'bg-[#007AFF] text-white shadow-sm shadow-[#007AFF]/25' : 'bg-white border border-[#E8ECF0]/70 text-[#4A4D5C] hover:bg-[#F2F4F7]'
                  }`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
              className="w-9 h-9 rounded-xl bg-white border border-[#E8ECF0]/70 flex items-center justify-center text-[#8C8FA3] disabled:opacity-30 hover:bg-[#F2F4F7] transition-all active:scale-95">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {deleteId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setDeleteId(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in text-center">
            <div className="w-14 h-14 rounded-2xl bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-[#FF3B30]" />
            </div>
            <h3 className="text-[18px] font-bold text-[#1A1D26] mb-1">Устгах уу?</h3>
            <p className="text-[14px] text-[#8C8FA3] mb-5">Энэ бүтээгдэхүүнийг устгахдаа итгэлтэй байна уу?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8C8FA3] bg-[#F2F4F7] hover:bg-[#E5E5EA] transition-all active:scale-[0.97]">
                Цуцлах
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white bg-[#FF3B30] hover:bg-[#E5333A] transition-all active:scale-[0.97] disabled:opacity-60 shadow-lg shadow-[#FF3B30]/25">
                {deleting ? 'Устгаж байна...' : 'Устгах'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
