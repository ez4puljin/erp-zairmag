'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { BookOpen, ChevronRight, Calendar, Printer, Clock, MessageSquare, X, CheckCircle, XCircle } from 'lucide-react';

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

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Харилцагчдын тооцоо</h1>
        <div className="flex items-center gap-3">
          {activeTab === 'ledger' && !selectedCustomer && selectedCustomers.size > 0 && (
            <button
              onClick={openSmsModal}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #5856D6, #AF52DE)' }}
            >
              <MessageSquare className="w-4 h-4" />
              SMS илгээх ({selectedCustomers.size})
            </button>
          )}
          {ledger && (
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
              <Printer className="w-4 h-4" /> Хэвлэх
            </button>
          )}
        </div>
      </div>

      {/* Tab Toggle */}
      <div className="flex gap-1 p-1 bg-[#F2F2F7] rounded-xl w-fit">
        <button
          onClick={() => setActiveTab('ledger')}
          className={`px-4 py-2 rounded-lg text-[14px] font-semibold transition-all ${
            activeTab === 'ledger'
              ? 'bg-white text-[#007AFF] shadow-sm'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          <span className="flex items-center gap-1.5"><BookOpen className="w-4 h-4" /> Дэвтэр</span>
        </button>
        <button
          onClick={() => setActiveTab('aging')}
          className={`px-4 py-2 rounded-lg text-[14px] font-semibold transition-all ${
            activeTab === 'aging'
              ? 'bg-white text-[#007AFF] shadow-sm'
              : 'text-[#8E8E93] hover:text-[#1C1C1E]'
          }`}
        >
          <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> Насжилт</span>
        </button>
      </div>

      {activeTab === 'aging' ? (
        /* Aging Report */
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[#F2F2F7] text-[#8E8E93] text-[12px] uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Харилцагч</th>
                <th className="px-3 py-3 text-right font-semibold">0-30 өдөр</th>
                <th className="px-3 py-3 text-right font-semibold">31-60 өдөр</th>
                <th className="px-3 py-3 text-right font-semibold">61-90 өдөр</th>
                <th className="px-3 py-3 text-right font-semibold" style={{ color: '#FF3B30' }}>90+ өдөр</th>
                <th className="px-3 py-3 text-right font-semibold">Нийт</th>
              </tr>
            </thead>
            <tbody>
              {agingLoading ? (
                <tr><td colSpan={6} className="py-8 text-center text-[#8E8E93]">Ачааллаж байна...</td></tr>
              ) : agingData.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-[#8E8E93]">Мэдээлэл байхгүй</td></tr>
              ) : (
                <>
                  {agingData.map((c: any) => {
                    const d0 = Number(c.days0to30 ?? c.current ?? 0);
                    const d31 = Number(c.days31to60 ?? c.overdue30 ?? 0);
                    const d61 = Number(c.days61to90 ?? c.overdue60 ?? 0);
                    const d90 = Number(c.days90plus ?? c.overdue90 ?? 0);
                    const total = Number(c.total ?? d0 + d31 + d61 + d90);
                    return (
                      <tr key={c.id ?? c.customerId} className="border-b border-[#E5E5EA]/50 hover:bg-[#F2F2F7]/30">
                        <td className="px-4 py-3 font-medium text-[#1C1C1E]">{c.storeName ?? c.customerName ?? '—'}</td>
                        <td className="px-3 py-3 text-right">{d0 > 0 ? fmt(d0) : ''}</td>
                        <td className="px-3 py-3 text-right">{d31 > 0 ? fmt(d31) : ''}</td>
                        <td className="px-3 py-3 text-right">{d61 > 0 ? fmt(d61) : ''}</td>
                        <td className="px-3 py-3 text-right font-semibold" style={{ color: d90 > 0 ? '#FF3B30' : undefined }}>
                          {d90 > 0 ? fmt(d90) : ''}
                        </td>
                        <td className="px-3 py-3 text-right font-bold">{fmt(total)}</td>
                      </tr>
                    );
                  })}
                  {/* Summary Totals Row */}
                  <tr className="bg-[#F2F2F7] font-bold">
                    <td className="px-4 py-3 text-[#1C1C1E]">НИЙТ ДҮН</td>
                    <td className="px-3 py-3 text-right">
                      {fmt(agingData.reduce((s: number, c: any) => s + Number(c.days0to30 ?? c.current ?? 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {fmt(agingData.reduce((s: number, c: any) => s + Number(c.days31to60 ?? c.overdue30 ?? 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {fmt(agingData.reduce((s: number, c: any) => s + Number(c.days61to90 ?? c.overdue60 ?? 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right" style={{ color: '#FF3B30' }}>
                      {fmt(agingData.reduce((s: number, c: any) => s + Number(c.days90plus ?? c.overdue90 ?? 0), 0))}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {fmt(agingData.reduce((s: number, c: any) => s + Number(c.total ?? (Number(c.days0to30 ?? c.current ?? 0) + Number(c.days31to60 ?? c.overdue30 ?? 0) + Number(c.days61to90 ?? c.overdue60 ?? 0) + Number(c.days90plus ?? c.overdue90 ?? 0))), 0))}
                    </td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : (
      <>
      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
          <div>
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Эхний огноо</label>
            <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] text-[14px] outline-none focus:ring-2 focus:ring-[#007AFF]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Эцсийн огноо</label>
            <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] text-[14px] outline-none focus:ring-2 focus:ring-[#007AFF]/30" />
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Харилцагч</label>
            <select value={filterCustomerId} onChange={e => setFilterCustomerId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] text-[14px] outline-none focus:ring-2 focus:ring-[#007AFF]/30">
              <option value="">Бүгд</option>
              {customers.map((c: any) => <option key={c.id} value={c.id}>{c.storeName}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Бүс нутаг</label>
            <select value={filterCategoryId} onChange={e => setFilterCategoryId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] text-[14px] outline-none focus:ring-2 focus:ring-[#007AFF]/30">
              <option value="">Бүгд</option>
              {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
          <div>
            {selectedCustomer && (
              <button onClick={() => { setSelectedCustomer(null); setLedger(null); }}
                className="w-full px-3 py-2 rounded-xl text-[13px] text-[#007AFF] font-semibold bg-[#007AFF]/10 hover:bg-[#007AFF]/20 transition-colors">
                ← Бүх харилцагч
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary or Ledger */}
      {!selectedCustomer ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[#F2F2F7] text-[#8E8E93] text-[12px] uppercase tracking-wide">
                <th className="px-3 py-3 w-10">
                  <input
                    type="checkbox"
                    checked={summary.length > 0 && selectedCustomers.size === summary.length}
                    onChange={toggleAll}
                    className="w-4 h-4 rounded border-[#C7C7CC] text-[#007AFF] focus:ring-[#007AFF]/30 cursor-pointer"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold">Харилцагч</th>
                <th className="px-3 py-3 text-right font-semibold">Эхний үлдэгдэл</th>
                <th className="px-3 py-3 text-right font-semibold">Борлуулалт (Дебет)</th>
                <th className="px-3 py-3 text-right font-semibold">Төлбөр (Кредит)</th>
                <th className="px-3 py-3 text-right font-semibold">Эцсийн үлдэгдэл</th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#8E8E93]">Ачааллаж байна...</td></tr>
              ) : summary.length === 0 ? (
                <tr><td colSpan={7} className="py-8 text-center text-[#8E8E93]">Мэдээлэл байхгүй</td></tr>
              ) : (
                <>
                  {summary.map((c: any) => (
                    <tr key={c.id} className="border-b border-[#E5E5EA]/50 hover:bg-[#F2F2F7]/30 cursor-pointer">
                      <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={selectedCustomers.has(c.id)}
                          onChange={() => toggleCustomer(c.id)}
                          className="w-4 h-4 rounded border-[#C7C7CC] text-[#007AFF] focus:ring-[#007AFF]/30 cursor-pointer"
                        />
                      </td>
                      <td className="px-4 py-3 font-medium text-[#1C1C1E]" onClick={() => loadLedger(c.id, c.storeName)}>
                        {c.storeName}
                        {c.category && <span className="ml-2 text-[11px] px-1.5 py-0.5 bg-[#F2F2F7] rounded text-[#8E8E93]">{c.category}</span>}
                      </td>
                      <td className="px-3 py-3 text-right" onClick={() => loadLedger(c.id, c.storeName)}>{c.openingBalance > 0 ? <span className="text-[#FF9500]">{fmt(c.openingBalance)}</span> : fmt(c.openingBalance)}</td>
                      <td className="px-3 py-3 text-right text-[#FF3B30]" onClick={() => loadLedger(c.id, c.storeName)}>{fmt(c.periodDebit)}</td>
                      <td className="px-3 py-3 text-right text-[#34C759]" onClick={() => loadLedger(c.id, c.storeName)}>{fmt(c.periodCredit)}</td>
                      <td className="px-3 py-3 text-right font-bold" onClick={() => loadLedger(c.id, c.storeName)}>{c.closingBalance > 0 ? <span className="text-[#FF9500]">{fmt(c.closingBalance)}</span> : <span className="text-[#34C759]">{fmt(c.closingBalance)}</span>}</td>
                      <td className="px-2 py-3" onClick={() => loadLedger(c.id, c.storeName)}><ChevronRight className="w-4 h-4 text-[#C7C7CC]" /></td>
                    </tr>
                  ))}
                  <tr className="bg-[#F2F2F7] font-bold">
                    <td className="px-3 py-3"></td>
                    <td className="px-4 py-3 text-[#1C1C1E]">НИЙТ ДҮН</td>
                    <td className="px-3 py-3 text-right">{fmt(summary.reduce((s: number, r: any) => s + (r.openingBalance || 0), 0))}</td>
                    <td className="px-3 py-3 text-right text-[#FF3B30]">{fmt(summary.reduce((s: number, r: any) => s + (r.periodDebit || 0), 0))}</td>
                    <td className="px-3 py-3 text-right text-[#34C759]">{fmt(summary.reduce((s: number, r: any) => s + (r.periodCredit || 0), 0))}</td>
                    <td className="px-3 py-3 text-right">{fmt(summary.reduce((s: number, r: any) => s + (r.closingBalance || 0), 0))}</td>
                    <td></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <div ref={printRef}>
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden p-6">
            <div className="text-center mb-4">
              <h2 className="text-[20px] font-bold text-[#1C1C1E]">Харилцагчдын тооцоо</h2>
              <p className="text-[13px] text-[#8E8E93] mt-1">
                {startDate?.replace(/-/g, '/')} - {endDate?.replace(/-/g, '/')}
              </p>
            </div>
            <div className="text-[13px] text-[#8E8E93] mb-4">
              <p>Харилцагч: <span className="font-semibold text-[#1C1C1E]">{selectedCustomer?.storeName}</span></p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-[13px] border-collapse">
                <thead>
                  <tr className="border-b-2 border-[#E5E5EA]">
                    <th rowSpan={2} className="px-3 py-2 text-left font-semibold text-[#8E8E93] border border-[#E5E5EA]">Огноо</th>
                    <th rowSpan={2} className="px-3 py-2 text-left font-semibold text-[#8E8E93] border border-[#E5E5EA]">Нэр / Утга</th>
                    <th colSpan={2} className="px-3 py-2 text-center font-semibold text-[#8E8E93] border border-[#E5E5EA]">Эхний үлдэгдэл</th>
                    <th colSpan={2} className="px-3 py-2 text-center font-semibold text-[#8E8E93] border border-[#E5E5EA]">Гүйлгээ</th>
                    <th colSpan={2} className="px-3 py-2 text-center font-semibold text-[#8E8E93] border border-[#E5E5EA]">Эцсийн үлдэгдэл</th>
                  </tr>
                  <tr className="border-b border-[#E5E5EA]">
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8E8E93] border border-[#E5E5EA]">Дебет</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8E8E93] border border-[#E5E5EA]">Кредит</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8E8E93] border border-[#E5E5EA]">Дебет</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8E8E93] border border-[#E5E5EA]">Кредит</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8E8E93] border border-[#E5E5EA]">Дебет</th>
                    <th className="px-3 py-1.5 text-right text-[12px] font-semibold text-[#8E8E93] border border-[#E5E5EA]">Кредит</th>
                  </tr>
                </thead>
                <tbody>
                  {/* Opening Balance Row */}
                  <tr className="bg-[#FFFDE7]">
                    <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                    <td className="px-3 py-2 font-semibold text-[#1C1C1E] border border-[#E5E5EA]">Эхний үлдэгдэл</td>
                    <td className="px-3 py-2 text-right border border-[#E5E5EA]">{fmt(ledger?.openingBalance > 0 ? ledger.openingBalance : 0)}</td>
                    <td className="px-3 py-2 text-right border border-[#E5E5EA]">{fmt(ledger?.openingBalance < 0 ? Math.abs(ledger.openingBalance) : 0)}</td>
                    <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                    <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                    <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                    <td className="px-3 py-2 border border-[#E5E5EA]"></td>
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
                      <tr key={e.id || i} className="border-b border-[#E5E5EA]/50 hover:bg-[#F2F2F7]/30">
                        <td className="px-3 py-2 text-[#8E8E93] border border-[#E5E5EA] whitespace-nowrap">{fmtDate(e.date)}</td>
                        <td className="px-3 py-2 border border-[#E5E5EA]">
                          <span className={e.debit > 0 ? 'text-[#FF3B30]' : 'text-[#34C759]'}>{e.description}{methodTag}</span>
                        </td>
                        <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                        <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                        <td className="px-3 py-2 text-right border border-[#E5E5EA] text-[#FF3B30]">{fmt(e.debit)}</td>
                        <td className="px-3 py-2 text-right border border-[#E5E5EA] text-[#34C759]">{fmt(e.credit)}</td>
                        <td className="px-3 py-2 text-right border border-[#E5E5EA]">{fmt(closingDebit)}</td>
                        <td className="px-3 py-2 text-right border border-[#E5E5EA]">{fmt(closingCredit)}</td>
                      </tr>
                    );
                  })}

                  {/* Totals Row */}
                  <tr className="bg-[#F2F2F7] font-bold border-t-2 border-[#333]">
                    <td className="px-3 py-2.5 border border-[#E5E5EA]"></td>
                    <td className="px-3 py-2.5 text-right border border-[#E5E5EA] text-[#1C1C1E]">НИЙТ ДҮН:</td>
                    <td className="px-3 py-2.5 text-right border border-[#E5E5EA]">{fmt(ledger?.openingBalance > 0 ? ledger.openingBalance : 0)}</td>
                    <td className="px-3 py-2.5 text-right border border-[#E5E5EA]">{fmt(ledger?.openingBalance < 0 ? Math.abs(ledger.openingBalance) : 0)}</td>
                    <td className="px-3 py-2.5 text-right border border-[#E5E5EA] text-[#FF3B30]">{fmt(ledger?.totalDebit)}</td>
                    <td className="px-3 py-2.5 text-right border border-[#E5E5EA] text-[#34C759]">{fmt(ledger?.totalCredit)}</td>
                    <td className="px-3 py-2.5 text-right border border-[#E5E5EA]">{fmt(ledger?.closingBalance > 0 ? ledger.closingBalance : 0)}</td>
                    <td className="px-3 py-2.5 text-right border border-[#E5E5EA]">{fmt(ledger?.closingBalance < 0 ? Math.abs(ledger.closingBalance) : 0)}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-8 text-[13px] text-[#8E8E93] space-y-2">
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
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#E5E5EA]/50">
              <h3 className="text-[18px] font-bold text-[#1C1C1E] flex items-center gap-2">
                <MessageSquare className="w-5 h-5 text-[#5856D6]" />
                SMS илгээх
              </h3>
              <button onClick={() => !smsSending && setSmsModalOpen(false)} className="p-1 rounded-lg hover:bg-[#F2F2F7] transition-colors">
                <X className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </div>

            <div className="px-6 py-4 space-y-4 overflow-y-auto flex-1">
              {/* Selected customers list */}
              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-2">
                  Сонгосон харилцагчид ({selectedSummaryCustomers.length})
                </label>
                <div className="max-h-32 overflow-y-auto rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] divide-y divide-[#E5E5EA]/50">
                  {selectedSummaryCustomers.map((c: any) => (
                    <div key={c.id} className="px-3 py-2 flex items-center justify-between text-[13px]">
                      <span className="font-medium text-[#1C1C1E]">{c.storeName}</span>
                      <span className="text-[#8E8E93]">{c.phone || '—'}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Message template */}
              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-2">Мессежийн загвар</label>
                <textarea
                  ref={smsTextareaRef}
                  value={smsTemplate}
                  onChange={e => setSmsTemplate(e.target.value)}
                  rows={4}
                  placeholder="Мессежээ бичнэ үү..."
                  className="w-full px-4 py-3 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[15px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white resize-none"
                />
              </div>

              {/* Placeholder buttons */}
              <div>
                <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-2">Орлуулагч утгууд</label>
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
                  <label className="block text-[12px] font-semibold text-[#8E8E93] uppercase mb-2">Урьдчилж харах</label>
                  <div className="px-4 py-3 rounded-xl bg-[#E8F5E9] border border-[#C8E6C9] text-[14px] text-[#1C1C1E] whitespace-pre-wrap">
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
            <div className="px-6 py-4 border-t border-[#E5E5EA]/50 flex items-center justify-end gap-3">
              <button
                onClick={() => setSmsModalOpen(false)}
                disabled={smsSending}
                className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-[#8E8E93] bg-[#F2F2F7] hover:bg-[#E5E5EA] transition-colors disabled:opacity-50"
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
    </div>
  );
}
