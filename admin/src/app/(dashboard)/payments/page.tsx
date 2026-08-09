'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { CreditCard, Plus, ChevronLeft, ChevronRight, Pencil, Trash2, X, Hash } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, DateField, SelectField, ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { ErrorBanner } from '@/components/shared/error-banner';
import { ConfirmDialog } from '@/components/shared/confirm-dialog';
import { formatMnt } from '@/components/shared/money';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { PAYMENT_METHODS } from '@/lib/options';
import { useAuth } from '@/hooks/use-auth';
import { MoneyInput } from '@/components/shared/money-input';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

const methodLabel = (m?: string) =>
  PAYMENT_METHODS.find((o) => o.value === m)?.label ?? m ?? '';

export default function PaymentsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [payments, setPayments] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Шүүлтүүр
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterMethod, setFilterMethod] = useState('');
  const [filterAccountId, setFilterAccountId] = useState('');
  const [filterType, setFilterType] = useState('');

  const [customers, setCustomers] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);

  // Засах
  const [editing, setEditing] = useState<any>(null);
  const [editForm, setEditForm] = useState({ amount: '', method: 'CASH', reference: '', note: '', bankAccountId: '', type: 'RECEIPT', paidAt: '' });
  const [submitting, setSubmitting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<any>(null);

  const fetchPayments = useCallback(() => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set('page', String(page));
    params.set('limit', '20');
    if (dateFrom) params.set('dateFrom', dateFrom);
    if (dateTo) params.set('dateTo', dateTo);
    if (filterCustomerId) params.set('customerId', filterCustomerId);
    if (filterMethod) params.set('method', filterMethod);
    if (filterAccountId) params.set('bankAccountId', filterAccountId);
    if (filterType) params.set('type', filterType);
    api
      .get(`/api/payments?${params.toString()}`)
      .then((res) => {
        setPayments(res.data?.data ?? []);
        setMeta(res.data?.meta ?? null);
      })
      .catch((err) => {
        setError(err.response?.data?.message ?? 'Төлбөрийн мэдээлэл ачааллахад алдаа гарлаа');
      })
      .finally(() => setLoading(false));
  }, [page, dateFrom, dateTo, filterCustomerId, filterMethod, filterAccountId, filterType]);

  useEffect(() => {
    api.get('/api/customers?limit=1000')
      .then((res) => setCustomers(res.data?.data ?? []))
      .catch(() => {});
    api.get('/api/bank-accounts')
      .then((res) => setAccounts(res.data?.data ?? res.data ?? []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const customerOptions = customers.map((c: any) => ({ value: c.id, label: c.storeName }));
  const accountOptions = accounts.map((a: any) => ({
    value: a.id,
    label: `${a.bankName} · ${a.accountNumber}`,
  }));

  const totalAmount = payments.reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);

  const openEdit = (p: any) => {
    setEditing(p);
    setEditForm({
      amount: String(Number(p.amount ?? 0)),
      method: p.method ?? 'CASH',
      reference: p.externalRef ?? '',
      note: p.notes ?? '',
      bankAccountId: p.bankAccountId ?? '',
      type: p.type ?? 'RECEIPT',
      paidAt: p.createdAt ? format(new Date(p.createdAt), 'yyyy-MM-dd') : '',
    });
    setError('');
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSubmitting(true);
    setError('');
    try {
      await api.patch(`/api/payments/${editing.id}`, {
        amount: Number(editForm.amount),
        method: editForm.method,
        reference: editForm.reference || undefined,
        note: editForm.note || undefined,
        bankAccountId: editForm.bankAccountId || undefined,
        type: editForm.type,
        ...(editForm.paidAt
          ? { paidAt: new Date(`${editForm.paidAt}T12:00:00`).toISOString() }
          : {}),
      });
      setEditing(null);
      fetchPayments();
    } catch (err: any) {
      const msg = err.response?.data?.message ?? 'Алдаа гарлаа';
      setError(Array.isArray(msg) ? msg.join(', ') : msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      await api.delete(`/api/payments/${deleteTarget.id}`);
      setDeleteTarget(null);
      fetchPayments();
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Устгахад алдаа гарлаа');
      setDeleteTarget(null);
    }
  };

  const hasFilter = dateFrom || dateTo || filterCustomerId || filterMethod || filterAccountId || filterType;

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Төлбөр"
        subtitle="Харилцагчаас хүлээн авсан төлбөрийн бүртгэл"
        icon={CreditCard}
        iconColor="#34C759"
        actions={
          <Link
            href="/payments/new"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
          >
            <Plus className="w-4 h-4" /> Бүртгэх
          </Link>
        }
      />

      <FilterBar>
        <DateField label="Эхлэх огноо" value={dateFrom} onChange={(v) => { setDateFrom(v); setPage(1); }} />
        <DateField label="Дуусах огноо" value={dateTo} onChange={(v) => { setDateTo(v); setPage(1); }} />
        <SelectField
          label="Харилцагч"
          value={filterCustomerId}
          onChange={(v) => { setFilterCustomerId(v); setPage(1); }}
          options={customerOptions}
          placeholder="Бүх харилцагч"
        />
        <SelectField
          label="Төлбөрийн хэлбэр"
          value={filterMethod}
          onChange={(v) => { setFilterMethod(v); setPage(1); }}
          options={PAYMENT_METHODS}
          placeholder="Бүх хэлбэр"
        />
        <SelectField
          label="Гүйлгээний төрөл"
          value={filterType}
          onChange={(v) => { setFilterType(v); setPage(1); }}
          options={[
            { value: 'RECEIPT', label: 'Төлбөр авсан' },
            { value: 'PAYOUT', label: 'Мөнгө олгосон' },
          ]}
          placeholder="Бүгд"
        />
        <SelectField
          label="Орлого орсон данс"
          value={filterAccountId}
          onChange={(v) => { setFilterAccountId(v); setPage(1); }}
          options={[...accountOptions, { value: 'none', label: 'Данс сонгоогүй' }]}
          placeholder="Бүх данс"
        />
        {hasFilter && (
          <ActionButton
            variant="ghost"
            onClick={() => {
              setDateFrom(''); setDateTo(''); setFilterCustomerId('');
              setFilterMethod(''); setFilterAccountId(''); setFilterType(''); setPage(1);
            }}
          >
            Цэвэрлэх
          </ActionButton>
        )}
      </FilterBar>

      <StatGrid cols={2}>
        <StatCard label="Хуудасны нийлбэр" value={formatMnt(totalAmount)} icon={CreditCard} gradient="green" index={0} />
        <StatCard label="Тоо ширхэг" value={meta?.total ?? payments.length} hint="бүртгэл" icon={Hash} gradient="blue" index={1} />
      </StatGrid>

      <ErrorBanner message={error || null} onDismiss={() => setError('')} />

      <SectionCard title="Төлбөрийн жагсаалт" noPadding>
        {loading ? (
          <div className="divide-y divide-[#F2F4F7]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 lg:px-5 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-[#F2F4F7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#F2F4F7] rounded-lg" />
                  <div className="h-3 w-24 bg-[#F2F4F7] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Төлбөр олдсонгүй"
            hint={hasFilter ? 'Шүүлтээ өөрчилж үзнэ үү' : "Шинэ төлбөр бүртгэхийн тулд дээрх 'Бүртгэх' товч дарна уу"}
          />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-4 lg:px-5 py-3.5 hover:bg-[#F7F9FC] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-[#34C759]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1D26] truncate">{p.customer?.storeName ?? '—'}</p>
                  {/* Тайлбар: огноо · хэлбэр · тэмдэглэл/лавлагаа · данс */}
                  <p className="text-[13px] text-[#8C8FA3] truncate">
                    {[
                      p.createdAt ? format(new Date(p.createdAt), 'yyyy/MM/dd HH:mm') : null,
                      methodLabel(p.method),
                      p.notes || p.externalRef,
                      p.bankAccount ? `${p.bankAccount.bankName} · ${p.bankAccount.accountNumber}` : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <div className="text-right shrink-0 flex items-center gap-2">
                  <div className="text-right">
                    <p className={`text-[15px] font-bold tabular-nums ${p.type === 'PAYOUT' ? 'text-[#FF3B30]' : 'text-[#34C759]'}`}>
                      {p.type === 'PAYOUT' ? '−' : '+'}{formatMnt(Math.abs(Number(p.amount ?? 0)))}
                    </p>
                    {p.type === 'PAYOUT' && (
                      <span className="text-[10px] font-bold text-[#FF3B30]">Олгосон</span>
                    )}
                  </div>
                  {isAdmin && (
                    <>
                      <button
                        onClick={() => openEdit(p)}
                        aria-label="Засах"
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-[#AEAEB2] hover:text-[#007AFF] hover:bg-[#007AFF]/10 transition-all"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(p)}
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

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF0]/70 shadow-sm flex items-center justify-center text-[#8C8FA3] disabled:opacity-30 transition-all active:scale-95 hover:bg-[#F7F9FC]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium text-[#8C8FA3] px-3">{page} / {meta.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
            className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF0]/70 shadow-sm flex items-center justify-center text-[#8C8FA3] disabled:opacity-30 transition-all active:scale-95 hover:bg-[#F7F9FC]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Засах цонх */}
      {editing && (
        <div className="fixed inset-0 z-[70] bg-black/40 flex items-center justify-center p-4" onClick={() => setEditing(null)}>
          <form
            onSubmit={handleSave}
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-2xl w-full max-w-md overflow-hidden shadow-xl"
          >
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#E8ECF0]">
              <div>
                <p className="text-[16px] font-semibold text-[#1A1D26]">Төлбөр засах</p>
                <p className="text-[12px] text-[#8C8FA3] mt-0.5">{editing.customer?.storeName}</p>
              </div>
              <button type="button" onClick={() => setEditing(null)} aria-label="Хаах"
                className="w-8 h-8 rounded-lg flex items-center justify-center text-[#8C8FA3] hover:bg-[#F2F4F7]">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 max-h-[60vh] overflow-y-auto">
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Гүйлгээний төрөл</label>
                <div className="flex gap-2">
                  {[{ v: 'RECEIPT', l: 'Төлбөр авах' }, { v: 'PAYOUT', l: 'Мөнгө олгох' }].map((o) => (
                    <button key={o.v} type="button"
                      onClick={() => setEditForm({ ...editForm, type: o.v })}
                      className={`flex-1 h-10 rounded-xl text-[13px] font-semibold border transition-all ${
                        editForm.type === o.v
                          ? o.v === 'PAYOUT'
                            ? 'bg-[#FF3B30] border-[#FF3B30] text-white'
                            : 'bg-[#34C759] border-[#34C759] text-white'
                          : 'bg-white border-[#E8ECF0] text-[#4A4D5C]'
                      }`}>
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Огноо</label>
                <input type="date" value={editForm.paidAt}
                  max={new Date().toISOString().slice(0, 10)}
                  onChange={(e) => setEditForm({ ...editForm, paidAt: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Дүн *</label>
                <MoneyInput value={editForm.amount}
                  onChange={(v) => setEditForm({ ...editForm, amount: v })}
                  required min={0.01} className={inputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Төлбөрийн хэлбэр</label>
                <SearchableSelect
                  value={editForm.method}
                  onChange={(v) => setEditForm({ ...editForm, method: v })}
                  options={PAYMENT_METHODS}
                  inputClassName={inputClass}
                  widthClass="w-full"
                  aria-label="Төлбөрийн хэлбэр"
                />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Орлого орсон данс</label>
                <SearchableSelect
                  value={editForm.bankAccountId}
                  onChange={(v) => setEditForm({ ...editForm, bankAccountId: v })}
                  options={accountOptions}
                  placeholder="Сонгоогүй"
                  emptyText="Сонгоогүй"
                  inputClassName={inputClass}
                  widthClass="w-full"
                  aria-label="Орлого орсон данс"
                />
                <p className="mt-1.5 text-[12px] text-[#8C8FA3]">
                  Данс солиход хуучин дансны үлдэгдэл буцаж, шинэ дансанд нэмэгдэнэ.
                </p>
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Тайлбар</label>
                <input type="text" value={editForm.note}
                  onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                  placeholder="Тэмдэглэл" className={inputClass} />
              </div>
              <div>
                <label className="block text-[13px] font-medium text-[#8C8FA3] mb-1.5">Лавлагааны дугаар</label>
                <input type="text" value={editForm.reference}
                  onChange={(e) => setEditForm({ ...editForm, reference: e.target.value })}
                  className={inputClass} />
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 px-5 py-4 border-t border-[#E8ECF0]">
              <button type="button" onClick={() => setEditing(null)}
                className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#4A4D5C] bg-white border border-[#E8ECF0] hover:bg-[#F2F4F7] transition-all">
                Болих
              </button>
              <button type="submit" disabled={submitting}
                className="px-6 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
                style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
                {submitting ? 'Хадгалж байна...' : 'Хадгалах'}
              </button>
            </div>
          </form>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteTarget}
        title="Төлбөр устгах"
        message={
          deleteTarget
            ? `${deleteTarget.customer?.storeName ?? ''} — ${formatMnt(deleteTarget.amount)}. Харилцагчийн өр болон дансны үлдэгдэл буцаана.`
            : ''
        }
        confirmLabel="Устгах"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
