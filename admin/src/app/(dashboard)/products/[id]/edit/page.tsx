'use client';

import { useState, useEffect, useRef } from 'react';
import type { LucideIcon } from 'lucide-react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ChevronLeft, Upload, X, RefreshCw, Package, DollarSign, Boxes, FileText, CheckCircle, Image as ImageIcon } from 'lucide-react';
import { formatMnt } from '@/components/shared/money';

export default function EditProductPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [categories, setCategories] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: '', sku: '', description: '', categoryId: '', supplierId: '',
    unit: '', unitsPerBox: '1', costPrice: '', sellingPrice: '', sellingPriceRural: '', reorderLevel: '',
  });

  useEffect(() => {
    Promise.all([
      api.get(`/api/products/${id}`).then(res => {
        const p = res.data;
        setForm({
          name: p.name ?? '', sku: p.sku ?? '', description: p.description ?? '',
          categoryId: p.categoryId ?? '', supplierId: p.supplierId ?? '',
          unit: p.unit ?? '', unitsPerBox: String(p.unitsPerBox ?? '1'),
          costPrice: String(p.costPrice ?? ''),
          sellingPrice: String(p.sellingPrice ?? ''),
          sellingPriceRural: String(p.sellingPriceRural ?? ''),
          reorderLevel: String(p.reorderLevel ?? ''),
        });
        if (p.imageUrl) setImagePreview(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${p.imageUrl}`);
      }),
      api.get('/api/categories').then(res => setCategories(res.data?.data ?? res.data ?? [])),
      api.get('/api/suppliers?limit=100').then(res => setSuppliers(res.data?.data ?? res.data ?? [])),
    ]).catch(err => {
      alert('Бүтээгдэхүүний мэдээлэл ачааллахад алдаа гарлаа');
      console.error(err);
    }).finally(() => setLoading(false));
  }, [id]);

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
      await api.patch(`/api/products/${id}`, {
        name: form.name.trim(),
        sku: form.sku.trim(),
        description: form.description?.trim() || undefined,
        categoryId: form.categoryId,
        supplierId: form.supplierId || null,
        unit: form.unit || 'PIECE',
        unitsPerBox: Number(form.unitsPerBox) || 1,
        costPrice: Number(form.costPrice),
        sellingPrice: Number(form.sellingPrice),
        sellingPriceRural: Number(form.sellingPriceRural || form.sellingPrice),
        reorderLevel: Number(form.reorderLevel) || 0,
      });

      if (imageFile) {
        const formData = new FormData();
        formData.append('image', imageFile);
        await api.post(`/api/products/${id}/image`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
      }

      router.push('/products');
    } catch (err) {
      alert('Бүтээгдэхүүн засварлахад алдаа гарлаа');
      console.error(err);
    }
    finally { setSubmitting(false); }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-[#8C8FA3] animate-spin" />
      </div>
    );
  }

  const inputClass = "w-full px-4 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none transition-all focus:border-[#007AFF]/40 focus:ring-[3px] focus:ring-[#007AFF]/12 focus:bg-white";
  const labelClass = "block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1";

  const FormCard = ({ icon: Icon, iconColor, title, children }: { icon: LucideIcon; iconColor: string; title: string; children: React.ReactNode }) => (
    <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden">
      <div className="flex items-center gap-2 px-4 lg:px-5 py-3 border-b border-[#F0F2F5]">
        <Icon className="w-4 h-4" style={{ color: iconColor }} />
        <h3 className="text-[13px] font-semibold uppercase tracking-wide text-[#8C8FA3]">{title}</h3>
      </div>
      <div className="p-4 lg:p-5">{children}</div>
    </div>
  );

  return (
    <div className="animate-ios-fade-in">
      <form onSubmit={handleSubmit}>
        {/* Sticky header */}
        <div className="sticky top-0 z-20 -mx-4 lg:-mx-6 px-4 lg:px-6 py-3 bg-white/85 backdrop-blur-xl border-b border-[#E8ECF0]/70 mb-5 flex items-center gap-3">
          <button type="button" onClick={() => router.back()}
            className="flex items-center gap-1 text-[13px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors active:scale-[0.97]">
            <ChevronLeft className="w-5 h-5" /> Бүтээгдэхүүн
          </button>
          <div className="h-5 w-px bg-[#E8ECF0]" />
          <h1 className="flex-1 text-[18px] font-bold text-[#1A1D26] tracking-tight truncate">Засах — {form.name || '...'}</h1>
          <button type="button" onClick={() => router.back()}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-[#4A4D5C] bg-white border border-[#E8ECF0] hover:bg-[#F2F4F7] transition-all active:scale-[0.97]">
            Цуцлах
          </button>
          <button type="submit" disabled={submitting}
            className="flex items-center gap-1.5 px-5 py-2 rounded-xl text-[13px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] disabled:opacity-60 hover:brightness-105"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            <CheckCircle className="w-4 h-4" />
            {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>

        {/* 3-column responsive grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">

          {/* LEFT — Image (3 cols) */}
          <div className="lg:col-span-3">
            <div className="lg:sticky lg:top-[80px]">
              <FormCard icon={ImageIcon} iconColor="#007AFF" title="Зураг">
                <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
                  onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]); }} />
                {imagePreview ? (
                  <div className="relative aspect-square rounded-xl overflow-hidden group ring-1 ring-[#E8ECF0]/70">
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
                    className="w-full aspect-square rounded-xl border-2 border-dashed border-[#E8ECF0] hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all flex flex-col items-center justify-center gap-2">
                    <Upload className="w-10 h-10 text-[#C4C7D0]" />
                    <span className="text-[13px] font-medium text-[#8C8FA3]">Зураг оруулах</span>
                    <span className="text-[11px] text-[#AEAEB2]">JPG, PNG, WebP</span>
                  </button>
                )}
              </FormCard>
            </div>
          </div>

          {/* MIDDLE — Main info (5 cols) */}
          <div className="lg:col-span-5 space-y-5">
            <FormCard icon={Package} iconColor="#007AFF" title="Үндсэн мэдээлэл">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Нэр *</label>
                  <input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)} required className={inputClass} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelClass}>Баркод *</label>
                    <input type="text" value={form.sku} onChange={e => handleChange('sku', e.target.value)} required className={inputClass} />
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
                    <select value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)} required className={inputClass}>
                      <option value="">Сонгох...</option>
                      {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass}>Нийлүүлэгч</label>
                    <select value={form.supplierId} onChange={e => handleChange('supplierId', e.target.value)} className={inputClass}>
                      <option value="">Сонгох... (заавал биш)</option>
                      {suppliers.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                    </select>
                  </div>
                </div>
              </div>
            </FormCard>

            <FormCard icon={FileText} iconColor="#5856D6" title="Тайлбар">
              <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Бүтээгдэхүүний дэлгэрэнгүй тайлбар..." rows={5} className={`${inputClass} resize-none`} />
            </FormCard>
          </div>

          {/* RIGHT — Pricing & Stock (4 cols) */}
          <div className="lg:col-span-4 space-y-5">
            <FormCard icon={DollarSign} iconColor="#34C759" title="Үнэ">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Өртөг (₮) *</label>
                  <input type="number" value={form.costPrice} onChange={e => handleChange('costPrice', e.target.value)} required className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>🏙️ Мөрөн үнэ (₮) *</label>
                  <input type="number" value={form.sellingPrice} onChange={e => handleChange('sellingPrice', e.target.value)} required className={inputClass} />
                  <p className="text-[10px] text-[#8C8FA3] mt-1">Мөрөн хот дахь зарах үнэ</p>
                </div>
                <div>
                  <label className={labelClass}>🏞️ Орон нутгийн үнэ (₮)</label>
                  <input type="number" value={form.sellingPriceRural} onChange={e => handleChange('sellingPriceRural', e.target.value)} className={inputClass} />
                  <p className="text-[10px] text-[#8C8FA3] mt-1">Хоосон бол Мөрөн үнэтэй ижил</p>
                </div>

                {Number(form.costPrice) > 0 && Number(form.sellingPrice) > 0 && (
                  <div className="bg-[#34C759]/6 border border-[#34C759]/20 rounded-xl p-3">
                    <div className="flex items-center justify-between text-[11px] text-[#8C8FA3] mb-1">
                      <span>Ашиг (Мөрөн)</span>
                      <span className="font-bold text-[#34C759]">
                        +{Math.round(((Number(form.sellingPrice) - Number(form.costPrice)) / Number(form.costPrice)) * 100)}%
                      </span>
                    </div>
                    <div className="text-[16px] font-bold text-[#34C759] tabular-nums">
                      {formatMnt(Number(form.sellingPrice) - Number(form.costPrice))}
                    </div>
                  </div>
                )}
              </div>
            </FormCard>

            <FormCard icon={Boxes} iconColor="#FF9500" title="Нөөц & Хэмжээ">
              <div className="space-y-4">
                <div>
                  <label className={labelClass}>Хайрцагт (ширхэг)</label>
                  <input type="number" min={1} value={form.unitsPerBox} onChange={e => handleChange('unitsPerBox', e.target.value)} className={inputClass} />
                  <p className="text-[10px] text-[#8C8FA3] mt-1">Нэг хайрцагт хэдэн ширхэг байх</p>
                </div>
                <div>
                  <label className={labelClass}>Доод хэмжээ *</label>
                  <input type="number" value={form.reorderLevel} onChange={e => handleChange('reorderLevel', e.target.value)} required className={inputClass} />
                  <p className="text-[10px] text-[#8C8FA3] mt-1">Энэ хэмжээнээс бага бол анхааруулна</p>
                </div>
              </div>
            </FormCard>
          </div>
        </div>

        {/* Bottom action bar (mobile only) */}
        <div className="lg:hidden mt-5 flex items-center gap-3 sticky bottom-0 bg-white/90 backdrop-blur-xl p-4 -mx-4 border-t border-[#E8ECF0]">
          <button type="button" onClick={() => router.back()}
            className="flex-1 px-5 py-3 rounded-xl text-[14px] font-semibold text-[#4A4D5C] bg-[#F2F4F7]">
            Цуцлах
          </button>
          <button type="submit" disabled={submitting}
            className="flex-1 px-6 py-3 rounded-xl text-[14px] font-semibold text-white disabled:opacity-60 shadow-sm shadow-[#007AFF]/25"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>
      </form>
    </div>
  );
}
