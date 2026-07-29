'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { BookOpen, ChevronRight, Printer, Clock, MessageSquare, X, CheckCircle, XCircle, Wallet, CreditCard, Users, TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, DateField, SelectField, ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

const fmt = (n: number) => n ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
const fmtDate = (d: string) => new Date(d).toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });

export default function ReceivablesPage() {
  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [startDate, setStartDate] = useState(yearStart);
  const [endDate, setEndDate] = useState(today);
  const [summary, setSummary] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'ledger' | 'aging'>('ledger');
  const [agingData, setAgingData] = useState<any[]>([]);
  const [agingLoading, setAgingLoading] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  // Filters
  const [customers, setCustomers] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [filterCustomerId, setFilterCustomerId] = useState('');
  const [filterCategoryId, setFilterCategoryId] = useState('');

  // Payment modal state
  const [payModalOpen, setPayModalOpen] = useState(false);
  const [payCustomer, setPayCustomer] = useState<any>(null);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [payForm, setPayForm] = useState({ amount: '', method: 'CASH', bankAccountId: '', note: '' });
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    api.get('/api/bank-accounts').then(r => setBankAccounts(r.data ?? [])).catch(() => {});
  }, []);

  function openPayModal(customer: any) {
    setPayCustomer(customer);
    setPayForm({ amount: String(Math.max(0, Number(customer.closingBalance ?? customer.outstandingDebt ?? 0))), method: 'CASH', bankAccountId: '', note: '' });
    setPayModalOpen(true);
  }

  async function handlePay(e: React.FormEvent) {
    e.preventDefault();
    if (!payCustomer || !payForm.amount || !payForm.bankAccountId) return;
    setPaying(true);
    try {
      await api.post('/api/payments', {
        customerId: payCustomer.id,
        amount: Number(payForm.amount),
        method: payForm.method,
        bankAccountId: payForm.bankAccountId,
        note: payForm.note || undefined,
      });
      setPayModalOpen(false);
      loadSummary();
      if (selectedCustomer) loadLedger(selectedCustomer.id, selectedCustomer.storeName);
      alert('Тооцоо амжилттай хаагдлаа');
    } catch (err: any) {
      alert('Алдаа: ' + (err?.response?.data?.message || err.message));
    } finally { setPaying(false); }
  }

  // SMS state
  const [selectedCustomers, setSelectedCustomers] = useState<Set<string>>(new Set());
  const [smsModalOpen, setSmsModalOpen] = useState(false);
  const [smsTemplate, setSmsTemplate] = useState('');
  const [smsSending, setSmsSending] = useState(false);
  const [smsResult, setSmsResult] = useState<{ successCount: number; failedCount: number; errors?: string[] } | null>(null);
  const smsTextareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    api.get('/api/customers?limit=100').then(r => setCustomers(r.data?.data ?? r.data)).catch((err) => { console.error('Failed to load customers', err); });
    api.get('/api/customer-categories?limit=100').then(r => setCategories(r.data?.data ?? r.data)).catch((err) => { console.error('Failed to load categories', err); });
  }, []);

  useEffect(() => { loadSummary(); }, [startDate, endDate, filterCustomerId, filterCategoryId]);

  useEffect(() => {
    if (activeTab === 'aging') loadAging();
  }, [activeTab]);

  async function loadAging() {
    setAgingLoading(true);
    try {
      const res = await api.get('/api/receivables/aging');
      const data = res.data;
      setAgingData(Array.isArray(data) ? data : data.customers ?? []);
    } catch { }
    setAgingLoading(false);
  }

  async function loadSummary() {
    setLoading(true);
    try {
      let url = `/api/receivables/summary?dateFrom=${startDate}&dateTo=${endDate}`;
      if (filterCustomerId) url += `&customerId=${filterCustomerId}`;
      if (filterCategoryId) url += `&categoryId=${filterCategoryId}`;
      const res = await api.get(url);
      const data = res.data;
      setSummary(Array.isArray(data) ? data : data.customers ?? []);
    } catch { }
    setLoading(false);
  }

  async function loadLedger(customerId: string, storeName: string) {
    setLoading(true);
    try {
      const res = await api.get(`/api/receivables/${customerId}?dateFrom=${startDate}&dateTo=${endDate}`);
      setLedger(res.data);
      setSelectedCustomer({ id: customerId, storeName });
    } catch { }
    setLoading(false);
  }

  function handlePrint() {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Харилцагчдын тооцоо</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 40px; color: #1C1C1E; }
        h1 { text-align: center; font-size: 22px; margin-bottom: 8px; }
        .meta { font-size: 13px; color: #555; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; font-size: 13px; }
        th, td { border: 1px solid #ccc; padding: 6px 8px; text-align: right; }
        th { background: #f5f5f5; font-weight: 600; }
        td:first-child, td:nth-child(2) { text-align: left; }
        th:first-child, th:nth-child(2) { text-align: left; }
        .total-row td { font-weight: bold; border-top: 2px solid #333; }
        @media print { body { padding: 20px; } }
      </style></head><body>`);
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  }

  // SMS helpers
  function toggleCustomer(id: string) {
    setSelectedCustomers(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    if (selectedCustomers.size === summary.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(summary.map((c: any) => c.id)));
    }
  }

  function insertPlaceholder(placeholder: string) {
    const ta = smsTextareaRef.current;
    if (!ta) return;
    const start = ta.selectionStart;
    const end = ta.selectionEnd;
    const before = smsTemplate.slice(0, start);
    const after = smsTemplate.slice(end);
    const newVal = before + placeholder + after;
    setSmsTemplate(newVal);
    setTimeout(() => {
      ta.focus();
      ta.selectionStart = ta.selectionEnd = start + placeholder.length;
    }, 0);
  }

  function getSmsPreview() {
    if (!smsTemplate) return '';
    const first = summary.find((c: any) => selectedCustomers.has(c.id));
    if (!first) return smsTemplate;
    return smsTemplate
      .replace(/\{storeName\}/g, first.storeName ?? '')
      .replace(/\{contactName\}/g, first.contactName ?? first.storeName ?? '')
      .replace(/\{closingBalance\}/g, fmt(first.closingBalance ?? 0));
  }

  async function handleSmsSend() {
    setSmsSending(true);
    setSmsResult(null);
    try {
      const res = await api.post('/api/sms/send-bulk', {
        customerIds: Array.from(selectedCustomers),
        messageTemplate: smsTemplate,
      });
      setSmsResult(res.data);
    } catch (err: any) {
      setSmsResult({ successCount: 0, failedCount: selectedCustomers.size, errors: [err?.response?.data?.message || 'Илгээхэд алдаа гарлаа'] });
    }
    setSmsSending(false);
  }

  function openSmsModal() {
    setSmsResult(null);
    setSmsModalOpen(true);
  }

  const selectedSummaryCustomers = summary.filter((c: any) => selectedCustomers.has(c.id));

  const thBase = 'px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-[#8C8FA3] whitespace-nowrap';

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Харилцагчдын тооцоо"
        subtitle="Авлагын дэвтэр, тооцоо хаалт, насжилтын шинжилгээ"
        icon={BookOpen}
        actions={
          <>
            {activeTab === 'ledger' && !selectedCustomer && selectedCustomers.size > 0 && (
              <button
                onClick={openSmsModal}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-white shadow-sm transition-all active:scale-[0.97] hover:brightness-105"
                style={{ background: 'linear-gradient(135deg, #5856D6, #AF52DE)' }}
              >
                <MessageSquare className="w-4 h-4" />
                SMS илгээх ({selectedCustomers.size})
              </button>
            )}
            {ledger && (
              <button onClick={handlePrint}
                className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-white shadow-sm transition-all active:scale-[0.97] hover:brightness-105"
                style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
                <Printer className="w-4 h-4" /> Хэвлэх
              </button>
            )}
          </>
        }
      />

      {/* Tab Toggle */}
      <div className="inline-flex gap-1 p-1 bg-[#F2F4F7] rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
            activeTab === 'ledger'
              ? 'bg-white text-[#007AFF] shadow-sm'
              : 'text-[#8C8FA3] hover:text-[#1A1D26]'
          }`}
        >
          <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Дэвтэр</span>
        </button>
        <button
          onClick={() => setActiveTab('aging')}
          className={`px-4 py-2 rounded-lg text-[13px] font-semibold transition-all ${
            activeTab === 'aging'
              ? 'bg-white text-[#007AFF] shadow-sm'
              : 'text-[#8C8FA3] hover:text-[#1A1D26]'
          }`}
        >
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Насжилт</span>
        </button>
      </div>

      {activeTab === 'aging' ? (
        /* Aging Report */
        <SectionCard noPadding>
          <div className="overflow-x-auto">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#F0F2F5] bg-[#F9FAFB]">
                  <th className={`${thBase} text-left`}>Харилцагч</th>
                  <th className={`${thBase} text-right`}>0-30 өдөр</th>
                  <th className={`${thBase} text-right`}>31-60 өдөр</th>
                  <th className={`${thBase} text-right`}>61-90 өдөр</th>
                  <th className={`${thBase} text-right`} style={{ color: '#FF3B30' }}>90+ өдөр</th>
                  <th className={`${thBase} text-right`}>Нийт</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7]">
                {agingLoading ? (
                  <tr><td colSpan={6} className="py-10 text-center text-[13px] text-[#8C8FA3]">Ачааллаж байна...</td></tr>
                ) : agingData.length === 0 ? (
                  <tr><td colSpan={6} className="py-0">
                    <EmptyState icon={Clock} title="Мэдээлэл байхгүй" hint="Насжилтын шинжилгээнд харуулах авлага олдсонгүй" />
                  </td></tr>
                ) : (
                  <>
                    {agingData.map((c: any) => {
                      const d0 = Number(c.days0to30 ?? c.current ?? 0);
                      const d31 = Number(c.days31to60 ?? c.overdue30 ?? 0);
                      const d61 = Number(c.days61to90 ?? c.overdue60 ?? 0);
                      const d90 = Number(c.days90plus ?? c.overdue90 ?? 0);
                      const total = Number(c.total ?? d0 + d31 + d61 + d90);
                      return (
                        <tr key={c.id ?? c.customerId} className="hover:bg-[#F7F9FC] transition-colors">
                          <td className="px-3 py-2.5 font-medium text-[#1A1D26]">{c.storeName ?? c.customerName ?? '—'}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-[#4A4D5C]">{d0 > 0 ? fmt(d0) : ''}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-[#4A4D5C]">{d31 > 0 ? fmt(d31) : ''}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-[#4A4D5C]">{d61 > 0 ? fmt(d61) : ''}</td>
                          <td className="px-3 py-2.5 text-right font-semibold tabular-nums" style={{ color: d90 > 0 ? '#FF3B30' : undefined }}>
                            {d90 > 0 ? fmt(d90) : ''}
                          </td>
                          <td className="px-3 py-2.5 text-right font-bold tabular-nums text-[#1A1D26]">{fmt(total)}</td>
                        </tr>
                      );
                    })}
                    {/* Summary Totals Row */}
                    <tr className="bg-[#F9FAFB] font-bold border-t border-[#E8ECF0]">
                      <td className="px-3 py-2.5 text-[#1A1D26]">НИЙТ ДҮН</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {fmt(agingData.reduce((s: number, c: any) => s + Number(c.days0to30 ?? c.current ?? 0), 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {fmt(agingData.reduce((s: number, c: any) => s + Number(c.days31to60 ?? c.overdue30 ?? 0), 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {fmt(agingData.reduce((s: number, c: any) => s + Number(c.days61to90 ?? c.overdue60 ?? 0), 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums" style={{ color: '#FF3B30' }}>
                        {fmt(agingData.reduce((s: number, c: any) => s + Number(c.days90plus ?? c.overdue90 ?? 0), 0))}
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">
                        {fmt(agingData.reduce((s: number, c: any) => s + Number(c.total ?? (Number(c.days0to30 ?? c.current ?? 0) + Number(c.days31to60 ?? c.overdue30 ?? 0) + Number(c.days61to90 ?? c.overdue60 ?? 0) + Number(c.days90plus ?? c.overdue90 ?? 0))), 0))}
                      </td>
                    </tr>
                  </>
                )}
              </tbody>
            </table>
          </div>
        </SectionCard>
      ) : (
      <>
      {/* Filters */}
      <FilterBar>
        <DateField label="Эхний огноо" value={startDate} onChange={setStartDate} />
        <DateField label="Эцсийн огноо" value={endDate} onChange={setEndDate} />
        <SelectField
          label="Харилцагч"
          value={filterCustomerId}
          onChange={setFilterCustomerId}
          options={customers.map((c: any) => ({ value: c.id, label: c.storeName }))}
          placeholder="Бүгд"
        />
        <SelectField
          label="Бүс нутаг"
          value={filterCategoryId}
          onChange={setFilterCategoryId}
          options={categories.map((c: any) => ({ value: c.id, label: c.name }))}
          placeholder="Бүгд"
        />
        {selectedCustomer && (
          <ActionButton variant="ghost" onClick={() => { setSelectedCustomer(null); setLedger(null); }}>
            ← Бүх харилцагч
          </ActionButton>
        )}
      </FilterBar>

      {/* Summary or Ledger */}
      {!selectedCustomer ? (
        <>
          {/* KPI Cards */}
          <StatGrid cols={4}>
            <StatCard label="Нийт харилцагч" value={summary.length} icon={Users} gradient="blue" index={0} />
            <StatCard label="Борлуулалт (Дебет)" value={formatMnt(summary.reduce((s: number, r: any) => s + (r.periodDebit || 0), 0))} icon={TrendingUp} gradient="orange" index={1} />
            <StatCard label="Төлбөр (Кредит)" value={formatMnt(summary.reduce((s: number, r: any) => s + (r.periodCredit || 0), 0))} icon={Wallet} gradient="green" index={2} />
            <StatCard label="Авлагын үлдэгдэл" value={formatMnt(summary.reduce((s: number, r: any) => s + (r.closingBalance || 0), 0))} icon={CreditCard} gradient="red" index={3} />
          </StatGrid>

          <SectionCard noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="border-b border-[#F0F2F5] bg-[#F9FAFB]">
                    <th className="px-3 py-2.5 w-10">
                      <input
                        type="checkbox"
                        checked={summary.length > 0 && selectedCustomers.size === summary.length}
                        onChange={toggleAll}
                        className="w-4 h-4 rounded border-[#C7C7CC] text-[#007AFF] focus:ring-[#007AFF]/30 cursor-pointer align-middle"
                      />
                    </th>
                    <th className={`${thBase} text-left`}>Харилцагч</th>
                    <th className={`${thBase} text-right`}>Эхний үлдэгдэл</th>
                    <th className={`${thBase} text-right`}>Борлуулалт (Дебет)</th>
                    <th className={`${thBase} text-right`}>Төлбөр (Кредит)</th>
                    <th className={`${thBase} text-right`}>Эцсийн үлдэгдэл</th>
                    <th className="px-3 py-2.5 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7]">
                  {loading ? (
                    <tr><td colSpan={7} className="py-10 text-center text-[13px] text-[#8C8FA3]">Ачааллаж байна...</td></tr>
                  ) : summary.length === 0 ? (
                    <tr><td colSpan={7} className="py-0">
                      <EmptyState icon={BookOpen} title="Мэдээлэл байхгүй" hint="Сонгосон хугацаанд харилцагчийн тооцоо олдсонгүй" />
                    </td></tr>
                  ) : (
                    <>
                      {summary.map((c: any) => (
                        <tr key={c.id} className="hover:bg-[#F7F9FC] transition-colors cursor-pointer">
                          <td className="px-3 py-2.5" onClick={e => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedCustomers.has(c.id)}
                              onChange={() => toggleCustomer(c.id)}
                              className="w-4 h-4 rounded border-[#C7C7CC] text-[#007AFF] focus:ring-[#007AFF]/30 cursor-pointer align-middle"
                            />
                          </td>
                          <td className="px-3 py-2.5 font-medium text-[#1A1D26]" onClick={() => loadLedger(c.id, c.storeName)}>
                            {c.storeName}
                            {c.category && <span className="ml-2 text-[10px] font-semibold px-1.5 py-0.5 bg-[#F2F4F7] rounded-md text-[#8C8FA3]">{c.category}</span>}
                          </td>
                          <td className="px-3 py-2.5 text-right tabular-nums" onClick={() => loadLedger(c.id, c.storeName)}>{c.openingBalance > 0 ? <span className="text-[#FF9500]">{fmt(c.openingBalance)}</span> : fmt(c.openingBalance)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-[#FF3B30]" onClick={() => loadLedger(c.id, c.storeName)}>{fmt(c.periodDebit)}</td>
                          <td className="px-3 py-2.5 text-right tabular-nums text-[#34C759]" onClick={() => loadLedger(c.id, c.storeName)}>{fmt(c.periodCredit)}</td>
                          <td className="px-3 py-2.5 text-right font-bold tabular-nums" onClick={() => loadLedger(c.id, c.storeName)}>{c.closingBalance > 0 ? <span className="text-[#FF9500]">{fmt(c.closingBalance)}</span> : <span className="text-[#34C759]">{fmt(c.closingBalance)}</span>}</td>
                          <td className="px-2 py-2.5 text-right" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1">
                              {c.closingBalance > 0 && (
                                <button
                                  type="button"
                                  onClick={() => openPayModal(c)}
                                  className="px-2.5 py-1 rounded-lg bg-[#34C759]/10 text-[#34C759] text-[11px] font-bold hover:bg-[#34C759]/20 transition-all"
                                >
                                  Хаах
                                </button>
                              )}
                              <ChevronRight className="w-4 h-4 text-[#C7C7CC] cursor-pointer shrink-0" onClick={() => loadLedger(c.id, c.storeName)} />
                            </div>
                          </td>
                        </tr>
                      ))}
                      <tr className="bg-[#F9FAFB] font-bold border-t border-[#E8ECF0]">
                        <td className="px-3 py-2.5"></td>
                        <td className="px-3 py-2.5 text-[#1A1D26]">НИЙТ ДҮН</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt(summary.reduce((s: number, r: any) => s + (r.openingBalance || 0), 0))}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[#FF3B30]">{fmt(summary.reduce((s: number, r: any) => s + (r.periodDebit || 0), 0))}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums text-[#34C759]">{fmt(summary.reduce((s: number, r: any) => s + (r.periodCredit || 0), 0))}</td>
                        <td className="px-3 py-2.5 text-right tabular-nums">{fmt(summary.reduce((s: number, r: any) => s + (r.closingBalance || 0), 0))}</td>
                        <td></td>
                      </tr>
                    </>
                  )}
                </tbody>
              </table>
            </div>
          </SectionCard>
        </>
      ) : (
        <div ref={printRef}>
          <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden p-6">
            <div className="text-center mb-4">
              <h2 className="text-[20px] font-bold text-[#1A1D26]">Харилцагчдын тооцоо</h2>
              <p className="text-[13px] text-[#8C8FA3] mt-1">
                {startDate?.replace(/-/g, '/')} - {endDate?.replace(/-/g, '/')}
              </p>
            </div>
            <div className="text-[13px] text-[#8C8FA3] mb-4">
              <p>Харилцагч: <span className="font-semibold text-[#1A1D26]">{selectedCustomer?.storeName}</span></p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E8ECF0]">
                    <th rowSpan={2} className="px-3 py-2 text-left font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Огноо</th>
                    <th rowSpan={2} className="px-3 py-2 text-left font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Нэр / Утга</th>
                    <th colSpan={2} className="px-3 py-2 text-center font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Эхний үлдэгдэл</th>
                    <th colSpan={2} className="px-3 py-2 text-center font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Гүйлгээ</th>
                    <th colSpan={2} className="px-3 py-2 text-center font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Эцсийн үлдэгдэл</th>
                  </tr>
                  <tr className="border-b border-[#E8ECF0]">
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Дебет</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Кредит</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Дебет</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Кредит</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Дебет</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8C8FA3] border border-[#E8ECF0]">Кредит</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="bg-[#FFFDE7]">
                    <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                    <td className="px-3 py-2 font-semibold text-[#1A1D26] border border-[#E8ECF0]">Эхний үлдэгдэл</td>
                    <td className="px-3 py-2 text-right tabular-nums border border-[#E8ECF0]">{fmt(ledger?.openingBalance > 0 ? ledger.openingBalance : 0)}</td>
                    <td className="px-3 py-2 text-right tabular-nums border border-[#E8ECF0]">{fmt(ledger?.openingBalance < 0 ? Math.abs(ledger.openingBalance) : 0)}</td>
                    <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                    <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                    <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                    <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                  </tr>

                  {/* Transaction entries */}
                  {ledger?.entries?.map((e: any, i: number) => {
                    const closingDebit = e.balance > 0 ? e.balance : 0;
                    const closingCredit = e.balance < 0 ? Math.abs(e.balance) : 0;
                    const methodLabels: Record<string, string> = {
                      CASH: 'Бэлэн', BANK_TRANSFER: 'Дансаар', MOBILE_MONEY: 'Мобайл', CHECK: 'Чек',
                    };
                    const methodTag = e.paymentMethod ? ` (${methodLabels[e.paymentMethod] || e.paymentMethod})` : '';
                    return (
                      <tr key={e.id || i} className="hover:bg-[#F7F9FC] transition-colors">
                        <td className="px-3 py-2 text-[#8C8FA3] border border-[#E8ECF0] whitespace-nowrap">{fmtDate(e.date)}</td>
                        <td className="px-3 py-2 border border-[#E8ECF0]">
                          <span className={e.debit > 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'}>{e.description}{methodTag}</span>
                        </td>
                        <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                        <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                        <td className="px-3 py-2 text-right tabular-nums border border-[#E8ECF0] text-[#FF3B30]">{fmt(e.debit)}</td>
                        <td className="px-3 py-2 text-right tabular-nums border border-[#E8ECF0] text-[#34C759]">{fmt(e.credit)}</td>
                        <td className="px-3 py-2 text-right tabular-nums border border-[#E8ECF0]">{fmt(closingDebit)}</td>
                        <td className="px-3 py-2 text-right tabular-nums border border-[#E8ECF0]">{fmt(closingCredit)}</td>
                      </tr>
                    );
                  })}

                  {/* Totals Row */}
                  <tr className="bg-[#F9FAFB] font-bold border-t-2 border-[#333]">
                    <td className="px-3 py-2.5 border border-[#E8ECF0]"></td>
                    <td className="px-3 py-2.5 text-right border border-[#E8ECF0] text-[#1A1D26]">НИЙТ ДҮН:</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border border-[#E8ECF0]">{fmt(ledger?.openingBalance > 0 ? ledger.openingBalance : 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border border-[#E8ECF0]">{fmt(ledger?.openingBalance < 0 ? Math.abs(ledger.openingBalance) : 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border border-[#E8ECF0] text-[#FF3B30]">{fmt(ledger?.totalDebit)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border border-[#E8ECF0] text-[#34C759]">{fmt(ledger?.totalCredit)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border border-[#E8ECF0]">{fmt(ledger?.closingBalance > 0 ? ledger.closingBalance : 0)}</td>
                    <td className="px-3 py-2.5 text-right tabular-nums border border-[#E8ECF0]">{fmt(ledger?.closingBalance < 0 ? Math.abs(ledger.closingBalance) : 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-[13px] text-[#8C8FA3] space-y-2">
              <p>Тайлан гаргасан: ......................................./                   /</p>
              <p>Хянасан нягтлан бодогч: ......................................./                   /</p>
            </div>
          </div>
        </div>
      )}
      </>
      )}

      {/* SMS Modal */}
      {smsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={() => !smsSending && setSmsModalOpen(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col animate-ios-scale-in" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#F0F2F5]">
              <h3 className="text-[17px] font-bold text-[#1A1D26] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#5856D6]" />
                SMS илгээх
              </h3>
              <button onClick={() => !smsSending && setSmsModalOpen(false)} className="p-1.5 rounded-lg hover:bg-[#F2F4F7] transition-colors">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {/* Selected customers list */}
              <div>
                <label className="block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-2">
                  Сонгосон харилцагчид ({selectedSummaryCustomers.length})
                </label>
                <div className="max-h-32 overflow-y-auto rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70 divide-y divide-[#F0F2F5]">
                  {selectedSummaryCustomers.map((c: any) => (
                    <div key={c.id} className="px-3 py-2 flex items-center justify-between text-[13px]">
                      <span className="font-medium text-[#1A1D26]">{c.storeName}</span>
                      <span className="text-[#8C8FA3]">{c.phone || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message template */}
              <div>
                <label className="block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-2">Мессежийн загвар</label>
                <textarea
                  ref={smsTextareaRef}
                  value={smsTemplate}
                  onChange={e => setSmsTemplate(e.target.value)}
                  rows={4}
                  placeholder="Мессежээ бичнэ үү..."
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70 text-[15px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white resize-none"
                />
              </div>

              {/* Placeholder buttons */}
              <div>
                <label className="block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-2">Орлуулагч утгууд</label>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{storeName}')}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[#007AFF]/10 text-[#007AFF] hover:bg-[#007AFF]/20 transition-colors"
                  >
                    {'{storeName}'} - Дэлгүүр нэр
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{contactName}')}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[#5856D6]/10 text-[#5856D6] hover:bg-[#5856D6]/20 transition-colors"
                  >
                    {'{contactName}'} - Холбоо барих
                  </button>
                  <button
                    type="button"
                    onClick={() => insertPlaceholder('{closingBalance}')}
                    className="px-3 py-1.5 rounded-lg text-[13px] font-medium bg-[#FF9500]/10 text-[#FF9500] hover:bg-[#FF9500]/20 transition-colors"
                  >
                    {'{closingBalance}'} - Үлдэгдэл
                  </button>
                </div>
              </div>

              {/* Preview */}
              {smsTemplate && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-2">Урьдчилж харах</label>
                  <div className="px-4 py-3 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] text-[14px] text-[#1A1D26] whitespace-pre-wrap">
                    {getSmsPreview()}
                  </div>
                </div>
              )}

              {/* Results */}
              {smsResult && (
                <div className={`rounded-xl p-4 space-y-2 ${smsResult.failedCount > 0 && smsResult.successCount === 0 ? 'bg-[#FF3B30]/10' : 'bg-[#34C759]/10'}`}>
                  <div className="flex items-center gap-4 text-[14px]">
                    {smsResult.successCount > 0 && (
                      <span className="flex items-center gap-1.5 text-[#34C759] font-semibold">
                        <CheckCircle className="w-4 h-4" /> Амжилттай: {smsResult.successCount}
                      </span>
                    )}
                    {smsResult.failedCount > 0 && (
                      <span className="flex items-center gap-1.5 text-[#FF3B30] font-semibold">
                        <XCircle className="w-4 h-4" /> Алдаатай: {smsResult.failedCount}
                      </span>
                    )}
                  </div>
                  {smsResult.errors && smsResult.errors.length > 0 && (
                    <div className="text-[13px] text-[#FF3B30] space-y-1">
                      {smsResult.errors.map((err, i) => <p key={i}>{err}</p>)}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-4 border-t border-[#F0F2F5] flex items-center justify-end gap-3">
              <button
                onClick={() => setSmsModalOpen(false)}
                disabled={smsSending}
                className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#8C8FA3] bg-[#F2F4F7] hover:bg-[#E8ECF0] transition-colors disabled:opacity-50"
              >
                Хаах
              </button>
              {!smsResult && (
                <button
                  onClick={handleSmsSend}
                  disabled={smsSending || !smsTemplate.trim()}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #5856D6, #AF52DE)' }}
                >
                  <MessageSquare className="w-4 h-4" />
                  {smsSending ? 'Илгээж байна...' : 'Илгээх'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment / Тооцоо хаах Modal */}
      {payModalOpen && payCustomer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setPayModalOpen(false)} />
          <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-ios-scale-in">
            <div className="p-5 border-b border-[#F0F2F5] flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
                <Wallet className="w-5 h-5 text-[#34C759]" />
              </div>
              <div className="flex-1">
                <h3 className="text-[17px] font-bold text-[#1A1D26]">Тооцоо хаах</h3>
                <p className="text-[12px] text-[#8C8FA3]">{payCustomer.storeName}</p>
              </div>
              <button onClick={() => setPayModalOpen(false)} className="p-2 rounded-lg hover:bg-[#F2F4F7]">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            <form onSubmit={handlePay} className="p-5 space-y-4">
              {/* Current debt */}
              <div className="bg-[#FF9500]/5 border border-[#FF9500]/20 rounded-xl p-3 text-center">
                <p className="text-[11px] text-[#8C8FA3] uppercase tracking-wide font-semibold">Одоогийн өр</p>
                <p className="text-[22px] font-bold text-[#FF9500] tabular-nums">{formatMnt(Number(payCustomer.closingBalance ?? payCustomer.outstandingDebt ?? 0))}</p>
              </div>

              {/* Amount */}
              <div>
                <label className="block text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wide mb-1">Хаах дүн (₮) *</label>
                <input
                  type="number"
                  min={1}
                  value={payForm.amount}
                  onChange={e => setPayForm(p => ({ ...p, amount: e.target.value }))}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70 text-[15px] text-[#1A1D26] outline-none focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white"
                />
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wide mb-1">Төлбөрийн хэлбэр *</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setPayForm(p => ({ ...p, method: 'CASH' }))}
                    className={`py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all ${
                      payForm.method === 'CASH'
                        ? 'bg-[#34C759] text-white border-[#34C759]'
                        : 'bg-white text-[#4A4D5C] border-[#E8ECF0]'
                    }`}
                  >
                    💵 Бэлэн мөнгө
                  </button>
                  <button
                    type="button"
                    onClick={() => setPayForm(p => ({ ...p, method: 'BANK_TRANSFER' }))}
                    className={`py-2.5 rounded-xl text-[13px] font-semibold border-2 transition-all ${
                      payForm.method === 'BANK_TRANSFER'
                        ? 'bg-[#007AFF] text-white border-[#007AFF]'
                        : 'bg-white text-[#4A4D5C] border-[#E8ECF0]'
                    }`}
                  >
                    🏦 Дансаар
                  </button>
                </div>
              </div>

              {/* Bank account */}
              <div>
                <label className="block text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wide mb-1">Данс *</label>
                {bankAccounts.length === 0 ? (
                  <a href="/bank-accounts" className="block px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#B91C1C] font-medium hover:bg-[#FECDD3] transition-all">
                    ⚠️ Данс бүртгээгүй. <span className="underline font-bold">Данс үүсгэх</span>
                  </a>
                ) : (
                  <select
                    value={payForm.bankAccountId}
                    onChange={e => setPayForm(p => ({ ...p, bankAccountId: e.target.value }))}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70 text-[14px] text-[#1A1D26] outline-none focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white"
                  >
                    <option value="">Данс сонгох...</option>
                    {bankAccounts.map((acc: any) => (
                      <option key={acc.id} value={acc.id}>
                        {acc.bankName} — {acc.accountNumber} ({acc.holderName})
                      </option>
                    ))}
                  </select>
                )}
              </div>

              {/* Note */}
              <div>
                <label className="block text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wide mb-1">Тэмдэглэл</label>
                <input
                  type="text"
                  value={payForm.note}
                  onChange={e => setPayForm(p => ({ ...p, note: e.target.value }))}
                  placeholder="Нэмэлт мэдээлэл..."
                  className="w-full px-4 py-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]/70 text-[14px] text-[#1A1D26] outline-none focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setPayModalOpen(false)}
                  className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-[#8C8FA3] bg-[#F2F4F7] hover:bg-[#E8ECF0] transition-all">
                  Болих
                </button>
                <button type="submit" disabled={paying || !payForm.bankAccountId}
                  className="flex-1 py-3 rounded-xl text-[14px] font-semibold text-white bg-[#34C759] hover:bg-[#2DB84E] disabled:opacity-50 transition-all flex items-center justify-center gap-2">
                  <CheckCircle className="w-4 h-4" />
                  {paying ? 'Хадгалж байна...' : 'Тооцоо хаах'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
