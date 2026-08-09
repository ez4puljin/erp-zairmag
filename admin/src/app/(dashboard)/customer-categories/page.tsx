'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { MapPin, Plus, Pencil, Trash2, X, RefreshCw } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { EmptyState } from '@/components/shared/empty-state';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { CUSTOMER_CATEGORY_TYPES } from '@/lib/options';

const typeConfig: Record<string, { label: string; bg: string; text: string }> = {
  KHOROO: { label: 'Хороо', bg: '#007AFF15', text: '#007AFF' },
  SUM: { label: 'Сум', bg: '#34C75915', text: '#34C759' },
};

const inputClass =
  'w-full px-3.5 py-2.5 rounded-xl bg-[#F5F6FA] border border-transparent text-[14px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none transition-all focus:border-[#007AFF]/40 focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

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
      <PageHeader
        title="Харилцагчийн ангилал"
        subtitle={`${categories.length} ангилал · хороо / сум`}
        icon={MapPin}
        actions={
          <button
            onClick={openAdd}
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-semibold text-white bg-[#007AFF] shadow-sm shadow-[#007AFF]/25 hover:brightness-105 transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" /> Нэмэх
          </button>
        }
      />

      {/* Category List */}
      <SectionCard noPadding>
        {loading ? (
          <div className="py-16 text-center">
            <RefreshCw className="w-6 h-6 text-[#8C8FA3] mx-auto animate-spin" />
          </div>
        ) : categories.length === 0 ? (
          <EmptyState
            icon={MapPin}
            title="Ангилал байхгүй"
            hint="Шинэ харилцагчийн ангилал нэмнэ үү"
          />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {categories.map((cat: any) => {
              const typeInfo = typeConfig[cat.type] ?? typeConfig.KHOROO;
              const customerCount = cat._count?.customers ?? cat.customerCount ?? 0;
              return (
                <div
                  key={cat.id}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F7F9FC] transition-colors"
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: typeInfo.bg }}
                  >
                    <MapPin className="w-5 h-5" style={{ color: typeInfo.text }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-[15px] font-semibold text-[#1A1D26] truncate">
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
                      <p className="text-[13px] text-[#8C8FA3] truncate mt-0.5">
                        {cat.description}
                      </p>
                    )}
                  </div>
                  <span className="text-[12px] font-medium text-[#8C8FA3] bg-[#F2F4F7] px-2.5 py-0.5 rounded-full shrink-0">
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
      </SectionCard>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[20px] font-bold text-[#1A1D26]">
                {editItem ? 'Ангилал засах' : 'Шинэ ангилал'}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="p-1.5 rounded-lg hover:bg-[#F2F4F7] transition-colors"
              >
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>
            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">
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
                <label className="block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">
                  Төрөл
                </label>
                <SearchableSelect
                  value={form.type}
                  onChange={(v) => setForm((prev) => ({ ...prev, type: v }))}
                  options={CUSTOMER_CATEGORY_TYPES}
                  inputClassName={inputClass}
                  widthClass="w-full"
                  aria-label="Төрөл"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">
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
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#4A4D5C] bg-[#F2F4F7] hover:bg-[#E8ECF0] transition-all active:scale-[0.97]"
                >
                  Цуцлах
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white bg-[#007AFF] shadow-sm shadow-[#007AFF]/25 hover:brightness-105 transition-all active:scale-[0.97] disabled:opacity-60"
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
            <h3 className="text-[18px] font-bold text-[#1A1D26] mb-1">
              &ldquo;{deleteItem.name}&rdquo; устгах уу?
            </h3>
            <p className="text-[14px] text-[#8C8FA3] mb-2">
              Харилцагчтай ангилал устгах боломжгүй.
            </p>
            {error && <p className="text-[13px] text-[#FF3B30] font-medium mb-3">{error}</p>}
            <div className="flex gap-3">
              <button
                onClick={() => setDeleteItem(null)}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#4A4D5C] bg-[#F2F4F7] hover:bg-[#E8ECF0] transition-all active:scale-[0.97]"
              >
                Цуцлах
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white bg-[#FF3B30] hover:brightness-105 transition-all active:scale-[0.97] disabled:opacity-60"
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
