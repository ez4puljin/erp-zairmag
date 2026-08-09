'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { FileText, ChevronRight, Printer, Plus, X } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, DateField, SelectField, ActionButton } from '@/components/shared/filter-bar';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { SUPPLIER_PAYMENT_METHODS, SUPPLIER_TXN_TYPES } from '@/lib/options';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

const fmt = (n: number) => n ? n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '';
const fmtDate = (d: string) => new Date(d).toLocaleDateString('mn-MN', { year: 'numeric', month: '2-digit', day: '2-digit' });

export default function SupplierPayablesPage() {
  const today = new Date().toISOString().split('T')[0];
  const yearStart = `${new Date().getFullYear()}-01-01`;

  const [startDate, setStartDate] = useState(yearStart);
  const [endDate, setEndDate] = useState(today);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [summary, setSummary] = useState<any[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentForm, setPaymentForm] = useState({ supplierId: '', type: 'PAYMENT', amount: '', method: 'CASH', bankAccountId: '', description: '', referenceNo: '', date: today });
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [filterSupplierId, setFilterSupplierId] = useState('');
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/api/suppliers?limit=100').then(r => setSuppliers(r.data?.data ?? r.data)).catch((err) => { console.error('Failed to load suppliers', err); });
    api.get('/api/bank-accounts').then(r => setBankAccounts(r.data ?? [])).catch(() => {});
  }, []);

  useEffect(() => {
    loadSummary();
  }, [startDate, endDate, filterSupplierId]);

  async function loadSummary() {
    setLoading(true);
    try {
      let url = `/api/supplier-payables/summary?startDate=${startDate}&endDate=${endDate}`;
      if (filterSupplierId) url += `&supplierId=${filterSupplierId}`;
      const res = await api.get(url);
      setSummary(res.data);
    } catch { }
    setLoading(false);
  }

  async function loadLedger(supplierId: string) {
    setLoading(true);
    try {
      const res = await api.get(`/api/supplier-payables/ledger/${supplierId}?startDate=${startDate}&endDate=${endDate}`);
      setLedger(res.data);
      setSelectedSupplier(res.data.supplier);
    } catch { }
    setLoading(false);
  }

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!paymentForm.supplierId || !paymentForm.amount) return;
    if (!paymentForm.bankAccountId) {
      alert('Данс заавал сонгоно уу (төлбөр гарсан данс)');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/supplier-payables/payments', {
        ...paymentForm,
        amount: Number(paymentForm.amount),
      });
      setShowPaymentModal(false);
      setPaymentForm({ supplierId: '', type: 'PAYMENT', amount: '', method: 'CASH', bankAccountId: '', description: '', referenceNo: '', date: today });
      loadSummary();
      if (selectedSupplier) loadLedger(selectedSupplier.id);
    } catch (err: any) {
      alert('Алдаа: ' + (err.response?.data?.message || err.message || 'Unknown'));
    }
    setSubmitting(false);
  }

  function handlePrint() {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Нийлүүлэгчдийн тооцоо</title>
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
        .opening-row td { background: #f9f9f5; }
        .closing-row td { background: #f5f9f5; font-weight: bold; border-top: 2px solid #333; }
        .footer { margin-top: 40px; font-size: 13px; }
        .footer p { margin: 8px 0; }
        @media print { body { padding: 20px; } }
      </style></head><body>`);
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[15px] text-[#1A1D26] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all';
  const labelClass = 'block text-[13px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1';

  const totalOpening = summary.reduce((s: number, r: any) => s + r.openingBalance, 0);
  const totalCredit = summary.reduce((s: number, r: any) => s + r.totalCredit, 0);
  const totalDebit = summary.reduce((s: number, r: any) => s + r.totalDebit, 0);
  const totalClosing = summary.reduce((s: number, r: any) => s + r.closingBalance, 0);

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Нийлүүлэгчдийн тооцоо"
        subtitle="Нийлүүлэгч бүрийн өглөгийн үлдэгдэл, төлбөр ба тооцоо"
        icon={FileText}
        iconColor="#34C759"
        actions={
          <>
            <ActionButton onClick={() => setShowPaymentModal(true)}>
              <Plus className="w-4 h-4" /> Төлбөр бүртгэх
            </ActionButton>
            {ledger && (
              <ActionButton variant="ghost" onClick={handlePrint}>
                <Printer className="w-4 h-4" /> Хэвлэх
              </ActionButton>
            )}
          </>
        }
      />

      {/* Filters */}
      <FilterBar>
        <DateField label="Эхний огноо" value={startDate} onChange={setStartDate} />
        <DateField label="Эцсийн огноо" value={endDate} onChange={setEndDate} />
        <SelectField
          label="Нийлүүлэгч"
          value={filterSupplierId}
          onChange={setFilterSupplierId}
          options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))}
          placeholder="Бүгд"
        />
        {selectedSupplier && (
          <ActionButton variant="ghost" onClick={() => { setSelectedSupplier(null); setLedger(null); }}>
            ← Бүх нийлүүлэгч
          </ActionButton>
        )}
      </FilterBar>

      {/* Summary or Ledger */}
      {!selectedSupplier ? (
        <>
          {/* KPI */}
          <StatGrid cols={4}>
            <StatCard label="Эхний үлдэгдэл" value={formatMnt(totalOpening)} gradient="orange" index={0} />
            <StatCard label="Орлого (Кредит)" value={formatMnt(totalCredit)} gradient="green" index={1} />
            <StatCard label="Төлбөр (Дебет)" value={formatMnt(totalDebit)} gradient="red" index={2} />
            <StatCard label="Эцсийн үлдэгдэл" value={formatMnt(totalClosing)} gradient="blue" index={3} />
          </StatGrid>

          <SectionCard title="Нийлүүлэгчдийн үлдэгдэл" noPadding>
            <div className="overflow-x-auto">
              <table className="w-full text-[14px]">
                <thead>
                  <tr className="border-b border-[#F0F2F5] text-[#8C8FA3] text-[11px] uppercase tracking-wide">
                    <th className="px-4 py-3 text-left font-semibold">Нийлүүлэгч</th>
                    <th className="px-3 py-3 text-right font-semibold">Эхний үлдэгдэл</th>
                    <th className="px-3 py-3 text-right font-semibold">Орлого (Кредит)</th>
                    <th className="px-3 py-3 text-right font-semibold">Төлбөр (Дебет)</th>
                    <th className="px-3 py-3 text-right font-semibold">Эцсийн үлдэгдэл</th>
                    <th className="px-3 py-3 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7]">
                  {loading ? (
                    <tr><td colSpan={6} className="py-10 text-center text-[#8C8FA3]">Ачааллаж байна...</td></tr>
                  ) : summary.length === 0 ? (
                    <tr><td colSpan={6}><EmptyState icon={FileText} title="Мэдээлэл байхгүй" hint="Огноо эсвэл нийлүүлэгчийн шүүлтээ өөрчилнө үү" /></td></tr>
                  ) : (
                    <>
                      {summary.map((s: any) => (
                        <tr key={s.id} className="hover:bg-[#F7F9FC] cursor-pointer transition-colors" onClick={() => loadLedger(s.id)}>
                          <td className="px-4 py-3 font-medium text-[#1A1D26]">{s.name}</td>
                          <td className="px-3 py-3 text-right tabular-nums">{s.openingBalance > 0 ? <span className="text-[#FF9500]">{fmt(s.openingBalance)}</span> : fmt(s.openingBalance)}</td>
                          <td className="px-3 py-3 text-right text-[#34C759] tabular-nums">{fmt(s.totalCredit)}</td>
                          <td className="px-3 py-3 text-right text-[#FF3B30] tabular-nums">{fmt(s.totalDebit)}</td>
                          <td className="px-3 py-3 text-right font-bold tabular-nums">{s.closingBalance > 0 ? <span className="text-[#FF9500]">{fmt(s.closingBalance)}</span> : <span className="text-[#34C759]">{fmt(s.closingBalance)}</span>}</td>
                          <td className="px-2 py-3"><ChevronRight className="w-4 h-4 text-[#C7C7CC]" /></td>
                        </tr>
                      ))}
                    </>
                  )}
                </tbody>
                {!loading && summary.length > 0 && (
                  <tfoot>
                    <tr className="border-t-2 border-[#E8ECF0] bg-[#F9FAFB] font-bold">
                      <td className="px-4 py-3 text-[#1A1D26]">НИЙТ ДҮН</td>
                      <td className="px-3 py-3 text-right tabular-nums">{fmt(totalOpening)}</td>
                      <td className="px-3 py-3 text-right text-[#34C759] tabular-nums">{fmt(totalCredit)}</td>
                      <td className="px-3 py-3 text-right text-[#FF3B30] tabular-nums">{fmt(totalDebit)}</td>
                      <td className="px-3 py-3 text-right tabular-nums">{fmt(totalClosing)}</td>
                      <td></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </SectionCard>
        </>
      ) : (
        <>
          {/* Detailed Ledger Report */}
          <div ref={printRef}>
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden p-6">
              <div className="text-center mb-4">
                <h2 className="text-[20px] font-bold text-[#1A1D26]">Нийлүүлэгчдийн тооцоо</h2>
                <p className="text-[13px] text-[#8C8FA3] mt-1">
                  {startDate?.replace(/-/g, '/')} - {endDate?.replace(/-/g, '/')}
                </p>
              </div>
              <div className="text-[13px] text-[#8C8FA3] mb-4">
                <p>Нийлүүлэгч: <span className="font-semibold text-[#1A1D26]">{ledger?.supplier?.name}</span></p>
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
                      <td className="px-3 py-2 text-right border border-[#E8ECF0] tabular-nums">{fmt(ledger?.openingBalance?.debit)}</td>
                      <td className="px-3 py-2 text-right border border-[#E8ECF0] tabular-nums">{fmt(ledger?.openingBalance?.credit)}</td>
                      <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                      <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                      <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                      <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                    </tr>

                    {/* Transaction entries */}
                    {ledger?.entries?.map((e: any, i: number) => {
                      const closingCredit = e.runningBalance > 0 ? e.runningBalance : 0;
                      const closingDebit = e.runningBalance < 0 ? Math.abs(e.runningBalance) : 0;
                      return (
                        <tr key={i} className="hover:bg-[#F7F9FC]">
                          <td className="px-3 py-2 text-[#8C8FA3] border border-[#E8ECF0] whitespace-nowrap">{fmtDate(e.date)}</td>
                          <td className="px-3 py-2 border border-[#E8ECF0]">
                            <span className="text-[#8C8FA3]">{e.referenceNo} </span>
                            <span className={e.type === 'PURCHASE' ? 'text-[#34C759]' : 'text-[#007AFF]'}>{e.description}</span>
                          </td>
                          <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                          <td className="px-3 py-2 border border-[#E8ECF0]"></td>
                          <td className="px-3 py-2 text-right border border-[#E8ECF0] text-[#FF3B30] tabular-nums">{fmt(e.debit)}</td>
                          <td className="px-3 py-2 text-right border border-[#E8ECF0] text-[#34C759] tabular-nums">{fmt(e.credit)}</td>
                          <td className="px-3 py-2 text-right border border-[#E8ECF0] tabular-nums">{fmt(closingDebit)}</td>
                          <td className="px-3 py-2 text-right border border-[#E8ECF0] tabular-nums">{fmt(closingCredit)}</td>
                        </tr>
                      );
                    })}

                    {/* Totals Row */}
                    <tr className="bg-[#F2F4F7] font-bold border-t-2 border-[#333]">
                      <td className="px-3 py-2.5 border border-[#E8ECF0]"></td>
                      <td className="px-3 py-2.5 text-right border border-[#E8ECF0] text-[#1A1D26]">НИЙТ ДҮН:</td>
                      <td className="px-3 py-2.5 text-right border border-[#E8ECF0] tabular-nums">{fmt(ledger?.openingBalance?.debit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E8ECF0] tabular-nums">{fmt(ledger?.openingBalance?.credit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E8ECF0] text-[#FF3B30] tabular-nums">{fmt(ledger?.totals?.debit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E8ECF0] text-[#34C759] tabular-nums">{fmt(ledger?.totals?.credit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E8ECF0] tabular-nums">{fmt(ledger?.closingBalance?.debit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E8ECF0] tabular-nums">{fmt(ledger?.closingBalance?.credit)}</td>
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
        </>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPaymentModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[20px] font-bold text-[#1A1D26]">Төлбөр / Буцаалт бүртгэх</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-lg hover:bg-[#F2F4F7]">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className={labelClass}>Нийлүүлэгч *</label>
                {suppliers.length === 0 ? (
                  <a href="/suppliers" className="block px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#B91C1C] font-medium hover:bg-[#FECDD3] transition-all">
                    ⚠️ Нийлүүлэгч бүртгээгүй байна. Эхлээд нийлүүлэгч бүртгэнэ үү. <span className="underline font-bold">Нийлүүлэгч бүртгэх</span>
                  </a>
                ) : (
                  <SearchableSelect
                    value={paymentForm.supplierId}
                    onChange={v => setPaymentForm(p => ({ ...p, supplierId: v }))}
                    options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))}
                    required
                    inputClassName={inputClass}
                    widthClass="w-full"
                    aria-label="Нийлүүлэгч"
                  />
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Төрөл *</label>
                  <SearchableSelect
                    value={paymentForm.type}
                    onChange={v => setPaymentForm(p => ({ ...p, type: v }))}
                    options={SUPPLIER_TXN_TYPES}
                    inputClassName={inputClass}
                    widthClass="w-full"
                    aria-label="Төрөл"
                  />
                </div>
                <div>
                  <label className={labelClass}>Дүн (₮) *</label>
                  <input type="number" step="0.01" min="0" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} required placeholder="0.00" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Төлбөрийн арга</label>
                  <SearchableSelect
                    value={paymentForm.method}
                    onChange={v => setPaymentForm(p => ({ ...p, method: v }))}
                    options={SUPPLIER_PAYMENT_METHODS}
                    inputClassName={inputClass}
                    widthClass="w-full"
                    aria-label="Төлбөрийн хэлбэр"
                  />
                </div>
                <div>
                  <label className={labelClass}>Огноо *</label>
                  <input type="date" value={paymentForm.date} onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))} required className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Гарсан данс *</label>
                <SearchableSelect
                  value={paymentForm.bankAccountId}
                  onChange={v => setPaymentForm(p => ({ ...p, bankAccountId: v }))}
                  options={bankAccounts.map((acc: any) => ({
                    value: acc.id,
                    label: `${acc.bankName} — ${acc.accountNumber} (${acc.holderName})`,
                  }))}
                  emptyText="Данс сонгох..."
                  required
                  inputClassName={inputClass}
                  widthClass="w-full"
                  aria-label="Данс"
                />
                {bankAccounts.length === 0 && (
                  <p className="text-[11px] text-[#FF3B30] mt-1">Данс бүртгэгдээгүй байна. Эхлээд "Данс" цэсээс шинэ данс үүсгэнэ үү.</p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Баримтын дугаар</label>
                  <input type="text" value={paymentForm.referenceNo} onChange={e => setPaymentForm(p => ({ ...p, referenceNo: e.target.value }))} placeholder="#260306" className={inputClass} />
                </div>
                <div>
                  <label className={labelClass}>Тайлбар</label>
                  <input type="text" value={paymentForm.description} onChange={e => setPaymentForm(p => ({ ...p, description: e.target.value }))} placeholder="Нэмэлт мэдээлэл" className={inputClass} />
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowPaymentModal(false)}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8C8FA3] bg-[#F2F4F7] transition-all active:scale-[0.97]">
                  Цуцлах
                </button>
                <button type="submit" disabled={submitting}
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
                  style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}>
                  {submitting ? 'Хадгалж байна...' : 'Бүртгэх'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
