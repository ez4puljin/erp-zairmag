'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { FileText, ChevronRight, Calendar, Printer, Plus, X } from 'lucide-react';

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

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] text-[15px] text-[#1C1C1E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 transition-all';
  const labelClass = 'block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1';

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Нийлүүлэгчдийн тооцоо</h1>
        <div className="flex items-center gap-2">
          <button onClick={() => setShowPaymentModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}>
            <Plus className="w-4 h-4" /> Төлбөр бүртгэх
          </button>
          {ledger && (
            <button onClick={handlePrint}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
              <Printer className="w-4 h-4" /> Хэвлэх
            </button>
          )}
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-4">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
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
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Нийлүүлэгч</label>
            <select value={filterSupplierId} onChange={e => setFilterSupplierId(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] text-[14px] outline-none focus:ring-2 focus:ring-[#007AFF]/30">
              <option value="">Бүгд</option>
              {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div>
            {selectedSupplier && (
              <button onClick={() => { setSelectedSupplier(null); setLedger(null); }}
                className="w-full px-3 py-2 rounded-xl text-[13px] text-[#007AFF] font-semibold bg-[#007AFF]/10 hover:bg-[#007AFF]/20 transition-colors">
                ← Бүх нийлүүлэгч
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Summary or Ledger */}
      {!selectedSupplier ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[#F2F2F7] text-[#8E8E93] text-[12px] uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Нийлүүлэгч</th>
                <th className="px-3 py-3 text-right font-semibold">Эхний үлдэгдэл</th>
                <th className="px-3 py-3 text-right font-semibold">Орлого (Кредит)</th>
                <th className="px-3 py-3 text-right font-semibold">Төлбөр (Дебет)</th>
                <th className="px-3 py-3 text-right font-semibold">Эцсийн үлдэгдэл</th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr><td colSpan={6} className="py-8 text-center text-[#8E8E93]">Ачааллаж байна...</td></tr>
              ) : summary.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-[#8E8E93]">Мэдээлэл байхгүй</td></tr>
              ) : (
                <>
                  {summary.map((s: any) => (
                    <tr key={s.id} className="border-b border-[#E5E5EA]/50 hover:bg-[#F2F2F7]/30 cursor-pointer" onClick={() => loadLedger(s.id)}>
                      <td className="px-4 py-3 font-medium text-[#1C1C1E]">{s.name}</td>
                      <td className="px-3 py-3 text-right">{s.openingBalance > 0 ? <span className="text-[#FF9500]">{fmt(s.openingBalance)}</span> : fmt(s.openingBalance)}</td>
                      <td className="px-3 py-3 text-right text-[#34C759]">{fmt(s.totalCredit)}</td>
                      <td className="px-3 py-3 text-right text-[#FF3B30]">{fmt(s.totalDebit)}</td>
                      <td className="px-3 py-3 text-right font-bold">{s.closingBalance > 0 ? <span className="text-[#FF9500]">{fmt(s.closingBalance)}</span> : <span className="text-[#34C759]">{fmt(s.closingBalance)}</span>}</td>
                      <td className="px-2 py-3"><ChevronRight className="w-4 h-4 text-[#C7C7CC]" /></td>
                    </tr>
                  ))}
                  <tr className="bg-[#F2F2F7] font-bold">
                    <td className="px-4 py-3 text-[#1C1C1E]">НИЙТ ДҮН</td>
                    <td className="px-3 py-3 text-right">{fmt(summary.reduce((s: number, r: any) => s + r.openingBalance, 0))}</td>
                    <td className="px-3 py-3 text-right text-[#34C759]">{fmt(summary.reduce((s: number, r: any) => s + r.totalCredit, 0))}</td>
                    <td className="px-3 py-3 text-right text-[#FF3B30]">{fmt(summary.reduce((s: number, r: any) => s + r.totalDebit, 0))}</td>
                    <td className="px-3 py-3 text-right">{fmt(summary.reduce((s: number, r: any) => s + r.closingBalance, 0))}</td>
                    <td></td>
                  </tr>
                </>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          {/* Detailed Ledger Report */}
          <div ref={printRef}>
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden p-6">
              <div className="text-center mb-4">
                <h2 className="text-[20px] font-bold text-[#1C1C1E]">Нийлүүлэгчдийн тооцоо</h2>
                <p className="text-[13px] text-[#8E8E93] mt-1">
                  {startDate?.replace(/-/g, '/')} - {endDate?.replace(/-/g, '/')}
                </p>
              </div>
              <div className="text-[13px] text-[#8E8E93] mb-4">
                <p>Нийлүүлэгч: <span className="font-semibold text-[#1C1C1E]">{ledger?.supplier?.name}</span></p>
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
                      <td className="px-3 py-2 text-right border border-[#E5E5EA]">{fmt(ledger?.openingBalance?.debit)}</td>
                      <td className="px-3 py-2 text-right border border-[#E5E5EA]">{fmt(ledger?.openingBalance?.credit)}</td>
                      <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                      <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                      <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                      <td className="px-3 py-2 border border-[#E5E5EA]"></td>
                    </tr>

                    {/* Transaction entries */}
                    {ledger?.entries?.map((e: any, i: number) => {
                      const closingCredit = e.runningBalance > 0 ? e.runningBalance : 0;
                      const closingDebit = e.runningBalance < 0 ? Math.abs(e.runningBalance) : 0;
                      return (
                        <tr key={i} className="border-b border-[#E5E5EA]/50 hover:bg-[#F2F2F7]/30">
                          <td className="px-3 py-2 text-[#8E8E93] border border-[#E5E5EA] whitespace-nowrap">{fmtDate(e.date)}</td>
                          <td className="px-3 py-2 border border-[#E5E5EA]">
                            <span className="text-[#8E8E93]">{e.referenceNo} </span>
                            <span className={e.type === 'PURCHASE' ? 'text-[#34C759]' : 'text-[#007AFF]'}>{e.description}</span>
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
                      <td className="px-3 py-2.5 text-right border border-[#E5E5EA]">{fmt(ledger?.openingBalance?.debit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E5E5EA]">{fmt(ledger?.openingBalance?.credit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E5E5EA] text-[#FF3B30]">{fmt(ledger?.totals?.debit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E5E5EA] text-[#34C759]">{fmt(ledger?.totals?.credit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E5E5EA]">{fmt(ledger?.closingBalance?.debit)}</td>
                      <td className="px-3 py-2.5 text-right border border-[#E5E5EA]">{fmt(ledger?.closingBalance?.credit)}</td>
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
        </>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowPaymentModal(false)} />
          <div className="relative w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl animate-ios-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-[20px] font-bold text-[#1C1C1E]">Төлбөр / Буцаалт бүртгэх</h3>
              <button onClick={() => setShowPaymentModal(false)} className="p-1 rounded-lg hover:bg-[#F2F2F7]">
                <X className="w-5 h-5 text-[#8E8E93]" />
              </button>
            </div>
            <form onSubmit={handlePayment} className="space-y-4">
              <div>
                <label className={labelClass}>Нийлүүлэгч *</label>
                <select value={paymentForm.supplierId} onChange={e => setPaymentForm(p => ({ ...p, supplierId: e.target.value }))} required className={inputClass}>
                  <option value="">Сонгох...</option>
                  {suppliers.map((s: any) => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Төрөл *</label>
                  <select value={paymentForm.type} onChange={e => setPaymentForm(p => ({ ...p, type: e.target.value }))} className={inputClass}>
                    <option value="PAYMENT">Төлбөр</option>
                    <option value="RETURN">Буцаалт</option>
                    <option value="ADJUSTMENT">Тохируулга</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Дүн (₮) *</label>
                  <input type="number" step="0.01" min="0" value={paymentForm.amount} onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))} required placeholder="0.00" className={inputClass} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={labelClass}>Төлбөрийн арга</label>
                  <select value={paymentForm.method} onChange={e => setPaymentForm(p => ({ ...p, method: e.target.value }))} className={inputClass}>
                    <option value="CASH">Бэлэн</option>
                    <option value="BANK_TRANSFER">Банк шилжүүлэг</option>
                    <option value="MOBILE_MONEY">Мобайл</option>
                    <option value="CHECK">Чек</option>
                  </select>
                </div>
                <div>
                  <label className={labelClass}>Огноо *</label>
                  <input type="date" value={paymentForm.date} onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))} required className={inputClass} />
                </div>
              </div>
              <div>
                <label className={labelClass}>Гарсан данс *</label>
                <select value={paymentForm.bankAccountId} onChange={e => setPaymentForm(p => ({ ...p, bankAccountId: e.target.value }))} required className={inputClass}>
                  <option value="">Данс сонгох...</option>
                  {bankAccounts.map((acc: any) => (
                    <option key={acc.id} value={acc.id}>
                      {acc.bankName} — {acc.accountNumber} ({acc.holderName})
                    </option>
                  ))}
                </select>
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
                  className="flex-1 py-3 rounded-xl text-[15px] font-semibold text-[#8E8E93] bg-[#E5E5EA]/40 transition-all active:scale-[0.97]">
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
