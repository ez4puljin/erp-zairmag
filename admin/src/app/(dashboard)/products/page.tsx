'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Package, Plus, Search, ChevronRight, ChevronLeft, AlertTriangle, Pencil, Trash2, Upload, TrendingUp, Archive, BarChart3, Box } from 'lucide-react';
import { ErrorBanner } from '@/components/shared/error-banner';

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

  const stats = [
    { label: 'Нийт бараа', value: totalProducts, icon: Package, gradient: 'linear-gradient(135deg, #007AFF, #5AC8FA)', iconBg: 'rgba(255,255,255,0.2)' },
    { label: 'Нөөц дутуу', value: lowStockCount, icon: AlertTriangle, gradient: 'linear-gradient(135deg, #FF3B30, #FF6B6B)', iconBg: 'rgba(255,255,255,0.2)' },
    { label: 'Нөөцийн үнэлгээ', value: `₮${totalValue.toLocaleString()}`, icon: TrendingUp, gradient: 'linear-gradient(135deg, #34C759, #30D158)', iconBg: 'rgba(255,255,255,0.2)' },
  ];

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#1C1C1E] tracking-tight">Бүтээгдэхүүн</h1>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">Бүтээгдэхүүний бүртгэл, нөөцийн удирдлага</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/products/import"
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#007AFF] bg-[#007AFF]/8 hover:bg-[#007AFF]/15 border border-[#007AFF]/15 transition-all active:scale-[0.97]">
            <Upload className="w-4 h-4" /> Импорт
          </Link>
          <Link href="/products/new"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[13px] font-semibold text-white shadow-lg shadow-[#007AFF]/25 transition-all active:scale-[0.97] hover:shadow-xl hover:shadow-[#007AFF]/30"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            <Plus className="w-4 h-4" /> Шинэ бараа
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {stats.map((s, i) => (
          <div
            key={s.label}
            className={`rounded-2xl p-4 text-white relative overflow-hidden animate-ios-slide-up stagger-${i + 1}`}
            style={{ background: s.gradient }}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[11px] font-medium text-white/70 uppercase tracking-wide">{s.label}</p>
                <p className="text-[22px] font-bold mt-1">{s.value}</p>
              </div>
              <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: s.iconBg }}>
                <s.icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="absolute -bottom-4 -right-4 w-24 h-24 rounded-full" style={{ background: 'rgba(255,255,255,0.08)' }} />
          </div>
        ))}
      </div>

      {/* Search + Category Filter */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
          <input type="text" placeholder="Бараа хайх (нэр, баркод)..." value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E5E5EA]/60 text-[14px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          <button
            onClick={() => { setSelectedCategory(''); setPage(1); }}
            className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all ${
              !selectedCategory ? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25' : 'bg-white text-[#4A4D5C] border border-[#E5E5EA]/60 hover:bg-[#F2F4F7]'
            }`}
          >
            Бүгд
          </button>
          {categories.map((cat: any) => (
            <button
              key={cat.id}
              onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
              className={`px-3.5 py-2 rounded-xl text-[12px] font-semibold transition-all ${
                selectedCategory === cat.id ? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25' : 'bg-white text-[#4A4D5C] border border-[#E5E5EA]/60 hover:bg-[#F2F4F7]'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </div>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Products Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        {/* Table Header */}
        <div className="hidden md:grid grid-cols-[auto_1fr_auto_auto_auto_auto] gap-4 px-5 py-3 bg-[#F9FAFB] border-b border-[#E5E5EA]/50 text-[11px] font-bold text-[#8E8E93] uppercase tracking-wider">
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
          <div className="py-20 text-center">
            <div className="w-16 h-16 rounded-2xl bg-[#F2F2F7] flex items-center justify-center mx-auto mb-4">
              <Package className="w-8 h-8 text-[#AEAEB2]" />
            </div>
            <p className="text-[17px] font-bold text-[#1C1C1E] mb-1">Бараа олдсонгүй</p>
            <p className="text-[13px] text-[#8E8E93]">Хайлтын үр дүн хоосон байна</p>
          </div>
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {products.map((product: any) => {
              const isLow = product.stockAvailable <= product.reorderLevel;
              const isOut = product.stockAvailable <= 0;
              const profit = Number(product.sellingPrice) - Number(product.costPrice);
              const margin = Number(product.sellingPrice) > 0 ? Math.round((profit / Number(product.sellingPrice)) * 100) : 0;

              return (
                <div key={product.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors group">
                  {/* Image */}
                  {product.imageUrl ? (
                    <img src={`${API_URL}${product.imageUrl}`} alt={product.name}
                      className="w-12 h-12 rounded-xl object-cover shrink-0 ring-1 ring-[#E5E5EA]/50" />
                  ) : (
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${isOut ? 'bg-[#FF3B30]/8' : isLow ? 'bg-[#FF9500]/8' : 'bg-[#34C759]/8'}`}>
                      <Package className={`w-5 h-5 ${isOut ? 'text-[#FF3B30]' : isLow ? 'text-[#FF9500]' : 'text-[#34C759]'}`} />
                    </div>
                  )}

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[14px] font-semibold text-[#1C1C1E] truncate">{product.name}</p>
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
                    <p className="text-[12px] text-[#8E8E93] truncate mt-0.5">
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
                    <p className="text-[14px] font-bold text-[#1C1C1E]">₮{Number(product.sellingPrice).toLocaleString()}</p>
                    <p className="text-[10px] text-[#34C759] font-semibold">
                      +{margin}% ашиг
                    </p>
                  </div>

                  {/* Stock */}
                  <div className="text-right shrink-0 w-20">
                    <p className={`text-[14px] font-bold ${isOut ? 'text-[#FF3B30]' : isLow ? 'text-[#FF9500]' : 'text-[#1C1C1E]'}`}>
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
      </div>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] text-[#8E8E93]">
            Нийт {meta.total} бараа · {page}/{meta.totalPages} хуудас
          </p>
          <div className="flex items-center gap-1.5">
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
              className="w-9 h-9 rounded-xl bg-white border border-[#E5E5EA]/50 flex items-center justify-center text-[#8E8E93] disabled:opacity-30 hover:bg-[#F2F4F7] transition-all active:scale-95">
              <ChevronLeft className="w-4 h-4" />
            </button>
            {Array.from({ length: Math.min(5, meta.totalPages) }, (_, i) => {
              const p = i + 1;
              return (
                <button key={p} onClick={() => setPage(p)}
                  className={`w-9 h-9 rounded-xl text-[13px] font-semibold transition-all active:scale-95 ${
                    p === page ? 'bg-[#007AFF] text-white shadow-md shadow-[#007AFF]/25' : 'bg-white border border-[#E5E5EA]/50 text-[#4A4D5C] hover:bg-[#F2F4F7]'
                  }`}>
                  {p}
                </button>
              );
            })}
            <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
              className="w-9 h-9 rounded-xl bg-white border border-[#E5E5EA]/50 flex items-center justify-center text-[#8E8E93] disabled:opacity-30 hover:bg-[#F2F4F7] transition-all active:scale-95">
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
            <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-1">Устгах уу?</h3>
            <p className="text-[14px] text-[#8E8E93] mb-5">Энэ бүтээгдэхүүнийг устгахдаа итгэлтэй байна уу?</p>
            <div className="flex gap-3">
              <button onClick={() => setDeleteId(null)}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#F2F4F7] hover:bg-[#E5E5EA] transition-all active:scale-[0.97]">
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
