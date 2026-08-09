'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { Landmark, Plus } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { DataTable, type Column } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';
import { MoneyInput } from '@/components/shared/money-input';

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

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#F5F6FA] border border-transparent text-[15px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none focus:border-[#007AFF]/40 focus:bg-white transition-all';

  const columns: Column<any>[] = [
    {
      key: 'closingDate',
      header: 'Огноо',
      render: (c) => <span className="font-semibold text-[#1A1D26]">{new Date(c.closingDate).toLocaleDateString('mn-MN')}</span>,
    },
    { key: 'openingBalance', header: 'Эхний', align: 'right', render: (c) => <span className="tabular-nums">{formatMnt(c.openingBalance)}</span> },
    { key: 'totalCashIn', header: 'Бэлэн +', align: 'right', render: (c) => <span className="text-[#34C759] font-medium tabular-nums">{formatMnt(c.totalCashIn)}</span> },
    { key: 'totalBankIn', header: 'Данс +', align: 'right', render: (c) => <span className="text-[#007AFF] font-medium tabular-nums">{formatMnt(c.totalBankIn)}</span> },
    { key: 'totalCashOut', header: 'Зарлага −', align: 'right', render: (c) => <span className="text-[#FF3B30] font-medium tabular-nums">{formatMnt(c.totalCashOut)}</span> },
    { key: 'closingBalance', header: 'Хаалт', align: 'right', render: (c) => <span className="font-bold text-[#1A1D26] tabular-nums">{formatMnt(c.closingBalance)}</span> },
    { key: 'closedBy', header: 'Хийсэн', render: (c) => <span className="text-[#8C8FA3]">{c.closedBy?.firstName}</span> },
  ];

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Мөнгөн хаалт"
        subtitle="Өдрийн бэлэн мөнгөний орлого зарлагын хаалт"
        icon={Landmark}
        iconColor="#AF52DE"
        actions={
          <>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="h-9 px-3 rounded-xl bg-[#F5F6FA] border border-transparent text-[13px] text-[#1A1D26] outline-none focus:border-[#007AFF]/40 focus:bg-white transition-all"
            />
            <button
              onClick={handleOpenForm}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-semibold text-white shadow-sm shadow-[#AF52DE]/25 transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #BF5AF2, #AF52DE)' }}
            >
              <Plus className="w-4 h-4" /> Хаалт хийх
            </button>
          </>
        }
      />

      {/* Closing Form */}
      {showForm && (
        <form onSubmit={handleSubmit} className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 p-5 lg:p-6 space-y-5">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-[#AF52DE]/12 flex items-center justify-center shrink-0">
              <Landmark className="w-5 h-5 text-[#AF52DE]" />
            </div>
            <h2 className="text-[17px] font-bold text-[#1A1D26]">{form.closingDate} — Мөнгөн хаалт</h2>
          </div>

          {/* Daily Summary */}
          {dailySummary && (
            <StatGrid cols={4}>
              <StatCard
                label="Бэлэн орлого"
                value={formatMnt(dailySummary.totalCashIn)}
                hint={`${dailySummary.cashPayments?.length || 0} төлбөр`}
                gradient="green"
                index={0}
              />
              <StatCard
                label="Дансаар орлого"
                value={formatMnt(dailySummary.totalBankIn)}
                hint={`${dailySummary.bankPayments?.length || 0} шилжүүлэг`}
                gradient="blue"
                index={1}
              />
              <StatCard
                label="Зарлага (худалдан авалт)"
                value={formatMnt(dailySummary.totalCashOut)}
                hint={`${dailySummary.purchases?.length || 0} орлого`}
                gradient="red"
                index={2}
              />
              <StatCard
                label="Системийн тооцоо"
                value={formatMnt(dailySummary.suggestedClosingBalance)}
                hint="хаалтын үлдэгдэл"
                gradient="purple"
                index={3}
              />
            </StatGrid>
          )}

          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Эхний үлдэгдэл</label>
              <MoneyInput value={form.openingBalance} onChange={(v: string) => setForm({ ...form, openingBalance: v })} required className={inputClass} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Бэлэн орлого (Cash In)</label>
              <input type="number" step="0.01" value={form.totalCashIn} onChange={e => setForm({ ...form, totalCashIn: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Зарлага (Cash Out)</label>
              <input type="number" step="0.01" value={form.totalCashOut} onChange={e => setForm({ ...form, totalCashOut: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Дансаар орлого (Bank In)</label>
              <input type="number" step="0.01" value={form.totalBankIn} onChange={e => setForm({ ...form, totalBankIn: e.target.value })} required className={inputClass} />
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Хаалтын үлдэгдэл</label>
              <input type="number" step="0.01" value={form.closingBalance} onChange={e => setForm({ ...form, closingBalance: e.target.value })} required className={inputClass} />
              {Math.abs(Number(form.closingBalance) - computedBalance) > 0.01 && (
                <p className="text-[11px] text-[#FF9500] mt-1">
                  ⚠️ Зөрүү: {formatMnt(Number(form.closingBalance) - computedBalance)}
                </p>
              )}
            </div>
            <div>
              <label className="block text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">Тэмдэглэл</label>
              <input value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} placeholder="Нэмэлт..." className={inputClass} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button type="button" onClick={() => setShowForm(false)} className="px-5 py-2.5 rounded-xl bg-[#F2F4F7] text-[#4A4D5C] font-semibold text-[14px] hover:bg-[#E8ECF0] transition-colors">Болих</button>
            <button type="submit" disabled={submitting} className="px-5 py-2.5 rounded-xl text-white font-semibold text-[14px] shadow-sm shadow-[#AF52DE]/25 hover:brightness-105 disabled:opacity-50 transition-all" style={{ background: 'linear-gradient(135deg, #BF5AF2, #AF52DE)' }}>
              {submitting ? 'Хадгалж байна...' : 'Хаалт баталгаажуулах'}
            </button>
          </div>
        </form>
      )}

      {/* Previous Closings */}
      <SectionCard title="Хаалтын түүх" noPadding>
        <DataTable
          columns={columns}
          rows={closings}
          keyField={(c) => c.id}
          rowClassName={() => 'hover:bg-[#F7F9FC]'}
          loading={loading}
          empty={<EmptyState icon={Landmark} title="Хаалт хийгээгүй байна" hint="Дээрх 'Хаалт хийх' товчоор өдрийн хаалт хийнэ үү" />}
        />
      </SectionCard>
    </div>
  );
}
