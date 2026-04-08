'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { MapPin, Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react';

const typeConfig: Record<string, { label: string; bg: string; text: string }> = {
  KHOROO: { label: 'Хороо', bg: '#007AFF15', text: '#007AFF' },
  SUM: { label: 'Сум', bg: '#34C75915', text: '#34C759' },
};

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

export default function CustomerCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [form, setForm] = useState({ name: '', type: 'KHOROO', description: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = () => {
    setLoading(true);
    api
      .get('/api/customer-categories')
      .then((res) => {
        setCategories(res.data?.data ?? res.data ?? []);
      })
      .catch((err) => {
        alert('Харилцагчийн ангилал ачааллахад алдаа гарлаа');
        console.error(err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', type: 'KHOROO', description: '' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (cat: any) => {
    setEditItem(cat);
    setForm({
      name: cat.name,
      type: cat.type ?? 'KHOROO',
      description: cat.description ?? '',
    });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      const payload: any = { name: form.name, type: form.type };
      if (form.description.trim()) payload.description = form.description.trim();
      if (editItem) {
        await api.patch(`/api/customer-categories/${editItem.id}`, payload);
      } else {
        await api.post('/api/customer-categories', payload);
      }
      setShowModal(false);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    setError('');
    try {
      await api.delete(`/api/customer-categories/${deleteItem.id}`);
      setDeleteItem(null);
      fetchCategories();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Устгах боломжгүй (харилцагчтай ангилал)');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">
          Харилцагчийн ангилал
        </h1>
        <button
          onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}
        >
          <Plus className="w-4 h-4" /> Нэмэх
        </button>
      </div>

      {/* Category List */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center">
            <RefreshCw className="w-6 h-6 text-[#8E8E93] mx-auto animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <MapPin className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-[#1C1C1E]">Ангилал байхгүй</p>
            <p className="text-[14px] text-[#8E8E93] mt-1">
              Шинэ харилцагчийн ангилал нэмнэ үү
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5EA]/50">
            {categories.map((cat: any) => {
              const typeInfo = typeConfig[cat.type] ?? typeConfig.KHOROO;
              const customerCount = cat._count?.customers ?? cat.customerCount ?? 0;
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F2F2F7]/50 transition-colors"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#FF9500]/10 flex items-center justify-center shrink-0">
                    <MapPin className="w-5 h-5 text-[#FF9500]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">
                        {cat.name}
                      </p>
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-[11px] font-bold shrink-0"
                        style={{ backgroundColor: typeInfo.bg, color: typeInfo.text }}
                      >
                        {typeInfo.label}
                      </span>
                    </div>
                    {cat.description && (
                      <p className="text-[13px] text-[#8E8E93] truncate mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[12px] font-medium text-[#8E8E93] bg-[#F2F2F7] px-2.5 py-0.5 rounded-full shrink-0">
                    {customerCount} харилцагч
                  </span>
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => openEdit(cat)}
                      className="p-2 rounded-lg hover:bg-[#007AFF]/10 transition-colors"
                    >
                      <Pencil className="w-4 h-4 text-[#007AFF]" />
                    </button>
                    <button
                      onClick={() => {
                        setError('');
                        setDeleteItem(cat);
                      }}
                      className="p-2 rounded-lg hover:bg-[#FF3B30]/10 transition-colors"
                    >
                      <Trash2 className="w-4 h-4 text-[#FF3B30]" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[20px] font-bold text-[#1C1C1E]">
                {editItem ? 'Ангилал засах' : 'Шинэ ангилал'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1 rounded-lg hover:bg-[#F2F2F7]"
              >
                <X className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">
                  Нэр
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((prev) => ({ ...prev, name: e.target.value }))}
                  required
                  placeholder="Ангилалын нэр"
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">
                  Төрөл
                </label>
                <select
                  value={form.type}
                  onChange={(e) => setForm((prev) => ({ ...prev, type: e.target.value }))}
                  className={inputClass}
                >
                  <option value="KHOROO">Хороо</option>
                  <option value="SUM">Сум</option>
                </select>
              </div>
              <div>
                <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">
                  Тайлбар
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                  placeholder="Нэмэлт тайлбар (заавал биш)"
                  rows={3}
                  className={inputClass + ' resize-none'}
                />
              </div>
              {error && <p className="text-[13px] text-[#FF3B30] font-medium">{error}</p>}
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/40 transition-all active:scale-[0.97]"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}
                >
                  {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setDeleteItem(null)} />
          <div className="relative w-full max-w-sm rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in text-center">
            <div className="w-14 h-14 rounded-full bg-[#FF3B30]/10 flex items-center justify-center mx-auto mb-4">
              <Trash2 className="w-7 h-7 text-[#FF3B30]" />
            </div>
            <h3 className="text-[18px] font-bold text-[#1C1C1E] mb-1">
              &ldquo;{deleteItem.name}&rdquo; устгах уу?
            </h3>
            <p className="text-[14px] text-[#8E8E93] mb-2">
              Харилцагчтай ангилал устгах боломжгүй.
            </p>
            {error && <p className="text-[13px] text-[#FF3B30] font-medium mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteItem(null)}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/40 transition-all active:scale-[0.97]"
              >
                Цуцлах
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white bg-[#FF3B30] transition-all active:scale-[0.97] disabled:opacity-60"
              >
                {deleting ? 'Устгаж байна...' : 'Устгах'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
