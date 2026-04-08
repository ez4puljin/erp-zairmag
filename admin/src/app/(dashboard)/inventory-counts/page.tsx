'use client';

import { useState, useEffect, useRef } from 'react';
import api from '@/lib/api';
import { ClipboardCheck, Plus, Upload, Filter, CheckCircle, AlertTriangle, Printer, ChevronDown, ChevronUp, ArrowLeft } from 'lucide-react';

const UNIT_LABELS: Record<string, string> = { PIECE: 'ш', BOX: 'хайрцаг', KG: 'кг', LITER: 'л', PACK: 'баглаа' };
const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  DRAFT: { label: 'Ноорог', color: '#FF9500', bg: '#FFF3E0' },
  FINALIZED: { label: 'Батлагдсан', color: '#34C759', bg: '#E8F5E9' },
  CANCELLED: { label: 'Цуцлагдсан', color: '#FF3B30', bg: '#FFEBEE' },
};

export default function InventoryCountsPage() {
  const today = new Date().toISOString().split('T')[0];
  const [counts, setCounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeCount, setActiveCount] = useState<any>(null);
  const [showOnlyDiff, setShowOnlyDiff] = useState(false);
  const [saving, setSaving] = useState(false);
  const [creating, setCreating] = useState(false);
  const [newDate, setNewDate] = useState(today);
  const [newNotes, setNewNotes] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => { loadCounts(); }, []);

  async function loadCounts() {
    setLoading(true);
    try { const res = await api.get('/api/inventory-counts'); setCounts(res.data); } catch { }
    setLoading(false);
  }

  async function loadCount(id: string) {
    try {
      const res = await api.get(`/api/inventory-counts/${id}/report`);
      setActiveCount(res.data);
    } catch { }
  }

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    try {
      const res = await api.post('/api/inventory-counts', { countDate: newDate, notes: newNotes || undefined });
      const data = res.data;
      setShowCreateForm(false);
      setNewNotes('');
      await loadCounts();
      await loadCount(data.id);
    } catch (err: any) { alert('Алдаа: ' + (err.response?.data?.message || err.message)); }
    setCreating(false);
  }

  function handleCountedChange(productId: string, value: string) {
    if (!activeCount) return;
    const items = activeCount.items.map((item: any) => {
      if (item.productId === productId) {
        const counted = value === '' ? null : parseInt(value);
        return { ...item, countedQty: counted, difference: counted !== null ? counted - item.systemQty : 0 };
      }
      return item;
    });
    setActiveCount({ ...activeCount, items });
  }

  async function handleSave() {
    if (!activeCount) return;
    setSaving(true);
    try {
      const changedItems = activeCount.items
        .filter((i: any) => i.countedQty !== null)
        .map((i: any) => ({ productId: i.productId, countedQty: i.countedQty }));
      await api.patch(`/api/inventory-counts/${activeCount.id}/items`, { items: changedItems });
      await loadCount(activeCount.id);
    } catch (err: any) { alert('Алдаа: ' + (err.response?.data?.message || err.message)); }
    setSaving(false);
  }

  async function handleFinalize() {
    if (!activeCount) return;
    // Check all items have been counted
    const uncounted = activeCount.items.filter((i: any) => i.countedQty === null || i.countedQty === undefined || i.countedQty === '');
    if (uncounted.length > 0) {
      alert(`${uncounted.length} бараа тоологдоогүй байна. Бүх барааны тоолсон тоог оруулна уу.`);
      return;
    }
    if (!confirm('Тооллого батлах уу? Агуулахын үлдэгдэл тоолсон тоогоор тохируулагдана.')) return;
    setSaving(true);
    try {
      // Auto-save before finalizing
      const changedItems = activeCount.items
        .filter((i: any) => i.countedQty !== null)
        .map((i: any) => ({ productId: i.productId, countedQty: i.countedQty }));
      await api.patch(`/api/inventory-counts/${activeCount.id}/items`, { items: changedItems });
      await api.post(`/api/inventory-counts/${activeCount.id}/finalize`);
      await loadCount(activeCount.id);
      await loadCounts();
    } catch (err: any) { alert('Алдаа: ' + (err.response?.data?.message || err.message)); }
    setSaving(false);
  }

  function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file || !activeCount) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const text = ev.target?.result as string;
      const lines = text.split('\n').map(l => l.trim()).filter(l => l);
      // Format: barcode, count (or barcode\tcount or barcode count)
      const barcodeMap = new Map<string, number>();
      for (const line of lines) {
        const parts = line.split(/[,\t\s]+/);
        if (parts.length < 2) continue;
        const barcode = parts[0].trim();
        const count = parseInt(parts[1].trim());
        if (isNaN(count)) continue;
        barcodeMap.set(barcode, (barcodeMap.get(barcode) || 0) + count);
      }

      // Match barcodes to product SKUs
      const items = activeCount.items.map((item: any) => {
        const sku = item.product?.sku;
        if (sku && barcodeMap.has(sku)) {
          const counted = barcodeMap.get(sku)!;
          return { ...item, countedQty: counted, difference: counted - item.systemQty };
        }
        return item;
      });
      setActiveCount({ ...activeCount, items });
    };
    reader.readAsText(file);
    e.target.value = '';
  }

  function handlePrint() {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Тооллогын тайлан #${activeCount?.countNumber}</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 30px; color: #1C1C1E; font-size: 13px; }
        h2 { text-align: center; margin-bottom: 4px; }
        .meta { text-align: center; color: #666; margin-bottom: 16px; }
        table { width: 100%; border-collapse: collapse; }
        th, td { border: 1px solid #ccc; padding: 5px 8px; }
        th { background: #f5f5f5; font-weight: 600; }
        .diff-pos { color: #34C759; } .diff-neg { color: #FF3B30; }
        .footer { margin-top: 30px; }
        @media print { body { padding: 15px; } }
      </style></head><body>`);
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#F2F2F7] text-[15px] text-[#1C1C1E] outline-none focus:ring-2 focus:ring-[#007AFF]/30';

  // Filter items
  const displayItems = activeCount?.items?.filter((i: any) =>
    showOnlyDiff ? i.difference !== 0 && i.countedQty !== null : true
  ) || [];

  const summary = activeCount?.summary;

  if (activeCount) {
    return (
      <div className="space-y-5 animate-ios-fade-in">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button onClick={() => { setActiveCount(null); loadCounts(); }} className="p-2 rounded-xl hover:bg-[#F2F2F7]">
              <ArrowLeft className="w-5 h-5 text-[#007AFF]" />
            </button>
            <div>
              <h1 className="text-[24px] font-bold text-[#1C1C1E]">Тооллого #{activeCount.countNumber}</h1>
              <p className="text-[13px] text-[#8E8E93]">
                {new Date(activeCount.countDate).toLocaleDateString('mn-MN')} ·
                <span className="ml-1 px-2 py-0.5 rounded-full text-[11px] font-semibold"
                  style={{ color: STATUS_CONFIG[activeCount.status]?.color, backgroundColor: STATUS_CONFIG[activeCount.status]?.bg }}>
                  {STATUS_CONFIG[activeCount.status]?.label}
                </span>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {activeCount.status === 'DRAFT' && (
              <>
                <input type="file" ref={fileInputRef} accept=".txt,.csv" onChange={handleFileUpload} className="hidden" />
                <button onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20">
                  <Upload className="w-4 h-4" /> .txt оруулах
                </button>
                <button onClick={handleSave} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
                  {saving ? 'Хадгалж байна...' : 'Хадгалах'}
                </button>
                <button onClick={handleFinalize} disabled={saving}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}>
                  <CheckCircle className="w-4 h-4" /> Гүйлгээ хийх
                </button>
              </>
            )}
            <button onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-[#8E8E93] bg-[#F2F2F7] hover:bg-[#E5E5EA]">
              <Printer className="w-4 h-4" /> Хэвлэх
            </button>
          </div>
        </div>

        {/* Summary cards */}
        {summary && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-[#E5E5EA]/50 p-3">
              <p className="text-[11px] text-[#8E8E93]">Нийт бараа</p>
              <p className="text-[20px] font-bold text-[#1C1C1E]">{summary.totalItems}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E5EA]/50 p-3">
              <p className="text-[11px] text-[#8E8E93]">Тоолсон</p>
              <p className="text-[20px] font-bold text-[#007AFF]">{summary.countedItems}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E5EA]/50 p-3">
              <p className="text-[11px] text-[#8E8E93]">Зөрүүтэй</p>
              <p className="text-[20px] font-bold text-[#FF9500]">{summary.discrepancyCount}</p>
            </div>
            <div className="bg-white rounded-xl border border-[#E5E5EA]/50 p-3">
              <p className="text-[11px] text-[#8E8E93]">Илүүдэл</p>
              <p className="text-[20px] font-bold text-[#34C759]">+{summary.totalGain}</p>
              {summary.totalGainAmount > 0 && <p className="text-[12px] text-[#34C759]">+{Number(summary.totalGainAmount).toLocaleString('mn-MN')}₮</p>}
            </div>
            <div className="bg-white rounded-xl border border-[#E5E5EA]/50 p-3">
              <p className="text-[11px] text-[#8E8E93]">Дутагдал</p>
              <p className="text-[20px] font-bold text-[#FF3B30]">{summary.totalLoss}</p>
              {summary.totalLossAmount > 0 && <p className="text-[12px] text-[#FF3B30]">-{Number(summary.totalLossAmount).toLocaleString('mn-MN')}₮</p>}
            </div>
          </div>
        )}

        {/* Filter toggle */}
        <div className="flex items-center gap-3">
          <button onClick={() => setShowOnlyDiff(!showOnlyDiff)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold transition-all ${showOnlyDiff ? 'bg-[#FF9500] text-white' : 'bg-[#F2F2F7] text-[#8E8E93]'}`}>
            <Filter className="w-4 h-4" /> {showOnlyDiff ? 'Зөрүүтэй бараа' : 'Бүх бараа'}
          </button>
          <span className="text-[13px] text-[#8E8E93]">{displayItems.length} бараа</span>
        </div>

        {/* Count table */}
        <div ref={printRef}>
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
            <div className="hidden print:block text-center mb-4 p-4">
              <h2 className="text-[18px] font-bold">Тооллогын тайлан #{activeCount.countNumber}</h2>
              <p className="text-[13px] text-[#8E8E93]">{new Date(activeCount.countDate).toLocaleDateString('mn-MN')}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-[13px]">
                <thead>
                  <tr className="bg-[#F2F2F7] text-[#8E8E93] text-[12px] uppercase">
                    <th className="px-3 py-2.5 text-left font-semibold w-8">#</th>
                    <th className="px-3 py-2.5 text-left font-semibold">SKU</th>
                    <th className="px-3 py-2.5 text-left font-semibold">Бараа</th>
                    <th className="px-3 py-2.5 text-left font-semibold w-16">Нэгж</th>
                    <th className="px-3 py-2.5 text-right font-semibold w-24">Нэгж үнэ</th>
                    <th className="px-3 py-2.5 text-right font-semibold w-24">Системийн</th>
                    <th className="px-3 py-2.5 text-right font-semibold w-28">Тоолсон</th>
                    <th className="px-3 py-2.5 text-right font-semibold w-20">Зөрүү</th>
                    <th className="px-3 py-2.5 text-right font-semibold w-28">Зөрүүний дүн</th>
                  </tr>
                </thead>
                <tbody>
                  {displayItems.map((item: any, idx: number) => {
                    const diff = item.countedQty !== null ? item.countedQty - item.systemQty : null;
                    const hasDiff = diff !== null && diff !== 0;
                    const unitPrice = Number(item.product?.sellingPrice || 0);
                    const diffAmount = diff !== null ? diff * unitPrice : null;
                    return (
                      <tr key={item.id} className={`border-b border-[#E5E5EA]/30 ${hasDiff ? (diff! > 0 ? 'bg-[#34C759]/5' : 'bg-[#FF3B30]/5') : ''}`}>
                        <td className="px-3 py-2 text-[#8E8E93]">{idx + 1}</td>
                        <td className="px-3 py-2 font-mono text-[#8E8E93]">{item.product?.sku}</td>
                        <td className="px-3 py-2 font-medium text-[#1C1C1E]">{item.product?.name}</td>
                        <td className="px-3 py-2 text-[#8E8E93]">{UNIT_LABELS[item.product?.unit] || item.product?.unit}</td>
                        <td className="px-3 py-2 text-right text-[#1C1C1E]">{unitPrice.toLocaleString('mn-MN')}₮</td>
                        <td className="px-3 py-2 text-right font-semibold">{item.systemQty}</td>
                        <td className="px-3 py-2 text-right">
                          {activeCount.status === 'DRAFT' ? (
                            <input
                              type="number"
                              min="0"
                              value={item.countedQty ?? ''}
                              onChange={e => handleCountedChange(item.productId, e.target.value)}
                              placeholder="-"
                              className="w-20 px-2 py-1 rounded-lg bg-[#F2F2F7] text-right text-[13px] outline-none focus:ring-2 focus:ring-[#007AFF]/30"
                            />
                          ) : (
                            <span className="font-semibold">{item.countedQty ?? '-'}</span>
                          )}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold ${diff !== null && diff > 0 ? 'text-[#34C759]' : diff !== null && diff < 0 ? 'text-[#FF3B30]' : 'text-[#8E8E93]'}`}>
                          {diff !== null ? (diff > 0 ? `+${diff}` : diff) : '-'}
                        </td>
                        <td className={`px-3 py-2 text-right font-bold ${diffAmount !== null && diffAmount > 0 ? 'text-[#34C759]' : diffAmount !== null && diffAmount < 0 ? 'text-[#FF3B30]' : 'text-[#8E8E93]'}`}>
                          {diffAmount !== null && diffAmount !== 0 ? `${diffAmount > 0 ? '+' : ''}${diffAmount.toLocaleString('mn-MN')}₮` : '-'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-[#F2F2F7] font-bold text-[13px]">
                    <td colSpan={7} className="px-3 py-2.5 text-right text-[#1C1C1E]">Нийт зөрүүний дүн:</td>
                    <td className="px-3 py-2.5 text-right text-[#1C1C1E]">
                      {(() => {
                        const totalDiff = displayItems.reduce((sum: number, item: any) => {
                          const d = item.countedQty !== null ? item.countedQty - item.systemQty : 0;
                          return sum + d;
                        }, 0);
                        return totalDiff > 0 ? <span className="text-[#34C759]">+{totalDiff}</span> : totalDiff < 0 ? <span className="text-[#FF3B30]">{totalDiff}</span> : '-';
                      })()}
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {(() => {
                        const totalAmount = displayItems.reduce((sum: number, item: any) => {
                          const d = item.countedQty !== null ? item.countedQty - item.systemQty : 0;
                          const price = Number(item.product?.sellingPrice || 0);
                          return sum + d * price;
                        }, 0);
                        return totalAmount > 0
                          ? <span className="text-[#34C759]">+{totalAmount.toLocaleString('mn-MN')}₮</span>
                          : totalAmount < 0
                          ? <span className="text-[#FF3B30]">{totalAmount.toLocaleString('mn-MN')}₮</span>
                          : '-';
                      })()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
            {activeCount.notes && (
              <div className="px-4 py-3 border-t border-[#E5E5EA]/50 text-[13px] text-[#8E8E93]">
                Тэмдэглэл: {activeCount.notes}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // History list view
  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Тооллого</h1>
        <button onClick={() => setShowCreateForm(!showCreateForm)}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
          <Plus className="w-4 h-4" /> Шинэ тооллого
        </button>
      </div>

      {/* Create form */}
      {showCreateForm && (
        <form onSubmit={handleCreate} className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] mb-1">Тооллогын огноо *</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)} required className={inputClass} />
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8E8E93] mb-1">Тэмдэглэл</label>
              <input value={newNotes} onChange={e => setNewNotes(e.target.value)} placeholder="Нэмэлт тайлбар..." className={inputClass} />
            </div>
            <div className="flex items-end gap-2">
              <button type="submit" disabled={creating}
                className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
                {creating ? 'Үүсгэж байна...' : 'Тооллого эхлүүлэх'}
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)}
                className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-[#8E8E93] bg-[#F2F2F7]">
                Болих
              </button>
            </div>
          </div>
        </form>
      )}

      {/* History */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        {loading ? (
          <div className="py-12 text-center text-[#8E8E93]">Ачааллаж байна...</div>
        ) : counts.length === 0 ? (
          <div className="py-16 text-center">
            <ClipboardCheck className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-[#1C1C1E]">Тооллого байхгүй</p>
            <p className="text-[13px] text-[#8E8E93] mt-1">Шинэ тооллого эхлүүлэх товч дарна уу</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5EA]/50">
            {counts.map((c: any) => {
              const st = STATUS_CONFIG[c.status] || STATUS_CONFIG.DRAFT;
              return (
                <button key={c.id} onClick={() => loadCount(c.id)}
                  className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-[#F2F2F7]/50 transition-colors text-left">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: st.bg }}>
                    <ClipboardCheck className="w-5 h-5" style={{ color: st.color }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[15px] font-semibold text-[#1C1C1E]">Тооллого #{c.countNumber}</span>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-semibold" style={{ color: st.color, backgroundColor: st.bg }}>
                        {st.label}
                      </span>
                    </div>
                    <p className="text-[13px] text-[#8E8E93]">
                      {new Date(c.countDate).toLocaleDateString('mn-MN')} · {c._count?.items} бараа · {c.createdBy?.firstName} {c.createdBy?.lastName}
                    </p>
                  </div>
                  <ChevronDown className="w-4 h-4 text-[#C7C7CC] shrink-0 rotate-[-90deg]" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
