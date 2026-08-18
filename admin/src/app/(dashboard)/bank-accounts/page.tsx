'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Wallet, Plus, Pencil, Trash2, X, CheckCircle, XCircle, Building2, User, Hash, Coins, ArrowLeftRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { CURRENCIES } from '@/lib/options';
import { MoneyInput } from '@/components/shared/money-input';
import { useAuth } from '@/hooks/use-auth';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-[#F5F6FA] border border-transparent text-[15px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none transition-all focus:border-[#007AFF]/40 focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

interface BankAccount {
  id: string;
  bankName: string;
  accountNumber: string;
  holderName: string;
  currency: string;
  openingBalance: number;
  currentBalance: number;
  notes: string | null;
  isActive: boolean;
  isIncomeDefault: boolean;
  createdAt: string;
}

interface BankTransfer {
  id: string;
  amount: number;
  description: string | null;
  date: string;
  fromAccount: { id: string; bankName: string; accountNumber: string };
  toAccount: { id: string; bankName: string; accountNumber: string };
  createdBy?: { firstName: string; lastName: string };
}

const EMPTY_TRANSFER = {
  fromAccountId: '',
  toAccountId: '',
  amount: '',
  description: '',
  date: new Date().toISOString().split('T')[0],
};

const EMPTY_FORM = {
  bankName: '',
  accountNumber: '',
  holderName: '',
  currency: 'MNT',
  openingBalance: 0,
  notes: '',
  isActive: true,
  isIncomeDefault: false,
};

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Данс хоорондын шилжүүлэг
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';
  const [transfers, setTransfers] = useState<BankTransfer[]>([]);
  const [showTransfer, setShowTransfer] = useState(false);
  const [transferForm, setTransferForm] = useState<any>(EMPTY_TRANSFER);
  const [savingTransfer, setSavingTransfer] = useState(false);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/bank-accounts', { params: { includeInactive: 'true' } });
      setAccounts(res.data ?? []);
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Алдаа гарлаа' });
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchTransfers = useCallback(async () => {
    try {
      const res = await api.get('/api/bank-accounts/transfers');
      setTransfers(res.data ?? []);
    } catch (err) {
      console.error('Шилжүүлэг ачаалахад алдаа', err);
    }
  }, []);

  useEffect(() => { fetchAccounts(); fetchTransfers(); }, [fetchAccounts, fetchTransfers]);

  function update(key: string, value: any) {
    setForm((p: any) => ({ ...p, [key]: value }));
  }

  function openCreate() {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setShowForm(true);
  }

  function openEdit(acc: BankAccount) {
    setEditingId(acc.id);
    setForm({
      bankName: acc.bankName,
      accountNumber: acc.accountNumber,
      holderName: acc.holderName,
      currency: acc.currency,
      openingBalance: Number(acc.openingBalance),
      notes: acc.notes ?? '',
      isActive: acc.isActive,
      isIncomeDefault: acc.isIncomeDefault,
    });
    setShowForm(true);
  }

  async function handleSave() {
    if (!form.bankName.trim() || !form.accountNumber.trim() || !form.holderName.trim()) {
      setMsg({ type: 'error', text: 'Бүх заавал талбарыг бөглөнө үү' });
      return;
    }
    setSaving(true);
    setMsg(null);
    try {
      const payload = {
        bankName: form.bankName.trim(),
        accountNumber: form.accountNumber.trim(),
        holderName: form.holderName.trim(),
        currency: form.currency || 'MNT',
        openingBalance: Number(form.openingBalance) || 0,
        notes: form.notes?.trim() || undefined,
        isActive: form.isActive,
      };
      if (editingId) {
        await api.put(`/api/bank-accounts/${editingId}`, payload);
      } else {
        await api.post('/api/bank-accounts', payload);
      }
      setShowForm(false);
      setForm(EMPTY_FORM);
      setEditingId(null);
      setMsg({ type: 'success', text: editingId ? 'Шинэчлэгдлээ' : 'Амжилттай үүсгэлээ' });
      setTimeout(() => setMsg(null), 3000);
      fetchAccounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Алдаа гарлаа' });
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Уг дансыг устгах/идэвхгүй болгох уу?')) return;
    try {
      await api.delete(`/api/bank-accounts/${id}`);
      fetchAccounts();
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Устгахад алдаа гарлаа' });
    }
  }

  function openTransfer() {
    setTransferForm(EMPTY_TRANSFER);
    setShowTransfer(true);
  }

  async function handleTransfer() {
    const amount = Number(transferForm.amount || 0);
    if (!transferForm.fromAccountId || !transferForm.toAccountId) {
      setMsg({ type: 'error', text: 'Гаргах болон хүлээн авах данс сонгоно уу' });
      return;
    }
    if (transferForm.fromAccountId === transferForm.toAccountId) {
      setMsg({ type: 'error', text: 'Нэг данс руугаа шилжүүлэх боломжгүй' });
      return;
    }
    if (amount <= 0) {
      setMsg({ type: 'error', text: 'Дүн 0-ээс их байх ёстой' });
      return;
    }

    setSavingTransfer(true);
    try {
      await api.post('/api/bank-accounts/transfers', {
        fromAccountId: transferForm.fromAccountId,
        toAccountId: transferForm.toAccountId,
        amount,
        description: transferForm.description || undefined,
        date: transferForm.date || undefined,
      });
      setShowTransfer(false);
      await Promise.all([fetchAccounts(), fetchTransfers()]);
      setMsg({ type: 'success', text: 'Шилжүүлэг амжилттай' });
    } catch (err: any) {
      const m = err?.response?.data?.message;
      setMsg({ type: 'error', text: Array.isArray(m) ? m.join(', ') : m || 'Алдаа гарлаа' });
    } finally {
      setSavingTransfer(false);
    }
  }

  async function handleDeleteTransfer(id: string) {
    if (!confirm('Энэ шилжүүлгийг устгах уу? Хоёр дансны үлдэгдэл буцаана.')) return;
    try {
      await api.delete(`/api/bank-accounts/transfers/${id}`);
      await Promise.all([fetchAccounts(), fetchTransfers()]);
      setMsg({ type: 'success', text: 'Шилжүүлэг устгагдлаа' });
    } catch (err: any) {
      setMsg({ type: 'error', text: err?.response?.data?.message || 'Алдаа гарлаа' });
    }
  }

  const activeCount = accounts.filter((a) => a.isActive).length;
  const totalBalance = accounts.reduce((s, a) => s + Number(a.currentBalance || 0), 0);

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Данс"
        subtitle="Банкны данс, үлдэгдлийн бүртгэл"
        icon={Wallet}
        actions={
          <div className="flex items-center gap-2">
            <button
              onClick={openTransfer}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#5856D6]/12 text-[#5856D6] text-[13px] font-semibold hover:bg-[#5856D6]/20 transition-all"
            >
              <ArrowLeftRight className="w-4 h-4" /> Шилжүүлэг
            </button>
            <button
              onClick={openCreate}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold shadow-sm shadow-[#007AFF]/25 hover:brightness-105 transition-all"
            >
              <Plus className="w-4 h-4" /> Шинэ данс
            </button>
          </div>
        }
      />

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] ${
          msg.type === 'success' ? 'bg-[#34C759]/12 text-[#34C759]' : 'bg-[#FF3B30]/12 text-[#FF3B30]'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {!loading && accounts.length > 0 && (
        <StatGrid cols={3}>
          <StatCard label="Нийт данс" value={accounts.length} icon={Wallet} gradient="blue" index={0} />
          <StatCard label="Идэвхтэй данс" value={activeCount} icon={CheckCircle} gradient="green" index={1} />
          <StatCard label="Нийт үлдэгдэл" value={formatMnt(totalBalance)} icon={Coins} gradient="purple" index={2} />
        </StatGrid>
      )}

      {/* Grid of cards */}
      {loading ? (
        <div className="text-center py-12 text-[#8C8FA3]">Уншиж байна...</div>
      ) : accounts.length === 0 ? (
        <div className="bg-white rounded-2xl border border-[#E8ECF0]/70 shadow-sm">
          <EmptyState
            icon={Wallet}
            title="Данс бүртгэгдээгүй байна"
            hint="'Шинэ данс' товч дарж банкны данс нэмнэ үү"
            action={
              <button
                onClick={openCreate}
                className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold shadow-sm shadow-[#007AFF]/25 hover:brightness-105 transition-all"
              >
                <Plus className="w-4 h-4" /> Шинэ данс
              </button>
            }
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={`bg-white rounded-2xl shadow-sm border p-5 transition-all hover:shadow-md ${
                acc.isActive ? 'border-[#E8ECF0]/70' : 'border-[#FF3B30]/20 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#007AFF]/12 flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#1A1D26]">{acc.bankName}</h3>
                    <p className="text-[11px] text-[#8C8FA3]">{acc.currency}</p>
                  </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                  {acc.isIncomeDefault && (
                    <span className="text-[10px] font-bold text-[#34C759] bg-[#34C759]/10 px-2 py-0.5 rounded-full whitespace-nowrap">
                      ОРЛОГЫН ДАНС
                    </span>
                  )}
                  {!acc.isActive && (
                    <span className="text-[10px] font-bold text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-0.5 rounded-full">
                      ИДЭВХГҮЙ
                    </span>
                  )}
                </div>
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-[13px]">
                  <Hash className="w-3.5 h-3.5 text-[#8C8FA3]" />
                  <span className="text-[#4A4D5C] font-mono">{acc.accountNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <User className="w-3.5 h-3.5 text-[#8C8FA3]" />
                  <span className="text-[#4A4D5C]">{acc.holderName}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#F0F2F5]">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8C8FA3] uppercase font-semibold tracking-wide">Үлдэгдэл</span>
                  <span className="text-[18px] font-bold text-[#34C759] tabular-nums">
                    {formatMnt(acc.currentBalance)}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openEdit(acc)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[12px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" /> Засах
                </button>
                <button
                  onClick={() => handleDelete(acc.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Данс хоорондын шилжүүлгүүд */}
      {transfers.length > 0 && (
        <div className="bg-white rounded-2xl border border-[#E8ECF0]/70 shadow-sm overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#F0F2F5]">
            <ArrowLeftRight className="w-5 h-5 text-[#5856D6]" />
            <h2 className="text-[16px] font-bold text-[#1A1D26]">Данс хоорондын шилжүүлэг</h2>
            <span className="text-[13px] text-[#8C8FA3]">({transfers.length})</span>
          </div>
          <div className="divide-y divide-[#F2F4F7]">
            {transfers.map((t) => (
              <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 text-[14px] font-medium text-[#1A1D26] flex-wrap">
                    <span>{t.fromAccount.bankName}</span>
                    <span className="font-mono text-[12px] text-[#8C8FA3]">{t.fromAccount.accountNumber}</span>
                    <ArrowLeftRight className="w-3.5 h-3.5 text-[#5856D6] shrink-0" />
                    <span>{t.toAccount.bankName}</span>
                    <span className="font-mono text-[12px] text-[#8C8FA3]">{t.toAccount.accountNumber}</span>
                  </div>
                  <p className="text-[12px] text-[#8C8FA3] truncate">
                    {[
                      new Date(t.date).toLocaleDateString('mn-MN'),
                      t.description,
                      t.createdBy ? `${t.createdBy.lastName} ${t.createdBy.firstName}` : null,
                    ].filter(Boolean).join(' · ')}
                  </p>
                </div>
                <span className="text-[15px] font-bold text-[#5856D6] tabular-nums shrink-0">
                  {formatMnt(t.amount)}
                </span>
                {isAdmin && (
                  <button
                    onClick={() => handleDeleteTransfer(t.id)}
                    className="p-2 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10 transition-colors shrink-0"
                    title="Устгах"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Шилжүүлгийн цонх */}
      {showTransfer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-lg w-full max-h-[90vh] flex flex-col overflow-hidden animate-ios-scale-in">
            <div className="flex items-center gap-3 p-5 border-b border-[#F0F2F5] shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-[#5856D6]/12 flex items-center justify-center shrink-0">
                <ArrowLeftRight className="w-5 h-5 text-[#5856D6]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[18px] font-bold text-[#1A1D26]">Данс хооронд шилжүүлэх</h2>
                <p className="text-[13px] text-[#8C8FA3]">Нэг данснаас нөгөө рүү мөнгө шилжүүлнэ</p>
              </div>
              <button onClick={() => setShowTransfer(false)} className="p-2 rounded-lg hover:bg-[#F2F4F7] shrink-0 transition-colors">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div>
                <label className="block text-[13px] font-semibold text-[#1A1D26] mb-1.5">Гаргах данс *</label>
                <SearchableSelect
                  value={transferForm.fromAccountId}
                  onChange={(v) => setTransferForm((p: any) => ({ ...p, fromAccountId: v }))}
                  options={accounts.filter((a) => a.isActive).map((a) => ({
                    value: a.id,
                    label: `${a.bankName} ${a.accountNumber} — ${formatMnt(a.currentBalance)}`,
                  }))}
                  emptyText="Данс сонгох..."
                  inputClassName={inputClass}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1A1D26] mb-1.5">Хүлээн авах данс *</label>
                <SearchableSelect
                  value={transferForm.toAccountId}
                  onChange={(v) => setTransferForm((p: any) => ({ ...p, toAccountId: v }))}
                  options={accounts
                    .filter((a) => a.isActive && a.id !== transferForm.fromAccountId)
                    .map((a) => ({
                      value: a.id,
                      label: `${a.bankName} ${a.accountNumber} — ${formatMnt(a.currentBalance)}`,
                    }))}
                  emptyText="Данс сонгох..."
                  inputClassName={inputClass}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1A1D26] mb-1.5">Дүн *</label>
                <MoneyInput
                  value={transferForm.amount}
                  onChange={(v) => setTransferForm((p: any) => ({ ...p, amount: v }))}
                  className={inputClass}
                  min={1}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1A1D26] mb-1.5">Огноо *</label>
                <input
                  type="date"
                  value={transferForm.date}
                  onChange={(e) => setTransferForm((p: any) => ({ ...p, date: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[13px] font-semibold text-[#1A1D26] mb-1.5">Тайлбар</label>
                <textarea
                  value={transferForm.description}
                  onChange={(e) => setTransferForm((p: any) => ({ ...p, description: e.target.value }))}
                  rows={2}
                  placeholder="Жишээ: Кассын мөнгө банкинд тушаав"
                  className={inputClass}
                />
              </div>
            </div>

            <div className="flex gap-3 p-5 border-t border-[#F0F2F5] shrink-0">
              <button
                onClick={() => setShowTransfer(false)}
                className="flex-1 px-5 py-3 rounded-xl bg-[#F2F4F7] text-[#4A4D5C] font-semibold text-[14px] hover:bg-[#E8ECF0] transition-colors"
              >
                Болих
              </button>
              <button
                onClick={handleTransfer}
                disabled={savingTransfer}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#5856D6] text-white font-semibold text-[14px] shadow-sm shadow-[#5856D6]/25 hover:brightness-105 disabled:opacity-50 transition-all"
              >
                <ArrowLeftRight className="w-4 h-4" />
                {savingTransfer ? 'Шилжүүлж байна...' : 'Шилжүүлэх'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] flex flex-col overflow-hidden animate-ios-scale-in">
            <div className="flex items-center gap-3 p-5 border-b border-[#F0F2F5] shrink-0">
              <div className="w-11 h-11 rounded-2xl bg-[#007AFF]/12 flex items-center justify-center shrink-0">
                <Wallet className="w-5 h-5 text-[#007AFF]" />
              </div>
              <div className="flex-1 min-w-0">
                <h2 className="text-[18px] font-bold text-[#1A1D26] truncate">
                  {editingId ? 'Данс засах' : 'Шинэ данс'}
                </h2>
                <p className="text-[11px] text-[#8C8FA3]">Банкны данс үүсгэх/засах</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-[#F2F4F7] shrink-0 transition-colors">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-5 space-y-4 min-h-0">
              <div>
                <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Банкны нэр *</label>
                <input
                  type="text"
                  value={form.bankName}
                  onChange={e => update('bankName', e.target.value)}
                  placeholder="Хаан банк, Худалдаа хөгжил банк..."
                  className={inputClass}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Дансны дугаар *</label>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={e => update('accountNumber', e.target.value)}
                    placeholder="5001234567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Валют</label>
                  <SearchableSelect
                    value={form.currency}
                    onChange={v => update('currency', v)}
                    options={CURRENCIES}
                    inputClassName={inputClass}
                    widthClass="w-full"
                    aria-label="Валют"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Эзэмшигчийн нэр *</label>
                <input
                  type="text"
                  value={form.holderName}
                  onChange={e => update('holderName', e.target.value)}
                  placeholder="Компанийн нэр эсвэл хувь хүний нэр"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Эхний үлдэгдэл</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={e => update('openingBalance', e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
                <p className="text-[11px] text-[#8C8FA3] mt-1">Одоогийн үлдэгдэл автоматаар тооцоологдоно</p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Тэмдэглэл</label>
                <textarea
                  value={form.notes}
                  onChange={e => update('notes', e.target.value)}
                  placeholder="Нэмэлт мэдээлэл..."
                  rows={2}
                  className={inputClass}
                />
              </div>

              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.isActive}
                  onChange={e => update('isActive', e.target.checked)}
                  className="w-5 h-5 rounded accent-[#007AFF]"
                />
                <span className="text-[14px] font-medium text-[#1A1D26]">Идэвхтэй</span>
              </label>

              {/* ПОС дээр "Шилжүүлэг"-ээр төлсөн мөнгө энэ данс дээр суух */}
              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={!!form.isIncomeDefault}
                  onChange={e => update('isIncomeDefault', e.target.checked)}
                  className="w-5 h-5 rounded accent-[#34C759] mt-0.5"
                />
                <span>
                  <span className="block text-[14px] font-medium text-[#1A1D26]">Орлогын данс</span>
                  <span className="block text-[12px] text-[#8C8FA3]">
                    ПОС дээр «Шилжүүлэг»-ээр борлуулалт хийхэд төлбөр шууд энэ данс дээр
                    бүртгэгдэнэ. Зөвхөн нэг данс ийм байж болно.
                  </span>
                </span>
              </label>
            </div>

            <div className="flex gap-3 p-5 border-t border-[#F0F2F5] shrink-0">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-5 py-3 rounded-xl bg-[#F2F4F7] text-[#4A4D5C] font-semibold text-[14px] hover:bg-[#E8ECF0] transition-colors"
              >
                Болих
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#007AFF] text-white font-semibold text-[14px] shadow-sm shadow-[#007AFF]/25 hover:brightness-105 disabled:opacity-50 transition-all"
              >
                <CheckCircle className="w-4 h-4" />
                {saving ? 'Хадгалж байна...' : editingId ? 'Шинэчлэх' : 'Үүсгэх'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
