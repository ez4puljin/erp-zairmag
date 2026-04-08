'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Tag, Plus, Trash2 } from 'lucide-react';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

export default function ExpenseCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchCategories = useCallback(() => {
    setLoading(true);
    api
      .get('/api/expense-categories')
      .then((res) => setCategories(res.data?.data ?? res.data ?? []))
      .catch((err) => {
        alert('Ангилал ачааллахад алдаа гарлаа');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await api.post('/api/expense-categories', {
        name: name.trim(),
        description: description.trim() || undefined,
      });
      setName('');
      setDescription('');
      fetchCategories();
    } catch (err) {
      alert('Ангилал нэмэхэд алдаа гарлаа');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Энэ ангилалыг устгах уу?')) return;
    try {
      await api.delete(`/api/expense-categories/${id}`);
      fetchCategories();
    } catch (err) {
      alert('Устгахад алдаа гарлаа');
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 animate-ios-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Зардлын ангилал</h1>
      </div>

      {/* Add Form */}
      <form
        onSubmit={handleAdd}
        className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-4 space-y-3"
      >
        <div className="flex items-center gap-3">
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={`${inputClass} !py-2.5`}
            placeholder="Ангилалын нэр"
            required
          />
          <input
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className={`${inputClass} !py-2.5`}
            placeholder="Тайлбар (заавал биш)"
          />
          <button
            type="submit"
            disabled={submitting}
            className="shrink-0 inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
          >
            <Plus className="w-4 h-4" /> Нэмэх
          </button>
        </div>
      </form>

      {/* Category List */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#E5E5EA]/50">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-[#F2F2F7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#F2F2F7] rounded-lg" />
                  <div className="h-3 w-24 bg-[#F2F2F7] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : categories.length === 0 ? (
          <div className="py-16 text-center">
            <Tag className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-[#1C1C1E]">Ангилал олдсонгүй</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5EA]/50">
            {categories.map((cat: any) => (
              <div key={cat.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                  <Tag className="w-5 h-5 text-[#007AFF]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">{cat.name}</p>
                  {cat.description && (
                    <p className="text-[13px] text-[#8E8E93] truncate">{cat.description}</p>
                  )}
                </div>
                <button
                  onClick={() => handleDelete(cat.id)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-[#AEAEB2] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-all"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
