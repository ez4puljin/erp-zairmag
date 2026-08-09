'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import api from '@/lib/api';
import { PackagePlus, Plus, ChevronDown, ChevronUp, Search, X, Printer } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';
import { SearchableSelect } from '@/components/shared/searchable-select';

const UNIT_LABELS: Record<string, string> = { PIECE: 'ширхэг', BOX: 'хайрцаг', KG: 'кг', LITER: 'литр', PACK: 'баглаа' };

export default function PurchaseReceiptsPage() {
  const [receipts, setReceipts] = useState<any[]>([]);
  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [supplierId, setSupplierId] = useState('');
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [formItems, setFormItems] = useState<{ productId: string; name: string; barcode: string; quantity: number; unitPrice: number }[]>([]);

  // Product search
  const [productSearch, setProductSearch] = useState('');
  const [showProductDropdown, setShowProductDropdown] = useState(false);
  const [highlightIdx, setHighlightIdx] = useState(0);
  const searchRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => { load(); }, []);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowProductDropdown(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  async function load() {
    setLoading(true);
    try {
      const [rRes, sRes, pRes] = await Promise.all([
        api.get('/api/purchase-receipts'),
        api.get('/api/suppliers?limit=100'),
        api.get('/api/products?limit=100'),
      ]);
      setReceipts(Array.isArray(rRes.data) ? rRes.data : rRes.data?.data ?? []);
      setSuppliers(Array.isArray(sRes.data) ? sRes.data : sRes.data?.data ?? []);
      setProducts(Array.isArray(pRes.data) ? pRes.data : pRes.data?.data ?? []);
    } catch { }
    setLoading(false);
  }

  // Filtered products by search (name or barcode)
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return products.slice(0, 20);
    const q = productSearch.toLowerCase();
    return products.filter((p: any) =>
      (p.name ?? '').toLowerCase().includes(q) || (p.sku ?? '').toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  // Add product to form
  function addProduct(product: any) {
    const existing = formItems.find(fi => fi.productId === product.id);
    if (existing) {
      setFormItems(prev => prev.map(fi => fi.productId === product.id ? { ...fi, quantity: fi.quantity + 1 } : fi));
    } else {
      setFormItems(prev => [...prev, {
        productId: product.id,
        name: product.name,
        barcode: product.sku ?? '',
        quantity: 1,
        unitPrice: Number(product.costPrice ?? 0),
      }]);
    }
    setProductSearch('');
    setShowProductDropdown(false);
  }

  function updateFormItem(idx: number, field: string, value: number) {
    setFormItems(prev => prev.map((fi, i) => i === idx ? { ...fi, [field]: value } : fi));
  }

  function removeFormItem(idx: number) {
    setFormItems(prev => prev.filter((_, i) => i !== idx));
  }

  const grandTotal = formItems.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const totalAmount = receipts.reduce((s, r) => s + Number(r.totalAmount ?? 0), 0);
  const totalLines = receipts.reduce((s, r) => s + (r.items?.length ?? 0), 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!supplierId || formItems.length === 0) {
      alert('Нийлүүлэгч болон бараа сонгоно уу.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/purchase-receipts', {
        supplierId,
        receivedAt: new Date(receivedDate).toISOString(),
        notes: notes || undefined,
        items: formItems.map(i => ({ productId: i.productId, quantity: i.quantity, unitPrice: i.unitPrice })),
      });
      setShowForm(false);
      resetForm();
      await load();
    } catch (err: any) {
      alert(err.response?.data?.message ?? 'Алдаа гарлаа');
    }
    setSubmitting(false);
  }

  function resetForm() {
    setSupplierId('');
    setReceivedDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setFormItems([]);
    setProductSearch('');
  }

  // Print receipt
  function printReceipt(receipt: any) {
    const supplierName = receipt.supplier?.name ?? '-';
    const date = new Date(receipt.receivedAt).toLocaleDateString('mn-MN');
    const items = receipt.items ?? [];
    const total = Number(receipt.totalAmount ?? 0);

    let content = `====================================
      ОРЛОГЫН БАРИМТ
====================================
Баримт №: ${receipt.receiptNumber}
Нийлүүлэгч: ${supplierName}
Огноо: ${date}
------------------------------------
БАРАА              Тоо    Үнэ     Нийт`;

    for (const item of items) {
      const name = (item.product?.name ?? '').substring(0, 18).padEnd(18);
      const qty = String(item.quantity).padStart(4);
      const price = String(Number(item.unitPrice).toLocaleString()).padStart(8);
      const lineTotal = String(Number(item.lineTotal).toLocaleString()).padStart(8);
      content += `\n${name} ${qty} ${price} ${lineTotal}`;
    }

    content += `\n------------------------------------
НИЙТ ДҮН:                    ₮${total.toLocaleString()}
------------------------------------
${receipt.notes ? 'Тэмдэглэл: ' + receipt.notes : ''}

Хүлээн авсан: ___________________

Хүлээлгэн өгсөн: ___________________
====================================`;

    const win = window.open('', '_blank', 'width=400,height=600');
    if (!win) { alert('Popup хаалттай байна.'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Орлого №${receipt.receiptNumber}</title>
    <style>body{font-family:monospace;font-size:12px;margin:0;padding:8px;}pre{margin:0;white-space:pre-wrap;}
    @media print{body{margin:0;padding:4px;}}</style></head><body>
    <pre>${content}</pre>
    <script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script>
    </body></html>`);
    win.document.close();
  }

  const inputClass = 'w-full px-3 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-[#1A1D26] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 transition-all';
  const labelClass = 'block text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wide mb-1.5';

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Нийлүүлэгчээс орлого"
        subtitle="Нийлүүлэгчээс хүлээн авсан барааны орлогын баримт"
        icon={PackagePlus}
        iconColor="#10B981"
        actions={
          <ActionButton
            onClick={() => { setShowForm(!showForm); if (showForm) resetForm(); }}
            variant={showForm ? 'ghost' : 'primary'}
          >
            {showForm ? <X className="w-4 h-4" /> : <Plus className="w-4 h-4" />}
            {showForm ? 'Хаах' : 'Шинэ орлого'}
          </ActionButton>
        }
      />

      {/* KPI */}
      <StatGrid cols={3}>
        <StatCard label="Нийт баримт" value={receipts.length} gradient="green" index={0} />
        <StatCard label="Барааны мөр" value={totalLines} gradient="teal" index={1} />
        <StatCard label="Нийт дүн" value={formatMnt(totalAmount)} gradient="blue" index={2} />
      </StatGrid>

      {/* Create Form */}
      {showForm && (
        <SectionCard title="Шинэ орлого бүртгэх">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className={labelClass}>Нийлүүлэгч *</label>
                <SearchableSelect
                  value={supplierId}
                  onChange={setSupplierId}
                  options={suppliers.map((s: any) => ({ value: s.id, label: s.name }))}
                  required
                  inputClassName={inputClass}
                  widthClass="w-full"
                  aria-label="Нийлүүлэгч"
                />
              </div>
              <div>
                <label className={labelClass}>Огноо *</label>
                <input type="date" value={receivedDate} onChange={e => setReceivedDate(e.target.value)} required className={inputClass} />
              </div>
              <div>
                <label className={labelClass}>Тэмдэглэл</label>
                <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Нэмэлт тайлбар..." className={inputClass} />
              </div>
            </div>

            {/* Product Search */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-[11px] font-bold text-[#8C8FA3] uppercase tracking-wide">
                  Бараа нэмэх
                  {formItems.length > 0 && <span className="ml-2 text-[#007AFF]">{formItems.length} бараа</span>}
                </label>
              </div>
              <div ref={searchRef} className="relative mb-3">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8FA3]" />
                <input
                  type="text"
                  value={productSearch}
                  onChange={(e) => { setProductSearch(e.target.value); setShowProductDropdown(true); setHighlightIdx(0); }}
                  onFocus={() => { setShowProductDropdown(true); setHighlightIdx(0); }}
                  onKeyDown={(e) => {
                    if (!showProductDropdown || filteredProducts.length === 0) return;
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      setHighlightIdx(prev => Math.min(prev + 1, filteredProducts.length - 1));
                      // scroll into view
                      setTimeout(() => dropdownRef.current?.querySelector('[data-highlight="true"]')?.scrollIntoView({ block: 'nearest' }), 0);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      setHighlightIdx(prev => Math.max(prev - 1, 0));
                      setTimeout(() => dropdownRef.current?.querySelector('[data-highlight="true"]')?.scrollIntoView({ block: 'nearest' }), 0);
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      if (filteredProducts[highlightIdx]) addProduct(filteredProducts[highlightIdx]);
                    } else if (e.key === 'Escape') {
                      setShowProductDropdown(false);
                    }
                  }}
                  placeholder="Бараа нэр эсвэл баркод хайх..."
                  className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-[#1A1D26] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
                />
                {showProductDropdown && filteredProducts.length > 0 && (
                  <div ref={dropdownRef} className="absolute z-20 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#E8ECF0] shadow-lg max-h-[250px] overflow-y-auto">
                    {filteredProducts.map((p: any, idx: number) => (
                      <button
                        key={p.id}
                        type="button"
                        data-highlight={idx === highlightIdx}
                        onClick={() => addProduct(p)}
                        onMouseEnter={() => setHighlightIdx(idx)}
                        className={`w-full text-left px-4 py-2.5 border-b border-[#F2F4F7] last:border-0 transition-colors ${idx === highlightIdx ? 'bg-[#007AFF]/10' : 'hover:bg-[#F5F6FA]'}`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <span className="text-[13px] font-semibold text-[#1A1D26]">{p.name}</span>
                            <span className="ml-2 text-[11px] text-[#8C8FA3] bg-[#F5F6FA] px-1.5 py-0.5 rounded">{p.sku}</span>
                          </div>
                          <span className="text-[11px] text-[#8C8FA3]">Нөөц: {p.stockAvailable ?? 0}</span>
                        </div>
                      </button>
                    ))}
                    {filteredProducts.length === 0 && (
                      <div className="px-4 py-3 text-[13px] text-[#8C8FA3] text-center">Олдсонгүй</div>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Added Items */}
            {formItems.length > 0 && (
              <div className="space-y-2">
                {formItems.map((item, idx) => (
                  <div key={item.productId} className="flex items-center gap-3 p-3 rounded-xl bg-[#F9FAFB] border border-[#E8ECF0]">
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-[#1A1D26] truncate">{item.name}</p>
                      <p className="text-[10px] text-[#8C8FA3]">Баркод: {item.barcode}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-center">
                        <label className="text-[9px] text-[#8C8FA3] block">Тоо</label>
                        <input
                          type="number" min={1} value={item.quantity}
                          onChange={e => updateFormItem(idx, 'quantity', Math.max(1, +e.target.value))}
                          className="w-16 px-2 py-1.5 rounded-lg bg-white border border-[#E8ECF0] text-[13px] text-center font-bold text-[#1A1D26] outline-none focus:border-[#007AFF]"
                        />
                      </div>
                      <div className="text-center">
                        <label className="text-[9px] text-[#8C8FA3] block">Нэгж үнэ</label>
                        <input
                          type="number" min={0} value={item.unitPrice}
                          onChange={e => updateFormItem(idx, 'unitPrice', Math.max(0, +e.target.value))}
                          className="w-24 px-2 py-1.5 rounded-lg bg-white border border-[#E8ECF0] text-[13px] text-center font-bold text-[#1A1D26] outline-none focus:border-[#007AFF]"
                        />
                      </div>
                      <div className="text-right w-24">
                        <label className="text-[9px] text-[#8C8FA3] block">Нийт</label>
                        <p className="text-[13px] font-bold text-[#1A1D26] tabular-nums">{formatMnt(item.quantity * item.unitPrice)}</p>
                      </div>
                      <button type="button" onClick={() => removeFormItem(idx)} className="p-1.5 rounded-lg hover:bg-[#FF3B30]/10 text-[#FF3B30]">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Grand total */}
                <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#007AFF]/[0.06] border border-[#007AFF]/20">
                  <span className="text-[13px] font-bold text-[#1A1D26]">Нийт дүн:</span>
                  <span className="text-[18px] font-bold text-[#007AFF] tabular-nums">{formatMnt(grandTotal)}</span>
                </div>
              </div>
            )}

            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => { setShowForm(false); resetForm(); }} className="px-5 py-2.5 rounded-xl bg-[#F5F6FA] text-[#8C8FA3] font-semibold text-[13px] hover:bg-[#F2F4F7] transition-colors">Болих</button>
              <button type="submit" disabled={submitting || formItems.length === 0} className="px-5 py-2.5 rounded-xl bg-[#10B981] text-white font-semibold text-[13px] disabled:opacity-50 hover:bg-[#059669] transition-colors">
                {submitting ? 'Хадгалж байна...' : 'Орлого бүртгэх'}
              </button>
            </div>
          </form>
        </SectionCard>
      )}

      {/* Receipts List */}
      <SectionCard title="Орлогын баримтууд" noPadding>
        {loading ? (
          <div className="p-8 text-center text-[#8C8FA3]">Ачааллаж байна...</div>
        ) : receipts.length === 0 ? (
          <EmptyState icon={PackagePlus} title="Орлого бүртгэл байхгүй" hint="Шинэ орлого бүртгэхийн тулд дээрх “Шинэ орлого” товчийг дарна уу" />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {receipts.map((r: any) => (
              <div key={r.id}>
                <div className="flex items-center gap-3 px-4 lg:px-5 py-3.5">
                  <button
                    onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                    className="flex items-center gap-3 flex-1 min-w-0 text-left"
                  >
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0 bg-[#ECFDF5]">
                      <PackagePlus className="w-5 h-5 text-[#10B981]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-[14px] font-bold text-[#007AFF]">#{r.receiptNumber}</span>
                        <span className="text-[12px] text-[#8C8FA3] truncate">{r.supplier?.name}</span>
                      </div>
                      <p className="text-[12px] text-[#8C8FA3]">
                        {new Date(r.receivedAt).toLocaleDateString('mn-MN')} · {r.items?.length} бараа
                      </p>
                    </div>
                    <span className="text-[15px] font-bold text-[#1A1D26] tabular-nums shrink-0">{formatMnt(r.totalAmount)}</span>
                    {expanded === r.id ? <ChevronUp className="w-4 h-4 text-[#8C8FA3]" /> : <ChevronDown className="w-4 h-4 text-[#8C8FA3]" />}
                  </button>
                  <button
                    onClick={() => printReceipt(r)}
                    className="p-2 rounded-lg hover:bg-[#F2F4F7] text-[#8C8FA3] hover:text-[#007AFF] transition-colors shrink-0"
                    title="Баримт хэвлэх"
                  >
                    <Printer className="w-4 h-4" />
                  </button>
                </div>
                {expanded === r.id && r.items && (
                  <div className="px-4 lg:px-5 pb-3 bg-[#F9FAFB]">
                    <table className="w-full text-[12px]">
                      <thead>
                        <tr className="text-[#8C8FA3] border-b border-[#E8ECF0]">
                          <th className="pb-1.5 text-left font-medium">Бараа</th>
                          <th className="pb-1.5 text-left font-medium">Баркод</th>
                          <th className="pb-1.5 text-right font-medium">Тоо</th>
                          <th className="pb-1.5 text-right font-medium">Нэгж үнэ</th>
                          <th className="pb-1.5 text-right font-medium">Нийт</th>
                        </tr>
                      </thead>
                      <tbody>
                        {r.items.map((i: any) => (
                          <tr key={i.id} className="border-b border-[#F2F4F7] last:border-0">
                            <td className="py-1.5 text-[#1A1D26] font-medium">{i.product?.name}</td>
                            <td className="py-1.5 text-[#8C8FA3]">{i.product?.sku ?? '-'}</td>
                            <td className="py-1.5 text-right text-[#4A4D5C]">{i.quantity} {UNIT_LABELS[i.product?.unit] || ''}</td>
                            <td className="py-1.5 text-right text-[#4A4D5C] tabular-nums">{formatMnt(i.unitPrice)}</td>
                            <td className="py-1.5 text-right font-bold text-[#1A1D26] tabular-nums">{formatMnt(i.lineTotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                    {r.notes && <p className="text-[11px] text-[#8C8FA3] mt-2">Тэмдэглэл: {r.notes}</p>}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
