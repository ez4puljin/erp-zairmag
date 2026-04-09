'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { FolderOpen, Plus, Pencil, Trash2, X, ChevronRight, RefreshCw } from 'lucide-react';

export default function CategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', parentId: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = () => {
    setLoading(true);
    api.get('/api/categories').then(res => {
      setCategories(res.data?.data ?? res.data ?? []);
    }).catch((err) => {
      alert('Ангилал ачааллахад алдаа гарлаа');
      console.error(err);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchCategories(); }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', parentId: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (cat: any) => {
    setEditItem(cat);
    setForm({ name: cat.name, parentId: cat.parentId ?? '' });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      if (editItem) {
        const payload: any = { name: form.name };
        if (form.parentId) payload.parentId = form.parentId;
        await api.patch(`/api/categories/${editItem.id}`, payload);
      } else {
        const payload: any = { name: form.name };
        if (form.parentId) payload.parentId = form.parentId;
        await api.post('/api/categories', payload);
      }
      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Алдаа гарлаа');
    } finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/categories/${deleteItem.id}`);
      setDeleteItem(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Устгах боломжгүй (дэд ангилал эсвэл бараатай)');
    } finally { setDeleting(false); }
  };

  // Flatten categories for display (parents first, then children indented)
  const flatList: { cat: any; indent: number }[] = [];
  const topLevel = categories.filter((c: any) => !c.parentId);
  topLevel.forEach((parent: any) => {
    flatList.push({ cat: parent, indent: 0 });
    const children = categories.filter((c: any) => c.parentId === parent.id);
    children.forEach((child: any) => {
      flatList.push({ cat: child, indent: 1 });
    });
  });
  // Add any orphans
  categories.filter((c: any) => c.parentId && !categories.find((p: any) => p.id === c.parentId))
    .forEach((c: any) => flatList.push({ cat: c, indent: 0 }));

  const inputClass = "w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white";

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Ангилал</h1>
        <button onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}>
          <Plus className="w-4 h-4" /> Нэмэх
        </button>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center"><RefreshCw className="w-6 h-6 text-[#8E8E93] mx-auto animate-spin" /></div>
        ) : flatList.length === 0 ? (
          <div className="py-16 text-center">
            <FolderOpen className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-[#1C1C1E]">Ангилал байхгүй</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5EA]/50">
            {flatList.map(({ cat, indent }) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3 hover:bg-[#F2F2F7]/50 transition-colors"
                   style={{ paddingLeft: `${16 + indent * 28}px` }}>
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${indent ? 'bg-[#5AC8FA]/10' : 'bg-[#FF9500]/10'}`}>
                  <FolderOpen className={`w-4 h-4 ${indent ? 'text-[#5AC8FA]' : 'text-[#FF9500]'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1C1C1E]">{cat.name}</p>
                  {indent > 0 && (
                    <p className="text-[12px] text-[#8E8E93]">
                      {categories.find((p: any) => p.id === cat.parentId)?.name ?? ''}
                    </p>
                  )}
                </div>
                {cat._count?.products != null && (
                  <span className="text-[12px] font-medium text-[#8E8E93] bg-[#F2F2F7] px-2 py-0.5 rounded-full">
                    {cat._count.products} бараа
                  </span>
                )}
                <div className="flex items-center gap-1 shrink-0">
                  <button onClick={() => openEdit(cat)} className="p-2 rounded-lg hover:bg-[#007AFF]/10 transition-colors">
                    <Pencil className="w-4 h-4 text-[#007AFF]" />
                  </button>
                  <button onClick={() => { setError(''); setDeleteItem(cat); }} className="p-2 rounded-lg hover:bg-[#FF3B30]/10 transition-colors">
                    <Trash2 className="w-4 h-4 text-[#FF3B30]" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[20px] font-bold text-[#1C1C1E]">{editItem ? 'Ангилал засах' : 'Шинэ ангилал'}</h3>
              <button onClick={() => setShowModal(false)} className="p-1 rounded-lg hover:bg-[#F2F2F7]">
                <X className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Нэр</label>
                <input type="text" value={form.name} onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))} required placeholder="Ангилалын нэр" className={inputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">Эцэг ангилал</label>
                <select value={form.parentId} onChange={e => setForm(prev => ({ ...prev, parentId: e.target.value }))} className={inputClass}>
                  <option value="">Байхгүй (Үндсэн)</option>
                  {categories.filter((c: any) => c.id !== editItem?.id).map((c: any) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              {error && <p className="text-[13px] text-[#FF3B30] font-medium">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/40 transition-all active:scale-[0.97]">
                  Цуцлах
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}>
                  {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteItem(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-[#FF3B30]" />
            </div>
            <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-1">&ldquo;{deleteItem.name}&rdquo; устгах уу?</h3>
            <p className="text-[14px] text-[#8E8E93] mb-2">Дэд ангилал эсвэл бараатай бол устгах боломжгүй.</p>
            {error && <p className="text-[13px] text-[#FF3B30] font-medium mb-3">{error}</p>}
            <div className="flex gap-3">
              <button onClick={() => setDeleteItem(null)}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/40 transition-all active:scale-[0.97]">
                Цуцлах
              </button>
              <button onClick={handleDelete} disabled={deleting}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white bg-[#FF3B30] transition-all active:scale-[0.97] disabled:opacity-60">
                {deleting ? 'Устгаж байна...' : 'Устгах'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
