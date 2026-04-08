'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { ChevronLeft, Upload, X, Image as ImageIcon } from 'lucide-react';

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
    unit: '', unitsPerBox: '1', costPrice: '', sellingPrice: '', reorderLevel: '',
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

  const inputClass = "w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white";
  const labelClass = "block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5";

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-2xl">
      <div>
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[15px] text-[#007AFF] font-medium hover:text-[#0066D6] transition-colors mb-3 active:scale-[0.97]">
          <ChevronLeft className="w-5 h-5" /> Бүтээгдэхүүн
        </button>
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Шинэ бүтээгдэхүүн</h1>
      </div>

      <form onSubmit={handleSubmit}>
        {/* Image Upload */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5 mb-4">
          <label className={labelClass}>Зураг</label>
          <input type="file" ref={fileInputRef} accept="image/*" className="hidden"
            onChange={(e) => { if (e.target.files?.[0]) handleImageSelect(e.target.files[0]); }} />
          {imagePreview ? (
            <div className="relative w-32 h-32 rounded-xl overflow-hidden group">
              <img src={imagePreview} alt="Preview" className="w-full h-full object-cover" />
              <button type="button" onClick={() => { setImageFile(null); setImagePreview(null); }}
                className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <X className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
          ) : (
            <button type="button" onClick={() => fileInputRef.current?.click()}
              className="w-full py-8 rounded-xl border-2 border-dashed border-[#E5E5EA] hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all flex flex-col items-center gap-2">
              <Upload className="w-8 h-8 text-[#AEAEB2]" />
              <span className="text-[14px] font-medium text-[#8E8E93]">Зураг оруулах</span>
              <span className="text-[12px] text-[#AEAEB2]">JPG, PNG, WebP (5MB хүртэл)</span>
            </button>
          )}
        </div>

        {/* Form Fields */}
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5 space-y-5">
          <div className="space-y-4">
            <div>
              <label className={labelClass}>Нэр</label>
              <input type="text" value={form.name} onChange={e => handleChange('name', e.target.value)} required placeholder="Бүтээгдэхүүний нэр" className={inputClass} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Баркод</label>
                <input type="text" value={form.sku} onChange={e => handleChange('sku', e.target.value)} required placeholder="IC-VAN-5L" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Хэмжих нэгж</label>
                <select value={form.unit} onChange={e => handleChange('unit', e.target.value)} required className={inputClass}>
                  <option value="">Сонгох...</option>
                  <option value="PIECE">Ширхэг</option>
                  <option value="BOX">Хайрцаг</option>
                  <option value="KG">Килограмм</option>
                  <option value="LITER">Литр</option>
                  <option value="PACK">Баглаа</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>Хайрцагт (ширхэг)</label>
                <input type="number" min={1} value={form.unitsPerBox} onChange={e => handleChange('unitsPerBox', e.target.value)} className={inputClass} placeholder="1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Ангилал</label>
                <select value={form.categoryId} onChange={e => handleChange('categoryId', e.target.value)} required className={inputClass}>
                  <option value="">Сонгох...</option>
                  {categories.map((c: any) => (<option key={c.id} value={c.id}>{c.name}</option>))}
                </select>
              </div>
              <div>
                <label className={labelClass}>Нийлүүлэгч</label>
                <select value={form.supplierId} onChange={e => handleChange('supplierId', e.target.value)} className={inputClass}>
                  <option value="">Сонгох...</option>
                  {suppliers.map((s: any) => (<option key={s.id} value={s.id}>{s.name}</option>))}
                </select>
              </div>
            </div>
            <div>
              <label className={labelClass}>Тайлбар</label>
              <textarea value={form.description} onChange={e => handleChange('description', e.target.value)} placeholder="Бүтээгдэхүүний тайлбар..." rows={3} className={`${inputClass} resize-none`} />
            </div>
          </div>
          <div className="border-t border-[#E5E5EA]/50 pt-5">
            <h3 className="text-[13px] font-semibold uppercase text-[#8E8E93] tracking-wide mb-4">Үнэ & Нөөц</h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Өртөг (₮)</label>
                <input type="number" value={form.costPrice} onChange={e => handleChange('costPrice', e.target.value)} required placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Зарах үнэ (₮)</label>
                <input type="number" value={form.sellingPrice} onChange={e => handleChange('sellingPrice', e.target.value)} required placeholder="0" className={inputClass} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelClass}>Доод хэмжээ</label>
                <input type="number" value={form.reorderLevel} onChange={e => handleChange('reorderLevel', e.target.value)} required placeholder="10" className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Эхний нөөц</label>
                <input type="number" min="0" value={form.initialStock} onChange={e => handleChange('initialStock', e.target.value)} placeholder="0" className={inputClass} />
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 mt-5">
          <button type="button" onClick={() => router.back()}
            className="px-5 py-2.5 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/40 hover:bg-[#E5E5EA]/60 transition-all active:scale-[0.97]">
            Цуцлах
          </button>
          <button type="submit" disabled={submitting}
            className="px-6 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
            {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
          </button>
        </div>
      </form>
    </div>
  );
}
