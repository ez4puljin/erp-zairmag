'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { format } from 'date-fns';
import { Plus, Receipt, Trash2, Pencil, X, ChevronLeft, ChevronRight, Hash } from 'lucide-react';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, DateField, SelectField, ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { MoneyInput } from '@/components/shared/money-input';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

export default function ExpensesPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  /** Засаж буй зардал. null бол шинээр бүртгэх горим. */
  const [editingId, setEditingId] = useState<string | null>(null);
  const [expenses, setExpenses] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [categories, setCategories] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  // Шүүлтүүр: зардлын ангилал ба зарлага гарсан данс
  const [filterCategoryId, setFilterCategoryId] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    categoryId: '',
    amount: '',
    description: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    bankAccountId: '',
    referenceNo: '',
    notes: '',
  });

  const fetchExpenses = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (filterCategoryId) params.set('categoryId', filterCategoryId);
    if (filterAccountId) params.set('bankAccountId', filterAccountId);
    api
      .get(`/api/expenses?${params.toString()}`)
      .then((res) => {
        setExpenses(res.data?.data ?? []);
        setMeta(res.data?.meta ?? null);
      })
      .catch((err) => {
        alert('Зардлын мэдээлэл ачааллахад алдаа гарлаа');
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [page, dateFrom, dateTo, filterCategoryId, filterAccountId]);

  useEffect(() => {
    api
      .get('/api/expense-categories')
      .then((res) => setCategories(res.data?.data ?? res.data ?? []))
      .catch(console.error);
    api
      .get('/api/bank-accounts')
      .then((res) => setAccounts(res.data?.data ?? res.data ?? []))
      .catch(console.error);
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const categoryOptions = categories.map((c: any) => ({ value: c.id, label: c.name }));
  const accountOptions = accounts.map((a: any) => ({
    value: a.id,
    label: `${a.bankName} · ${a.accountNumber}`,
  }));

  const totalAmount = meta?.totalAmount ?? expenses.reduce((s: number, e: any) => s + Number(e.amount ?? 0), 0);
  const totalCount = meta?.total ?? expenses.length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.categoryId || !form.amount) return;
    setSubmitting(true);
    try {
      const payload = {
        categoryId: form.categoryId,
        amount: Number(form.amount),
        description: form.description,
        date: form.date,
        bankAccountId: form.bankAccountId || undefined,
        referenceNo: form.referenceNo || undefined,
        notes: form.notes || undefined,
      };
      if (editingId) {
        await api.patch(`/api/expenses/${editingId}`, payload);
      } else {
        await api.post('/api/expenses', payload);
      }
      setShowModal(false);
      setEditingId(null);
      setForm({
        categoryId: '',
        amount: '',
        description: '',
        date: format(new Date(), 'yyyy-MM-dd'),
        bankAccountId: '',
        referenceNo: '',
        notes: '',
      });
      fetchExpenses();
    } catch (err) {
      alert('Зардал бүртгэхэд алдаа гарлаа');
      console.error(err);
    } finally {
      setSubmitting(false);
    }
  };

  /** Мөрийг засах горимд нээнэ. */
  const openEdit = (exp: any) => {
    setEditingId(exp.id);
    setForm({
      categoryId: exp.categoryId ?? exp.category?.id ?? '',
      amount: String(Number(exp.amount ?? 0)),
      description: exp.description ?? '',
      date: exp.date
        ? format(new Date(exp.date), 'yyyy-MM-dd')
        : format(new Date(), 'yyyy-MM-dd'),
      bankAccountId: exp.bankAccountId ?? exp.bankAccount?.id ?? '',
      referenceNo: exp.referenceNo ?? '',
      notes: exp.notes ?? '',
    });
    setShowModal(true);
  };

  /** Шинээр бүртгэх горимд цэвэр формоор нээнэ. */
  const openCreate = () => {
    setEditingId(null);
    setForm({
      categoryId: '',
      amount: '',
      description: '',
      date: format(new Date(), 'yyyy-MM-dd'),
      bankAccountId: '',
      referenceNo: '',
      notes: '',
    });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingId(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Энэ зардлыг устгах уу?')) return;
    try {
      await api.delete(`/api/expenses/${id}`);
      fetchExpenses();
    } catch (err) {
      alert('Устгахад алдаа гарлаа');
      console.error(err);
    }
  };

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Зардал"
        subtitle="Салбарын зардлын бүртгэл, ангилал бүрээр"
        icon={Receipt}
        iconColor="#FF3B30"
        actions={
          <button
            onClick={openCreate}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
          >
            <Plus className="w-4 h-4" /> Шинэ зардал
          </button>
        }
      />

      {/* Date Range Filter */}
      <FilterBar>
        <DateField
          label="Эхлэх огноо"
          value={dateFrom}
          onChange={(v) => {
            setDateFrom(v);
            setPage(1);
          }}
        />
        <DateField
          label="Дуусах огноо"
          value={dateTo}
          onChange={(v) => {
            setDateTo(v);
            setPage(1);
          }}
        />
        <SelectField
          label="Зардлын ангилал"
          value={filterCategoryId}
          onChange={(v) => {
            setFilterCategoryId(v);
            setPage(1);
          }}
          options={[{ value: '', label: 'Бүх ангилал' }, ...categoryOptions]}
          placeholder="Бүх ангилал"
        />
        <SelectField
          label="Зарлага гарсан данс"
          value={filterAccountId}
          onChange={(v) => {
            setFilterAccountId(v);
            setPage(1);
          }}
          options={[
            { value: '', label: 'Бүх данс' },
            ...accountOptions,
            { value: 'none', label: 'Данс сонгоогүй' },
          ]}
          placeholder="Бүх данс"
        />
        {(dateFrom || dateTo || filterCategoryId || filterAccountId) && (
          <ActionButton
            variant="ghost"
            onClick={() => {
              setDateFrom('');
              setDateTo('');
              setFilterCategoryId('');
              setFilterAccountId('');
              setPage(1);
            }}
          >
            Цэвэрлэх
          </ActionButton>
        )}
      </FilterBar>

      {/* Stats Cards */}
      <StatGrid cols={2}>
        <StatCard label="Нийт зардал" value={formatMnt(totalAmount)} icon={Receipt} gradient="red" index={0} />
        <StatCard label="Тоо ширхэг" value={totalCount} hint="бүртгэл" icon={Hash} gradient="blue" index={1} />
      </StatGrid>

      {/* Expense List */}
      <SectionCard title="Зардлын жагсаалт" noPadding>
        {loading ? (
          <div className="divide-y divide-[#F2F4F7]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-[#F2F4F7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#F2F4F7] rounded-lg" />
                  <div className="h-3 w-24 bg-[#F2F4F7] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : expenses.length === 0 ? (
          <EmptyState icon={Receipt} title="Зардал олдсонгүй" hint="Шинэ зардал бүртгэх эсвэл шүүлтээ өөрчилнө үү" />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {expenses.map((exp: any) => (
              <div key={exp.id} className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F7F9FC] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#FF3B30]/10 flex items-center justify-center shrink-0">
                  <Receipt className="w-5 h-5 text-[#FF3B30]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1D26] truncate">
                    {exp.category?.name ?? exp.description ?? '—'}
                  </p>
                  <p className="text-[13px] text-[#8C8FA3] truncate">
                    {[
                      exp.date
                        ? format(new Date(exp.date), 'yyyy/MM/dd')
                        : exp.createdAt
                          ? format(new Date(exp.createdAt), 'yyyy/MM/dd')
                          : null,
                      exp.description,
                      exp.referenceNo,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div>
                    <p className="text-[15px] font-bold text-[#FF3B30] tabular-nums">
                      -{formatMnt(exp.amount)}
                    </p>
                    <span className="text-[11px] font-medium text-[#8C8FA3]">
                      {exp.bankAccount
                        ? `${exp.bankAccount.bankName} · ${exp.bankAccount.accountNumber}`
                        : 'Данс сонгоогүй'}
                    </span>
                  </div>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(exp)}
                        aria-label="Засах"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#AEAEB2] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(exp.id)}
                        aria-label="Устгах"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#AEAEB2] hover:text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF0]/70 flex items-center justify-center text-[#8C8FA3] disabled:opacity-30 transition-all active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium text-[#8C8FA3] px-3">
            {page} / {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF0]/70 flex items-center justify-center text-[#8C8FA3] disabled:opacity-30 transition-all active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* New Expense Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={closeModal} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-xl border border-[#E8ECF0]/70 animate-ios-scale-in">
            <div className="flex items-center justify-between p-5 border-b border-[#F0F2F5]">
              <h2 className="text-[17px] font-bold text-[#1A1D26]">{editingId ? 'Зардал засах' : 'Шинэ зардал'}</h2>
              <button
                onClick={closeModal}
                className="w-8 h-8 rounded-full bg-[#F2F4F7] flex items-center justify-center text-[#8C8FA3] hover:text-[#1A1D26] transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-5 space-y-4">
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Ангилал *</label>
                <SearchableSelect
                  value={form.categoryId}
                  onChange={(v) => setForm({ ...form, categoryId: v })}
                  options={categoryOptions}
                  required
                  inputClassName={inputClass}
                  widthClass="w-full"
                  aria-label="Ангилал"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Дүн *</label>
                <MoneyInput value={form.amount} onChange={(v: string) => setForm({ ...form, amount: v })} required placeholder="0" className={inputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Тайлбар</label>
                <input
                  type="text"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  className={inputClass}
                  placeholder="Зардлын тайлбар"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Огноо</label>
                <input
                  type="date"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                  className={inputClass}
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Зарлага хийсэн данс</label>
                <SearchableSelect
                  value={form.bankAccountId}
                  onChange={(v) => setForm({ ...form, bankAccountId: v })}
                  options={accountOptions}
                  inputClassName={inputClass}
                  widthClass="w-full"
                  aria-label="Зарлага хийсэн данс"
                />
                <p className="mt-1.5 text-[12px] text-[#8C8FA3]">
                  Данс сонговол тухайн дансны үлдэгдлээс дүн хасагдана.
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Лавлагааны дугаар</label>
                <input
                  type="text"
                  value={form.referenceNo}
                  onChange={(e) => setForm({ ...form, referenceNo: e.target.value })}
                  className={inputClass}
                  placeholder="Лавлагааны дугаар"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Тэмдэглэл</label>
                <textarea
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className={`${inputClass} resize-none`}
                  rows={2}
                  placeholder="Нэмэлт тэмдэглэл"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
              >
                {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
