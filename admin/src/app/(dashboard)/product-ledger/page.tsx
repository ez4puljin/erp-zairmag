'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import api from '@/lib/api';
import { Search, Printer, ChevronDown, ChevronRight, Filter, Package } from 'lucide-react';

const UNIT_LABELS: Record<string, string> = { PIECE: 'ш', BOX: 'хайрцаг', KG: 'кг', LITER: 'л', PACK: 'баглаа' };
const fmt = (n: number) => n.toLocaleString('mn-MN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtInt = (n: number) => n.toLocaleString('mn-MN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export default function ProductLedgerPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(todayStr);
  const [productId, setProductId] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [ledgerData, setLedgerData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/api/products?limit=100').then(r => setProducts(r.data?.data || r.data)).catch((err) => { console.error('Failed to load products', err); });
    api.get('/api/categories?limit=100').then(r => setCategories(r.data?.data || r.data)).catch((err) => { console.error('Failed to load categories', err); });
  }, []);

  async function handleSearch() {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setExpandedRows(new Set());
    try {
      let url = `/api/product-ledger?dateFrom=${dateFrom}&dateTo=${dateTo}`;
      if (productId) url += `&productId=${productId}`;
      if (categoryId) url += `&categoryId=${categoryId}`;
      const res = await api.get(url);
      setLedgerData(res.data);
    } catch (err: any) {
      alert('Алдаа: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  }

  function toggleExpand(productId: string) {
    setExpandedRows(prev => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      return next;
    });
  }

  function handlePrint() {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Бараа материалын тайлан</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1C1C1E; font-size: 11px; }
        h2 { text-align: center; margin-bottom: 4px; font-size: 16px; }
        .meta { text-align: center; color: #666; margin-bottom: 12px; font-size: 11px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #999; padding: 3px 6px; }
        th { background: #eee; font-weight: 600; font-size: 10px; }
        td { font-size: 10px; }
        .text-right { text-align: right; }
        .text-center { text-align: center; }
        .bold { font-weight: bold; }
        .total-row { background: #f5f5f5; font-weight: bold; }
        .detail-row { background: #fafafa; font-style: italic; }
        .detail-row td { font-size: 9px; color: #444; }
        .footer { margin-top: 40px; font-size: 11px; }
        .footer-line { margin-bottom: 20px; }
        @media print { body { padding: 10px; } }
      </style></head><body>`);
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  }

  const inputClass = 'w-full px-3 py-2 rounded-xl bg-[#F2F2F7] text-[14px] text-[#1C1C1E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 border border-transparent focus:border-[#007AFF]/20';

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Бараа материалын тайлан</h1>
        {ledgerData && (
          <button onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-[#8E8E93] bg-[#F2F2F7] hover:bg-[#E5E5EA]">
            <Printer className="w-4 h-4" /> Хэвлэх
          </button>
        )}
      </div>

      {/* Filter form */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
        <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
          <div>
            <label className="block text-[12px] font-semibold text-[#8E8E93] mb-1">Эхний огноо *</label>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#8E8E93] mb-1">Эцсийн огноо *</label>
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#8E8E93] mb-1">Бараа материал</label>
            <select value={productId} onChange={e => setProductId(e.target.value)} className={inputClass}>
              <option value="">Бүгд (Бүх бараа)</option>
              {products.map((p: any) => (
                <option key={p.id} value={p.id}>{p.sku} - {p.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[12px] font-semibold text-[#8E8E93] mb-1">Барааны бүлэг</label>
            <select value={categoryId} onChange={e => setCategoryId(e.target.value)} className={inputClass}>
              <option value="">Бүгд (Бүх ангилал)</option>
              {categories.map((c: any) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button onClick={handleSearch} disabled={loading}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
              <Search className="w-4 h-4" />
              {loading ? 'Хайж байна...' : 'Тайлан харах'}
            </button>
          </div>
        </div>
      </div>

      {/* Report table */}
      {ledgerData && (
        <div ref={printRef}>
          {/* Print header (hidden on screen) */}
          <div className="hidden print:block text-center mb-4">
            <h2 className="text-[18px] font-bold">Бараа материалын тайлан /өртгөөр/</h2>
            <p className="text-[13px] text-[#8E8E93]">{dateFrom} ~ {dateTo}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#F2F2F7] text-[#8E8E93] text-[11px] uppercase">
                    <th className="px-2 py-2 text-left font-semibold w-8" rowSpan={2}></th>
                    <th className="px-2 py-2 text-left font-semibold" rowSpan={2}>Код</th>
                    <th className="px-2 py-2 text-left font-semibold" rowSpan={2}>Нэр</th>
                    <th className="px-1 py-2 text-center font-semibold border-l border-[#E5E5EA]" colSpan={2}>Эхний үлдэгдэл</th>
                    <th className="px-1 py-2 text-center font-semibold border-l border-[#E5E5EA]" colSpan={2}>Орлого</th>
                    <th className="px-1 py-2 text-center font-semibold border-l border-[#E5E5EA]" colSpan={2}>Зарлага</th>
                    <th className="px-1 py-2 text-center font-semibold border-l border-[#E5E5EA]" colSpan={2}>Эцсийн үлдэгдэл</th>
                    <th className="px-2 py-2 text-right font-semibold border-l border-[#E5E5EA]" rowSpan={2}>Нэгж өртөг</th>
                  </tr>
                  <tr className="bg-[#F2F2F7] text-[#8E8E93] text-[10px] uppercase">
                    <th className="px-2 py-1.5 text-right font-semibold border-l border-[#E5E5EA]">Тоо</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Дүн</th>
                    <th className="px-2 py-1.5 text-right font-semibold border-l border-[#E5E5EA]">Тоо</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Дүн</th>
                    <th className="px-2 py-1.5 text-right font-semibold border-l border-[#E5E5EA]">Тоо</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Дүн</th>
                    <th className="px-2 py-1.5 text-right font-semibold border-l border-[#E5E5EA]">Тоо</th>
                    <th className="px-2 py-1.5 text-right font-semibold">Дүн</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerData.products.map((item: any) => {
                    const isExpanded = expandedRows.has(item.product.id);
                    const hasTransactions = item.transactions && item.transactions.length > 0;
                    return (
                      <Fragment key={item.product.id}>
                        {/* Summary row */}
                        <tr
                          className={`border-b border-[#E5E5EA]/30 hover:bg-[#F2F2F7]/50 cursor-pointer transition-colors ${isExpanded ? 'bg-[#007AFF]/5' : ''}`}
                          onClick={() => hasTransactions && toggleExpand(item.product.id)}>
                          <td className="px-2 py-2 text-center">
                            {hasTransactions && (
                              isExpanded
                                ? <ChevronDown className="w-3.5 h-3.5 text-[#007AFF] inline" />
                                : <ChevronRight className="w-3.5 h-3.5 text-[#8E8E93] inline" />
                            )}
                          </td>
                          <td className="px-2 py-2 font-mono text-[#007AFF] font-semibold">{item.product.sku}</td>
                          <td className="px-2 py-2 font-medium text-[#1C1C1E]">
                            {item.product.name}
                            <span className="ml-1 text-[10px] text-[#8E8E93]">({UNIT_LABELS[item.product.unit] || item.product.unit})</span>
                          </td>
                          <td className="px-2 py-2 text-right border-l border-[#E5E5EA]/50 font-semibold">{fmtInt(item.openingQty)}</td>
                          <td className="px-2 py-2 text-right font-semibold">{fmt(item.openingAmount)}</td>
                          <td className="px-2 py-2 text-right border-l border-[#E5E5EA]/50 font-semibold text-[#34C759]">{fmtInt(item.incomeQty)}</td>
                          <td className="px-2 py-2 text-right font-semibold text-[#34C759]">{fmt(item.incomeAmount)}</td>
                          <td className="px-2 py-2 text-right border-l border-[#E5E5EA]/50 font-semibold text-[#FF3B30]">{fmtInt(item.expenseQty)}</td>
                          <td className="px-2 py-2 text-right font-semibold text-[#FF3B30]">{fmt(item.expenseAmount)}</td>
                          <td className="px-2 py-2 text-right border-l border-[#E5E5EA]/50 font-bold">{fmtInt(item.closingQty)}</td>
                          <td className="px-2 py-2 text-right font-bold">{fmt(item.closingAmount)}</td>
                          <td className="px-2 py-2 text-right border-l border-[#E5E5EA]/50 font-semibold">{fmt(item.unitCost)}</td>
                        </tr>

                        {/* Detail transaction rows */}
                        {isExpanded && item.transactions.map((tx: any, txIdx: number) => (
                          <tr key={`${item.product.id}-tx-${txIdx}`}
                            className="border-b border-[#E5E5EA]/20 bg-[#FAFAFA]">
                            <td className="px-2 py-1.5"></td>
                            <td className="px-2 py-1.5 text-[11px] text-[#8E8E93]">
                              {new Date(tx.date).toLocaleDateString('mn-MN')}
                            </td>
                            <td className="px-2 py-1.5 text-[11px] text-[#3C3C43] italic" colSpan={1}>
                              {tx.description}
                            </td>
                            <td className="px-2 py-1.5 text-right border-l border-[#E5E5EA]/30 text-[11px]"></td>
                            <td className="px-2 py-1.5 text-right text-[11px]"></td>
                            <td className="px-2 py-1.5 text-right border-l border-[#E5E5EA]/30 text-[11px] text-[#34C759]">
                              {tx.incomeQty > 0 ? fmtInt(tx.incomeQty) : ''}
                            </td>
                            <td className="px-2 py-1.5 text-right text-[11px] text-[#34C759]">
                              {tx.incomeAmount > 0 ? fmt(tx.incomeAmount) : ''}
                            </td>
                            <td className="px-2 py-1.5 text-right border-l border-[#E5E5EA]/30 text-[11px] text-[#FF3B30]">
                              {tx.expenseQty > 0 ? fmtInt(tx.expenseQty) : ''}
                            </td>
                            <td className="px-2 py-1.5 text-right text-[11px] text-[#FF3B30]">
                              {tx.expenseAmount > 0 ? fmt(tx.expenseAmount) : ''}
                            </td>
                            <td className="px-2 py-1.5 text-right border-l border-[#E5E5EA]/30 text-[11px] font-semibold">{fmtInt(tx.runningQty)}</td>
                            <td className="px-2 py-1.5 text-right text-[11px] font-semibold">{fmt(tx.runningAmount)}</td>
                            <td className="px-2 py-1.5 border-l border-[#E5E5EA]/30"></td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                </tbody>
                {/* Totals footer */}
                {ledgerData.totals && (
                  <tfoot>
                    <tr className="bg-[#F2F2F7] font-bold text-[12px]">
                      <td className="px-2 py-2.5" colSpan={3} style={{ textAlign: 'right' }}>Нийт дүн</td>
                      <td className="px-2 py-2.5 text-right border-l border-[#E5E5EA]">{fmtInt(ledgerData.totals.openingQty)}</td>
                      <td className="px-2 py-2.5 text-right">{fmt(ledgerData.totals.openingAmount)}</td>
                      <td className="px-2 py-2.5 text-right border-l border-[#E5E5EA] text-[#34C759]">{fmtInt(ledgerData.totals.incomeQty)}</td>
                      <td className="px-2 py-2.5 text-right text-[#34C759]">{fmt(ledgerData.totals.incomeAmount)}</td>
                      <td className="px-2 py-2.5 text-right border-l border-[#E5E5EA] text-[#FF3B30]">{fmtInt(ledgerData.totals.expenseQty)}</td>
                      <td className="px-2 py-2.5 text-right text-[#FF3B30]">{fmt(ledgerData.totals.expenseAmount)}</td>
                      <td className="px-2 py-2.5 text-right border-l border-[#E5E5EA]">{fmtInt(ledgerData.totals.closingQty)}</td>
                      <td className="px-2 py-2.5 text-right">{fmt(ledgerData.totals.closingAmount)}</td>
                      <td className="px-2 py-2.5 border-l border-[#E5E5EA]"></td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          {/* Print footer with signatures */}
          <div className="hidden print:block mt-8">
            <div className="flex justify-between text-[12px]">
              <p>Тайлан гаргасан: ..................................../ _____________ /</p>
              <p>Хянасан нягтлан бодогч: ..................................../ _____________ /</p>
            </div>
          </div>

          {/* On-screen signature section */}
          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5 print:hidden">
            <div className="grid grid-cols-2 gap-8 text-[13px] text-[#8E8E93]">
              <p>Тайлан гаргасан: ..................................../ _____________ /</p>
              <p>Хянасан нягтлан бодогч: ..................................../ _____________ /</p>
            </div>
          </div>
        </div>
      )}

      {/* Empty state */}
      {!ledgerData && !loading && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 py-16 text-center">
          <Package className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
          <p className="text-[17px] font-semibold text-[#1C1C1E]">Бараа материалын тайлан</p>
          <p className="text-[13px] text-[#8E8E93] mt-1">Огноо сонгоод "Тайлан харах" товч дарна уу</p>
        </div>
      )}
    </div>
  );
}
