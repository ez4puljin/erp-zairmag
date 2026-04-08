'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Landmark, Plus, CheckCircle, Clock } from 'lucide-react';

export default function CashClosingsPage() {
  const [closings, setClosings] = useState<any[]>([]);
  const [dailySummary, setDailySummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);

  // Form state
  const [form, setForm] = useState({
    closingDate: new Date().toISOString().split('T')[0],
    openingBalance: '',
    totalCashIn: '',
    totalCashOut: '',
    totalBankIn: '',
    closingBalance: '',
    notes: '',
  });

  useEffect(() => { loadClosings(); }, []);

  async function loadClosings() {
    setLoading(true);
    try {
      const res = await api.get('/api/cash-closings');
      setClosings(res.data);
    } catch { }
    setLoading(false);
  }

  async function loadDailySummary(date: string) {
    try {
      const res = await api.get(`/api/cash-closings/daily-summary?date=${date}`);
      const data = res.data;
      setDailySummary(data);
      setForm({
        closingDate: date,
        openingBalance: String(data.openingBalance || 0),
        totalCashIn: String(data.totalCashIn || 0),
        totalCashOut: String(data.totalCashOut || 0),
        totalBankIn: String(data.totalBankIn || 0),
        closingBalance: String(data.suggestedClosingBalance || 0),
        notes: '',
      });
    } catch { }
  }

  async function handleOpenForm() {
    setShowForm(true);
    await loadDailySummary(selectedDate);
  }

  const computedBalance = (Number(form.openingBalance) || 0) + (Number(form.totalCashIn) || 0) - (Number(form.totalCashOut) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.post('/api/cash-closings', {
        closingDate: form.closingDate,
        openingBalance: Number(form.openingBalance),
        totalCashIn: Number(form.totalCashIn),
        totalCashOut: Number(form.totalCashOut),
        totalBankIn: Number(form.totalBankIn),
        closingBalance: Number(form.closingBalance),
        notes: form.notes || undefined,
      });
      setShowForm(false);
      await loadClosings();
    } catch (err: any) {
      alert('Алдаа: ' + (err.message || 'Unknown'));
    }
    setSubmitting(false);
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] text-[15px] text-[#1C1C1E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all';

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Мөнгөн хаалт</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={e => setSelectedDate(e.target.value)}
            className="px-3 py-2 rounded-xl bg-[#F2F2F7] text-[14px] outline-none"
          />
          <button
            onClick={handleOpenForm}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #BF5AF2, #AF52DE)' }}
          >
            <Plus className="w-4 h-4" /> Хаалт хийх
          </button>
        </div>
      </div>

      {/* Closing Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-6 space-y-5">
          <div className="flex items-center gap-2 mb-2">
            <Landmark className="w-5 h-5 text-[#BF5AF2]" />
            <h2 className="text-[17px] font-bold text-[#1C1C1E]">{form.closingDate} - Мөнгөн хаалт</h2>
          </div>

          {/* Daily Summary */}
          {dailySummary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-[#F2F2F7] rounded-xl p-3">
                <p className="text-[11px] text-[#8E8E93]">Бэлэн орлого</p>
                <p className="text-[17px] font-bold text-[#34C759]">₮{dailySummary.totalCashIn?.toLocaleString()}</p>
                <p className="text-[11px] text-[#8E8E93] mt-1">{dailySummary.cashPayments?.length || 0} төлбөр</p>
              </div>
              <div className="bg-[#F2F2F7] rounded-xl p-3">
                <p className="text-[11px] text-[#8E8E93]">Дансаар орлого</p>
                <p className="text-[17px] font-bold text-[#007AFF]">₮{dailySummary.totalBankIn?.toLocaleString()}</p>
                <p className="text-[11px] text-[#8E8E93] mt-1">{dailySummary.bankPayments?.length || 0} шилжүүлэг</p>
              </div>
              <div className="bg-[#F2F2F7] rounded-xl p-3">
                <p className="text-[11px] text-[#8E8E93]">Зарлага (худалдан авалт)</p>
                <p className="text-[17px] font-bold text-[#FF3B30]">₮{dailySummary.totalCashOut?.toLocaleString()}</p>
                <p className="text-[11px] text-[#8E8E93] mt-1">{dailySummary.purchases?.length || 0} орлого</p>
              </div>
              <div className="bg-[#BF5AF2]/10 rounded-xl p-3">
                <p className="text-[11px] text-[#BF5AF2]">Системийн тооцоо</p>
                <p className="text-[17px] font-bold text-[#BF5AF2]">₮{dailySummary.suggestedClosingBalance?.toLocaleString()}</p>
                <p className="text-[11px] text-[#8E8E93] mt-1">хаалтын үлдэгдэл</p>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] mb-1">Эхний үлдэгдэл</label>
              <input type="number" step="0.01" value={form.openingBalance} onChange={e => setForm({ ...form, openingBalance: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] mb-1">Бэлэн орлого (Cash In)</label>
              <input type="number" step="0.01" value={form.totalCashIn} onChange={e => setForm({ ...form, totalCashIn: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] mb-1">Зарлага (Cash Out)</label>
              <input type="number" step="0.01" value={form.totalCashOut} onChange={e => setForm({ ...form, totalCashOut: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] mb-1">Дансаар орлого (Bank In)</label>
              <input type="number" step="0.01" value={form.totalBankIn} onChange={e => setForm({ ...form, totalBankIn: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] mb-1">Хаалтын үлдэгдэл</label>
              <input type="number" step="0.01" value={form.closingBalance} onChange={e => setForm({ ...form, closingBalance: e.target.value })} required className={inputClass} />
              {Math.abs(Number(form.closingBalance) - computedBalance) > 0.01 && (
                <p className="text-[11px] text-[#FF9500] mt-1">
                  ⚠️ Зөрүү: ₮{(Number(form.closingBalance) - computedBalance).toLocaleString()}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] mb-1">Тэмдэглэл</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Нэмэлт..." className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-[#F2F2F7] text-[#8E8E93] font-semibold text-[14px]">Болих</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl text-white font-semibold text-[14px] disabled:opacity-50" style={{ background: 'linear-gradient(135deg, #BF5AF2, #AF52DE)' }}>
              {submitting ? 'Хадгалж байна...' : 'Хаалт баталгаажуулах'}
            </button>
          </div>
        </form>
      )}

      {/* Previous Closings */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        <div className="px-4 py-3 border-b border-[#E5E5EA]/50">
          <p className="text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide">Хаалтын түүх</p>
        </div>
        {loading ? (
          <div className="p-8 text-center text-[#8E8E93]">Ачааллаж байна...</div>
        ) : closings.length === 0 ? (
          <div className="py-16 text-center">
            <Landmark className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-[#1C1C1E]">Хаалт хийгээгүй байна</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-[14px]">
              <thead className="bg-[#F2F2F7]">
                <tr className="text-[#8E8E93] text-left">
                  <th className="px-4 py-2.5 font-semibold">Огноо</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Эхний</th>
                  <th className="px-4 py-2.5 font-semibold text-right text-[#34C759]">Бэлэн +</th>
                  <th className="px-4 py-2.5 font-semibold text-right text-[#007AFF]">Данс +</th>
                  <th className="px-4 py-2.5 font-semibold text-right text-[#FF3B30]">Зарлага −</th>
                  <th className="px-4 py-2.5 font-semibold text-right">Хаалт</th>
                  <th className="px-4 py-2.5 font-semibold">Хийсэн</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F2F7]">
                {closings.map((c: any) => (
                  <tr key={c.id} className="hover:bg-[#F9F9FB]">
                    <td className="px-4 py-3 font-semibold text-[#1C1C1E]">
                      {new Date(c.closingDate).toLocaleDateString('mn-MN')}
                    </td>
                    <td className="px-4 py-3 text-right">₮{Number(c.openingBalance).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[#34C759] font-medium">₮{Number(c.totalCashIn).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[#007AFF] font-medium">₮{Number(c.totalBankIn).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right text-[#FF3B30] font-medium">₮{Number(c.totalCashOut).toLocaleString()}</td>
                    <td className="px-4 py-3 text-right font-bold text-[#1C1C1E]">₮{Number(c.closingBalance).toLocaleString()}</td>
                    <td className="px-4 py-3 text-[#8E8E93]">{c.closedBy?.firstName}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
