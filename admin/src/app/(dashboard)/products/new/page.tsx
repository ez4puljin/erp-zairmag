'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ChevronLeft, Upload, X, Image as ImageIcon, Package, Tag, DollarSign, Boxes, FileText, CheckCircle } from 'lucide-react';

export default function NewProductPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', sku: '', description: '', categoryId: '', supplierId: '',
    unit: '', unitsPerBox: '1', costPrice: '', sellingPrice: '', sellingPriceRural: '', reorderLevel: '',
    initialStock: '',
  });

  useEffect(() => {
    api.get('/api/categories').then(res => setCategories(res.data?.data ?? res.data ?? [])).catch((err) => { console.error('Failed to load categories', err); });
    api.get('/api/suppliers?limit=100').then(res => setSuppliers(res.data?.data ?? res.data ?? [])).catch((err) => { console.error('Failed to load suppliers', err); });
  }, []);

  const handleChange = (field: string, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }));
  };

  const handleImageSelect = (file: File) => {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const res = await api.post('/api/products', {
        ...form,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        sellingPriceRural: Number(form.sellingPriceRural || form.sellingPrice),
        unitsPerBox: Number(form.unitsPerBox) || 1,
        reorderLevel: Number(form.reorderLevel),
        supplierId: form.supplierId || undefined,
      });

      const productId = res.data?.id;

      // Upload image if selected
      if (imageFile && productId) {
        const formData = new FormData();
        formData.append('image', imageFile);
        await api.post(`/api/products/${productId}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      // Set initial stock if provided
      if (Number(form.initialStock) > 0 && productId) {
        await api.post('/api/inventory/restock', {
          items: [{ productId, quantity: Number(form.initialStock) }],
          note: 'Эхний нөөц',
        });
      }

      router.push('/products');
    } catch (err) {
      alert('Бүтээгдэхүүн нэмэхэд алдаа гарлаа');
      console.error(err);
    }
    finally { setSubmitting(false); }
  };

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[14px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white";
  const labelClass = "block text-[11px] font-bold text-[#8E8E93] uppercase tracking-wide mb-1";
  const sectionTitleClass = "flex items-center gap-2 text-[12px] font-bold text-[#1C1C1E] uppercase tracking-wide mb-4";

  return (
    <div className="animate-ios-fade-in">
      <form onSubmit={handleSubmit}>
        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-white/90 backdrop-blur-xl border-b border-[#E5E5EA] mb-5 flex items-center gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex items-center gap-1 text-[14px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors active:scale-[0.97]">
            <ChevronLeft className="w-5 h-5" /> Бүтээгдэхүүн
          </button>
          <div className="h-5 w-px bg-[#E5E5EA]" />
          <h1 className="flex-1 text-[18px] font-bold text-[#1C1C1E] truncate">Шинэ бүтээгдэхүүн</h1>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[#8E8E93] bg-[#F2F2F7] hover:bg-[#E5E5EA] transition-all">
            Цуцлах
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            <CheckCircle className="w-4 h-4" />
            {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>

        {/* 3-column responsive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* LEFT — Image (3 cols) */}
          <div className="lg:col-span-3">
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5 lg:sticky lg:top-[80px]">
              <h3 className={sectionTitleClass}>
                <ImageIcon className="w-4 h-4 text-[#007AFF]" /> Зураг
              </h3>
              <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]); }} />
              {imagePreview ? (
                <div className="relative aspect-square rounded-xl overflow-hidden group">
                  <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
                  <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                    className="absolute top-2 right-2 w-8 h-8 rounded-full bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                    <X className="w-4 h-4 text-white" />
                  </button>
                  <button type="button" onClick={() => fileInputRef.current?.click()}
                    className="absolute bottom-2 right-2 px-3 py-1.5 rounded-lg bg-black/60 text-white text-[11px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity hover:bg-black/80">
                    Солих
                  </button>
                </div>
              ) : (
                <button type="button" onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-square rounded-xl border-2 border-dashed border-[#E5E5EA] hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all flex flex-col items-center justify-center gap-2">
                  <Upload className="w-10 h-10 text-[#AEAEB2]" />
                  <span className="text-[13px] font-medium text-[#8E8E93]">Зураг оруулах</span>
                  <span className="text-[11px] text-[#AEAEB2]">JPG, PNG, WebP</span>
                  <span className="text-[10px] text-[#AEAEB2]">5MB хүртэл</span>
                </button>
              )}
            </div>
          </div>

          {/* MIDDLE — Main info (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            {/* Үндсэн мэдээлэл */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
              <h3 className={sectionTitleClass}>
                <Package className="w-4 h-4 text-[#007AFF]" /> Үндсэн мэдээлэл
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Нэр *</label>
                  <input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)} required placeholder="Бүтээгдэхүүний нэр" className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Баркод *</label>
                    <input type="text" value={form.sku} onChange={e => handleChange('sku', e.target.value)} required placeholder="IC-VAN-5L" className={inputClass} />
                  </div>
                  <div>
                    <label className={labelClass}>Хэмжих нэгж *</label>
                    <select value={form.unit} onChange={e => handleChange('unit', e.target.value)} required className={inputClass}>
                      <option value="">Сонгох...</option>
                      <option value="PIECE">Ширхэг</option>
                      <option value="BOX">Хайрцаг</option>
                      <option value="KG">Килограмм</option>
                      <option value="LITER">Литр</option>
                      <option value="PACK">Баглаа</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Ангилал *</label>
                    {categories.length === 0 ? (
                      <a href="/categories" className="block px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#B91C1C] font-medium hover:bg-[#FECDD3] transition-all">
                        ⚠️ Ангилал бүртгээгүй байна. Эхлээд <span className="underline font-bold">ангилал үүсгэнэ</span> үү.
                      </a>
                    ) : (
                      <select value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)} required className={inputClass}>
                        <option value="">Сонгох...</option>
                        {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                      </select>
                    )}
                  </div>
                  <div>
                    <label className={labelClass}>Нийлүүлэгч</label>
                    <select value={form.supplierId} onChange={e => handleChange('supplierId', e.target.value)} className={inputClass}>
                      <option value="">Сонгох... (заавал биш)</option>
                      {suppliers.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                    {suppliers.length === 0 && (
                      <a href="/suppliers" className="text-[10px] text-[#007AFF] font-semibold mt-1 inline-block hover:underline">
                        + Нийлүүлэгч үүсгэх
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Тайлбар */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
              <h3 className={sectionTitleClass}>
                <FileText className="w-4 h-4 text-[#5856D6]" /> Тайлбар
              </h3>
              <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Бүтээгдэхүүний дэлгэрэнгүй тайлбар..." rows={5} className={`${inputClass} resize-none`} />
            </div>
          </div>

          {/* RIGHT — Pricing & Stock (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            {/* Үнэ */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
              <h3 className={sectionTitleClass}>
                <DollarSign className="w-4 h-4 text-[#34C759]" /> Үнэ
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Өртөг (₮) *</label>
                  <input type="number" value={form.costPrice} onChange={e => handleChange('costPrice', e.target.value)} required placeholder="0" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>🏙️ Мөрөн үнэ (₮) *</label>
                  <input type="number" value={form.sellingPrice} onChange={e => handleChange('sellingPrice', e.target.value)} required placeholder="0" className={inputClass} />
                  <p className="text-[10px] text-[#8E8E93] mt-1">Мөрөн хот дахь зарах үнэ</p>
                </div>
                <div>
                  <label className={labelClass}>🏞️ Орон нутгийн үнэ (₮)</label>
                  <input type="number" value={form.sellingPriceRural} onChange={e => handleChange('sellingPriceRural', e.target.value)} placeholder="0" className={inputClass} />
                  <p className="text-[10px] text-[#8E8E93] mt-1">Хоосон бол Мөрөн үнэтэй ижил</p>
                </div>

                {/* Live margin preview */}
                {Number(form.costPrice) > 0 && Number(form.sellingPrice) > 0 && (
                  <div className="bg-[#34C759]/5 border border-[#34C759]/20 rounded-xl p-3">
                    <div className="flex items-center justify-between text-[11px] text-[#8E8E93] mb-1">
                      <span>Ашиг (Мөрөн)</span>
                      <span className="font-bold text-[#34C759]">
                        +{Math.round(((Number(form.sellingPrice) - Number(form.costPrice)) / Number(form.costPrice)) * 100)}%
                      </span>
                    </div>
                    <div className="text-[16px] font-bold text-[#34C759]">
                      ₮{(Number(form.sellingPrice) - Number(form.costPrice)).toLocaleString()}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Нөөц & Хэмжээ */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
              <h3 className={sectionTitleClass}>
                <Boxes className="w-4 h-4 text-[#FF9500]" /> Нөөц & Хэмжээ
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Хайрцагт (ширхэг)</label>
                  <input type="number" min={1} value={form.unitsPerBox} onChange={e => handleChange('unitsPerBox', e.target.value)} className={inputClass} placeholder="1" />
                  <p className="text-[10px] text-[#8E8E93] mt-1">Нэг хайрцагт хэдэн ширхэг байх</p>
                </div>
                <div>
                  <label className={labelClass}>Доод хэмжээ *</label>
                  <input type="number" value={form.reorderLevel} onChange={e => handleChange('reorderLevel', e.target.value)} required placeholder="10" className={inputClass} />
                  <p className="text-[10px] text-[#8E8E93] mt-1">Энэ хэмжээнээс бага бол анхааруулна</p>
                </div>
                <div>
                  <label className={labelClass}>Эхний нөөц</label>
                  <input type="number" min="0" value={form.initialStock} onChange={e => handleChange('initialStock', e.target.value)} placeholder="0" className={inputClass} />
                  <p className="text-[10px] text-[#8E8E93] mt-1">Бүртгэх агшинд агуулахад байгаа тоо</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Bottom action bar (mobile only) */}
        <div className="lg:hidden mt-5 flex items-center gap-3 sticky bottom-0 bg-white p-4 -mx-4 border-t border-[#E5E5EA]">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-5 py-3 rounded-xl text-[14px] font-semibold text-[#8E8E93] bg-[#F2F2F7]">
            Цуцлах
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 px-6 py-3 rounded-xl text-[14px] font-semibold text-white disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>
      </form>
    </div>
  );
}
