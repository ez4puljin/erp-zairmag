'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Truck, Plus, Search, Pencil, Trash2, X, ChevronLeft, ChevronRight, RefreshCw, Phone, Mail, MapPin, User, Building2, Wallet, FileText, Save } from 'lucide-react';

export default function SuppliersPage() {
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);
  const [deleteItem, setDeleteItem] = useState<any>(null);
  const [submitting, setSubmitting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({ name: '', contactName: '', phone: '', email: '', address: '', city: '', notes: '', openingBalance: '' });

  const fetchSuppliers = () => {
    setLoading(true);
    const params = new URLSearchParams({ page: String(page), limit: '10' });
    if (search) params.set('search', search);
    api.get(`/api/suppliers?${params}`).then(res => {
      setSuppliers(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    }).catch((err) => {
      alert('Нийлүүлэгчдийн мэдээлэл ачааллахад алдаа гарлаа');
      console.error(err);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { fetchSuppliers(); }, [page, search]);

  const openAdd = () => {
    setEditItem(null);
    setForm({ name: '', contactName: '', phone: '', email: '', address: '', city: '', notes: '', openingBalance: '' });
    setShowModal(true);
  };

  const openEdit = (s: any) => {
    setEditItem(s);
    setForm({
      name: s.name ?? '', contactName: s.contactName ?? '', phone: s.phone ?? '',
      email: s.email ?? '', address: s.address ?? '', city: s.city ?? '', notes: s.notes ?? '',
      openingBalance: s.openingBalance ? String(Number(s.openingBalance)) : '',
    });
    setShowModal(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const data: any = { ...form };
      // Clean empty strings
      Object.keys(data).forEach(k => { if (!data[k] && k !== 'openingBalance') delete data[k]; });
      data.name = form.name; // name is required
      if (form.openingBalance) data.openingBalance = Number(form.openingBalance);
      else delete data.openingBalance;

      if (editItem) {
        await api.patch(`/api/suppliers/${editItem.id}`, data);
      } else {
        await api.post('/api/suppliers', data);
      }
      setShowModal(false);
      fetchSuppliers();
    } catch (err) {
      alert('Нийлүүлэгч хадгалахад алдаа гарлаа');
      console.error(err);
    }
    finally { setSubmitting(false); }
  };

  const handleDelete = async () => {
    if (!deleteItem) return;
    setDeleting(true);
    try {
      await api.delete(`/api/suppliers/${deleteItem.id}`);
      setDeleteItem(null);
      fetchSuppliers();
    } catch (err) {
      alert('Нийлүүлэгч устгахад алдаа гарлаа');
      console.error(err);
    }
    finally { setDeleting(false); }
  };

  const inputClass = "w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white";
  const labelClass = "block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5";

  const avatarColors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5856D6'];

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Нийлүүлэгч</h1>
        <button onClick={openAdd}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' }}>
          <Plus className="w-4 h-4" /> Нэмэх
        </button>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
        <input type="text" placeholder="Нийлүүлэгч хайх..." value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#E5E5EA]/40 border-none text-[15px] text-[#1C1C1E] placeholder-[#8E8E93] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#007AFF]/20" />
      </div>

      {/* Supplier List */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center"><RefreshCw className="w-6 h-6 text-[#8E8E93] mx-auto animate-spin" /></div>
        ) : suppliers.length === 0 ? (
          <div className="py-16 text-center">
            <Truck className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-[#1C1C1E]">Нийлүүлэгч олдсонгүй</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5EA]/50">
            {suppliers.map((s: any, i: number) => {
              const color = avatarColors[i % avatarColors.length];
              return (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F2F2F7]/50 transition-colors">
                  <div className="w-11 h-11 rounded-full flex items-center justify-center text-[14px] font-bold text-white shrink-0"
                       style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}>
                    {s.name?.charAt(0)?.toUpperCase() ?? '?'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">{s.name}</p>
                    <p className="text-[13px] text-[#8E8E93] truncate">
                      {[s.contactName, s.phone, s.city].filter(Boolean).join(' \u00b7 ')}
                    </p>
                  </div>
                  {Number(s.openingBalance) > 0 && (
                    <span className="text-[13px] font-semibold text-[#FF9500] mr-2">
                      ₮{Number(s.openingBalance).toLocaleString()}
                    </span>
                  )}
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(s)} className="p-2 rounded-lg hover:bg-[#007AFF]/10 transition-colors">
                      <Pencil className="w-4 h-4 text-[#007AFF]" />
                    </button>
                    <button onClick={() => setDeleteItem(s)} className="p-2 rounded-lg hover:bg-[#FF3B30]/10 transition-colors">
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
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA]/50 flex items-center justify-center text-[#8E8E93] disabled:opacity-30 transition-all active:scale-95">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium text-[#8E8E93] px-3">{page} / {meta.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
            className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA]/50 flex items-center justify-center text-[#8E8E93] disabled:opacity-30 transition-all active:scale-95">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative w-full max-w-2xl rounded-2xl bg-white shadow-2xl animate-ios-scale-in max-h-[92vh] flex flex-col overflow-hidden">
            {/* Modal header */}
            <div className="flex items-center gap-4 px-6 py-5 border-b border-[#E5E5EA]/60">
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0" style={{ background: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' }}>
                <Truck className="w-6 h-6 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-[18px] font-bold text-[#1C1C1E]">{editItem ? 'Нийлүүлэгч засах' : 'Шинэ нийлүүлэгч'}</h3>
                <p className="text-[12px] text-[#8E8E93] mt-0.5">Нийлүүлэгчийн дэлгэрэнгүй мэдээлэл</p>
              </div>
              <button onClick={() => setShowModal(false)} className="p-2 rounded-xl hover:bg-[#F2F2F7] transition-colors">
                <X className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </div>

            {/* Modal body */}
            <form onSubmit={handleSave} className="overflow-y-auto flex-1">
              <div className="p-6 space-y-6">
                {/* Section 1: Үндсэн мэдээлэл */}
                <div>
                  <h4 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Building2 className="w-3.5 h-3.5" />
                    Үндсэн мэдээлэл
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Компанийн нэр <span className="text-[#FF3B30]">*</span></label>
                      <div className="relative">
                        <Building2 className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2] pointer-events-none" />
                        <input
                          type="text" value={form.name}
                          onChange={e => setForm(prev => ({ ...prev, name: e.target.value }))}
                          required placeholder="Жишээ: Ариун Зайрмаг ХХК"
                          className={`${inputClass} pl-10`}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className={labelClass}>Холбоо барих хүн</label>
                        <div className="relative">
                          <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2] pointer-events-none" />
                          <input type="text" value={form.contactName} onChange={e => setForm(prev => ({ ...prev, contactName: e.target.value }))} placeholder="Овог нэр" className={`${inputClass} pl-10`} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Утас</label>
                        <div className="relative">
                          <Phone className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2] pointer-events-none" />
                          <input type="text" value={form.phone} onChange={e => setForm(prev => ({ ...prev, phone: e.target.value }))} placeholder="99112233" className={`${inputClass} pl-10`} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 2: Холбоо барих хаяг */}
                <div>
                  <h4 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <MapPin className="w-3.5 h-3.5" />
                    Холбоо барих хаяг
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>И-мэйл</label>
                      <div className="relative">
                        <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2] pointer-events-none" />
                        <input type="email" value={form.email} onChange={e => setForm(prev => ({ ...prev, email: e.target.value }))} placeholder="info@company.mn" className={`${inputClass} pl-10`} />
                      </div>
                    </div>
                    <div className="grid grid-cols-[2fr_1fr] gap-3">
                      <div>
                        <label className={labelClass}>Хаяг</label>
                        <div className="relative">
                          <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#AEAEB2] pointer-events-none" />
                          <input type="text" value={form.address} onChange={e => setForm(prev => ({ ...prev, address: e.target.value }))} placeholder="Дэлгэрэнгүй хаяг" className={`${inputClass} pl-10`} />
                        </div>
                      </div>
                      <div>
                        <label className={labelClass}>Хот</label>
                        <input type="text" value={form.city} onChange={e => setForm(prev => ({ ...prev, city: e.target.value }))} placeholder="Улаанбаатар" className={inputClass} />
                      </div>
                    </div>
                  </div>
                </div>

                {/* Section 3: Санхүү */}
                <div>
                  <h4 className="text-[10px] font-bold text-[#8E8E93] uppercase tracking-wider mb-3 flex items-center gap-2">
                    <Wallet className="w-3.5 h-3.5" />
                    Санхүү ба тэмдэглэл
                  </h4>
                  <div className="space-y-3">
                    <div>
                      <label className={labelClass}>Эхний үлдэгдэл</label>
                      <div className="relative">
                        <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] font-semibold text-[#AEAEB2] pointer-events-none">₮</span>
                        <input type="number" step="0.01" value={form.openingBalance} onChange={e => setForm(prev => ({ ...prev, openingBalance: e.target.value }))} placeholder="0.00" className={`${inputClass} pl-9`} />
                      </div>
                    </div>
                    <div>
                      <label className={labelClass}>Тэмдэглэл</label>
                      <div className="relative">
                        <FileText className="absolute left-3.5 top-3 w-4 h-4 text-[#AEAEB2] pointer-events-none" />
                        <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Нэмэлт мэдээлэл..." rows={3} className={`${inputClass} pl-10 resize-none`} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Modal footer */}
              <div className="flex items-center gap-3 px-6 py-4 border-t border-[#E5E5EA]/60 bg-[#F9FAFB]">
                <button type="button" onClick={() => setShowModal(false)}
                  className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#4A4D5C] bg-white border border-[#E5E5EA]/60 hover:bg-[#F2F4F7] transition-all active:scale-[0.97]">
                  Цуцлах
                </button>
                <div className="flex-1" />
                <button type="submit" disabled={submitting}
                  className="inline-flex items-center gap-2 px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white shadow-md transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' }}>
                  <Save className="w-4 h-4" />
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
            <p className="text-[14px] text-[#8E8E93] mb-5">Энэ нийлүүлэгчийг устгахдаа итгэлтэй байна уу?</p>
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
