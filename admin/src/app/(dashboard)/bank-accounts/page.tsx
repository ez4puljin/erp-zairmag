'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Wallet, Plus, Pencil, Trash2, X, CheckCircle, XCircle, Building2, User, Hash, Coins } from 'lucide-react';

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

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
  createdAt: string;
}

const EMPTY_FORM = {
  bankName: '',
  accountNumber: '',
  holderName: '',
  currency: 'MNT',
  openingBalance: 0,
  notes: '',
  isActive: true,
};

export default function BankAccountsPage() {
  const [accounts, setAccounts] = useState<BankAccount[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<any>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

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

  useEffect(() => { fetchAccounts(); }, [fetchAccounts]);

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

  return (
    <div className="space-y-6 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Данс</h1>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-5 py-2.5 bg-[#007AFF] text-white rounded-xl text-[14px] font-semibold hover:bg-[#0051D5] transition-all"
        >
          <Plus className="w-4 h-4" /> Шинэ данс
        </button>
      </div>

      {msg && (
        <div className={`flex items-center gap-2 px-4 py-3 rounded-xl text-[14px] ${
          msg.type === 'success' ? 'bg-[#34C75915] text-[#34C759]' : 'bg-[#FF3B3015] text-[#FF3B30]'
        }`}>
          {msg.type === 'success' ? <CheckCircle className="w-4 h-4" /> : <XCircle className="w-4 h-4" />}
          {msg.text}
        </div>
      )}

      {/* Grid of cards */}
      {loading ? (
        <div className="text-center py-12 text-[#8E8E93]">Уншиж байна...</div>
      ) : accounts.length === 0 ? (
        <div className="text-center py-16 bg-[#F2F2F7] rounded-2xl">
          <Wallet className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
          <p className="text-[#8E8E93]">Данс бүртгэгдээгүй байна. "Шинэ данс" товч дарна уу.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {accounts.map((acc) => (
            <div
              key={acc.id}
              className={`bg-white rounded-2xl shadow-sm border p-5 transition-all hover:shadow-md ${
                acc.isActive ? 'border-[#E5E5EA]' : 'border-[#FF3B30]/20 opacity-60'
              }`}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-[#007AFF15] flex items-center justify-center">
                    <Building2 className="w-5 h-5 text-[#007AFF]" />
                  </div>
                  <div>
                    <h3 className="text-[16px] font-bold text-[#1C1C1E]">{acc.bankName}</h3>
                    <p className="text-[11px] text-[#8E8E93]">{acc.currency}</p>
                  </div>
                </div>
                {!acc.isActive && (
                  <span className="text-[10px] font-bold text-[#FF3B30] bg-[#FF3B30]/10 px-2 py-0.5 rounded-full">
                    ИДЭВХГҮЙ
                  </span>
                )}
              </div>

              <div className="space-y-1.5 mb-4">
                <div className="flex items-center gap-2 text-[13px]">
                  <Hash className="w-3.5 h-3.5 text-[#8E8E93]" />
                  <span className="text-[#4A4D5C] font-mono">{acc.accountNumber}</span>
                </div>
                <div className="flex items-center gap-2 text-[13px]">
                  <User className="w-3.5 h-3.5 text-[#8E8E93]" />
                  <span className="text-[#4A4D5C]">{acc.holderName}</span>
                </div>
              </div>

              <div className="pt-3 border-t border-[#E5E5EA]/50">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] text-[#8E8E93] uppercase font-semibold">Үлдэгдэл</span>
                  <span className="text-[18px] font-bold text-[#34C759]">
                    ₮{Number(acc.currentBalance).toLocaleString('mn-MN')}
                  </span>
                </div>
              </div>

              <div className="flex gap-2 mt-3">
                <button
                  onClick={() => openEdit(acc)}
                  className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg text-[12px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20"
                >
                  <Pencil className="w-3.5 h-3.5" /> Засах
                </button>
                <button
                  onClick={() => handleDelete(acc.id)}
                  className="flex items-center justify-center gap-1 px-3 py-2 rounded-lg text-[12px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {showForm && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-hidden">
            <div className="flex items-center gap-3 p-6 border-b border-[#E5E5EA]">
              <div className="w-12 h-12 rounded-2xl bg-[#007AFF15] flex items-center justify-center">
                <Wallet className="w-6 h-6 text-[#007AFF]" />
              </div>
              <div className="flex-1">
                <h2 className="text-[20px] font-bold text-[#1C1C1E]">
                  {editingId ? 'Данс засах' : 'Шинэ данс'}
                </h2>
                <p className="text-[12px] text-[#8E8E93]">Банкны данс үүсгэх/засах</p>
              </div>
              <button onClick={() => setShowForm(false)} className="p-2 rounded-lg hover:bg-[#F2F2F7]">
                <X className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </div>

            <div className="p-6 space-y-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 170px)' }}>
              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Банкны нэр *</label>
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
                  <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Дансны дугаар *</label>
                  <input
                    type="text"
                    value={form.accountNumber}
                    onChange={e => update('accountNumber', e.target.value)}
                    placeholder="5001234567"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Валют</label>
                  <select
                    value={form.currency}
                    onChange={e => update('currency', e.target.value)}
                    className={inputClass}
                  >
                    <option value="MNT">MNT</option>
                    <option value="USD">USD</option>
                    <option value="CNY">CNY</option>
                    <option value="EUR">EUR</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Эзэмшигчийн нэр *</label>
                <input
                  type="text"
                  value={form.holderName}
                  onChange={e => update('holderName', e.target.value)}
                  placeholder="Компанийн нэр эсвэл хувь хүний нэр"
                  className={inputClass}
                />
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Эхний үлдэгдэл</label>
                <input
                  type="number"
                  step="0.01"
                  value={form.openingBalance}
                  onChange={e => update('openingBalance', e.target.value)}
                  placeholder="0"
                  className={inputClass}
                />
                <p className="text-[11px] text-[#8E8E93] mt-1">Одоогийн үлдэгдэл автоматаар тооцоологдоно</p>
              </div>

              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-1.5">Тэмдэглэл</label>
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
                <span className="text-[14px] font-medium text-[#1C1C1E]">Идэвхтэй</span>
              </label>
            </div>

            <div className="flex gap-3 p-6 border-t border-[#E5E5EA]">
              <button
                onClick={() => setShowForm(false)}
                className="flex-1 px-5 py-3 rounded-xl bg-[#F2F2F7] text-[#8E8E93] font-semibold text-[14px] hover:bg-[#E5E5EA]"
              >
                Болих
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 px-5 py-3 rounded-xl bg-[#007AFF] text-white font-semibold text-[14px] hover:bg-[#0051D5] disabled:opacity-50"
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
