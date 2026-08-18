'use client';

import { useState, useEffect, Fragment } from 'react';
import { useParams, useRouter } from 'next/navigation';
import api from '@/lib/api';
import { primaryBarcode, matchesSearch, hasBarcode } from '@/lib/barcode';
import {
  ChevronLeft, Truck, Package, User, Calendar, Phone,
  Clock, RefreshCw, Send, CheckCircle, Ban, ChevronDown,
  ChevronUp, ShoppingCart, CreditCard, FileText, Hash,
  AlertTriangle, CornerDownLeft, Printer, Plus, X, PackagePlus, History,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard } from '@/components/shared/stat-card';
import { formatMnt, formatWeight, formatQty } from '@/components/shared/money';
import { SearchableSelect } from '@/components/shared/searchable-select';
import { MoneyInput } from '@/components/shared/money-input';
import { useAuth } from '@/hooks/use-auth';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string }> = {
  LOADING:              { label: 'Ачиж байна',          color: '#007AFF', bg: '#EAF2FF' },
  DISPATCHED:           { label: 'Илгээсэн',            color: '#FF9500', bg: '#FFF4E6' },
  COMPLETION_REQUESTED: { label: 'Дуусгах хүсэлт',      color: '#FF3B30', bg: '#FFECEA' },
  COMPLETED:            { label: 'Дууссан',             color: '#34C759', bg: '#E9F9EF' },
  CANCELLED:            { label: 'Цуцлагдсан',          color: '#8C8FA3', bg: '#F2F4F7' },
};

const PAYMENT_LABELS: Record<string, string> = {
  CASH: 'Бэлэн', BANK_TRANSFER: 'Шилжүүлэг', CARD: 'Карт',
  MOBILE_MONEY: 'Мобайл', CHECK: 'Чек', CREDIT: 'Дараа тооцоо', COMBINED: 'Хосолсон',
};

const inputClass =
  'w-full px-4 py-3 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[15px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white';

// ====================== PRINT HELPERS ======================
function printReceipt(title: string, content: string) {
  const win = window.open('', '_blank', 'width=400,height=700');
  if (!win) { alert('Popup хаалттай байна. Зөвшөөрнө үү.'); return; }
  win.document.write(`<!DOCTYPE html><html><head><title>${title}</title>
  <style>
    body { font-family: monospace; font-size: 12px; line-height: 1.5; margin: 0; padding: 8px; color: #000; }
    pre { margin: 0; white-space: pre-wrap; }
    .page-break { page-break-after: always; }
    @media print { body { margin: 0; padding: 4px; } }
  </style></head><body>
  <pre>${content}</pre>
  <script>window.onload=function(){window.print();setTimeout(function(){window.close()},500)}<\/script>
  </body></html>`);
  win.document.close();
}

/**
 * Түгээлтийн борлуулалтын баримтыг нөхөж хэвлэнэ.
 *
 * Ачилтын хүлээлцэх баримттай ижил монospace хэлбэрийг ашиглав —
 * дулааны принтерт зориулсан 32 тэмдэгтийн өргөнтэй.
 */
function buildSaleReceipt(sale: any, load: any, copyLabel: string) {
  const driverName = `${load?.driver?.lastName ?? ''} ${load?.driver?.firstName ?? ''}`.trim();
  const date = sale.createdAt ? new Date(sale.createdAt).toLocaleString('mn-MN') : '';
  const items = sale.items ?? [];

  let lines = `====================================
      ЗАЙРМАГ ТҮГЭЭЛТ
     БОРЛУУЛАЛТЫН БАРИМТ
       ${copyLabel}
====================================
Баримт №: ${sale.saleNumber}
Огноо:   ${date}
Ачилт №: ${load?.loadNumber ?? '-'}
Жолооч:  ${driverName}
------------------------------------
ХАРИЛЦАГЧ
  ${sale.customer?.storeName ?? '-'}
  ${sale.customer?.phone ?? ''}
------------------------------------
БАРАА                    Тоо    Дүн`;

  for (const it of items) {
    const name = (it.product?.name ?? '').substring(0, 22).padEnd(22);
    const qty = String(it.quantity ?? 0).padStart(5);
    const total = Number(it.lineTotal ?? 0).toLocaleString().padStart(8);
    lines += `
${name}${qty}${total}`;
  }

  lines += `
------------------------------------
НИЙТ ДҮН: ${Number(sale.totalAmount ?? 0).toLocaleString()}₮
Төлбөр: ${PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
====================================
       Баярлалаа!
====================================`;

  return lines;
}

function buildHandoverReceipt(load: any, type: 'dispatch' | 'additional' | 'return', copyLabel: string) {
  const driverName = `${load.driver?.lastName ?? ''} ${load.driver?.firstName ?? ''}`.trim();
  const date = new Date().toLocaleString('mn-MN');
  const items = load.items || [];

  const typeLabels: Record<string, string> = {
    dispatch: 'АЧИЛТ ХҮЛЭЭЛЦСЭН БАРИМТ',
    additional: 'НЭМЭЛТ АЧИЛТ БАРИМТ',
    return: 'БУЦААЛТ ХҮЛЭЭЛЦСЭН БАРИМТ',
  };

  let lines = `====================================
      ЗАЙРМАГ ТҮГЭЭЛТ
    ${typeLabels[type]}
       ${copyLabel}
====================================
Ачилт №: ${load.loadNumber}
Жолооч:  ${driverName}
Утас:    ${load.driver?.phone ?? '-'}
Огноо:   ${date}
------------------------------------`;

  if (type === 'return') {
    lines += `\nБАРАА          Ачсан Зарсн Буцсн Гэм`;
    for (const item of items) {
      const name = (item.product?.name ?? '').substring(0, 14).padEnd(14);
      const loaded = String(item.loadedQty ?? 0).padStart(5);
      const sold = String(item.soldQty ?? 0).padStart(5);
      const returned = String(item.returnedQty ?? 0).padStart(5);
      const damaged = String(item.damagedQty ?? 0).padStart(4);
      lines += `\n${name} ${loaded} ${sold} ${returned} ${damaged}`;
    }
    const totalLoaded = items.reduce((s: number, i: any) => s + (i.loadedQty || 0), 0);
    const totalSold = items.reduce((s: number, i: any) => s + (i.soldQty || 0), 0);
    const totalReturned = items.reduce((s: number, i: any) => s + (i.returnedQty || 0), 0);
    const totalDamaged = items.reduce((s: number, i: any) => s + (i.damagedQty || 0), 0);
    lines += `\n------------------------------------`;
    lines += `\nНИЙТ:          ${String(totalLoaded).padStart(5)} ${String(totalSold).padStart(5)} ${String(totalReturned).padStart(5)} ${String(totalDamaged).padStart(4)}`;
  } else {
    lines += `\nБАРАА                        Тоо ш`;
    for (const item of items) {
      const name = (item.product?.name ?? '').substring(0, 28).padEnd(28);
      const qty = type === 'additional' ? String(item._addedQty ?? item.loadedQty ?? 0).padStart(5)
        : String(item.loadedQty ?? 0).padStart(5);
      lines += `\n${name} ${qty}`;
    }
    const totalQty = type === 'additional'
      ? items.reduce((s: number, i: any) => s + (i._addedQty ?? i.loadedQty ?? 0), 0)
      : items.reduce((s: number, i: any) => s + (i.loadedQty ?? 0), 0);
    lines += `\n------------------------------------`;
    lines += `\nНИЙТ:                        ${String(totalQty).padStart(5)} ш`;
  }

  lines += `\n------------------------------------

Хүлээлгэн өгсөн: ___________________
  (Агуулахын ажилтан)

Хүлээн авсан: _______________________
  (Жолооч)

------------------------------------
       Баярлалаа!
====================================`;

  return lines;
}

// ====================== SALE EDIT HELPERS ======================
interface EditItem {
  productId: string;
  name: string;
  quantity: number;
  /** Одоо байгаа мөрийн үнэ. Шинээр нэмсэн бараанд серверээс тодорхойлогдоно. */
  unitPrice: number | null;
}

/** Засварын цонхонд сонгуулах төлбөрийн хэлбэрүүд. */
const EDITABLE_METHODS = ['CASH', 'BANK_TRANSFER', 'CARD', 'CREDIT', 'COMBINED'] as const;

/**
 * Хосолсон төлбөрийн бэлэн хэсгийг тэмдэглэлээс уншина.
 * Формат: `COMBINED:CASH:80000,CREDIT:100500`
 */
function parseCombinedCash(notes?: string | null): number {
  const m = (notes || '').match(/COMBINED:(.+?)($|\s*\|)/);
  if (!m) return 0;
  let cash = 0;
  for (const part of m[1].split(',')) {
    const [method, amount] = part.split(':');
    if (method !== 'CREDIT') cash += parseFloat(amount) || 0;
  }
  return cash;
}

// ====================== COMPONENT ======================
export default function TruckLoadDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [load, setLoad] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Return form state
  const [returnItems, setReturnItems] = useState<{ productId: string; returnedQty: number; damagedQty: number }[]>([]);
  const [returnNotes, setReturnNotes] = useState('');
  const [submittingReturn, setSubmittingReturn] = useState(false);

  // Additional load form
  const [showAddItems, setShowAddItems] = useState(false);
  const [products, setProducts] = useState<any[]>([]);
  const [addItems, setAddItems] = useState<{ productId: string; loadedQty: number }[]>([]);
  const [addingItems, setAddingItems] = useState(false);

  // Expanded sales
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [salesOpen, setSalesOpen] = useState(false);

  // Борлуулалт засах (зөвхөн админ)
  const [editSale, setEditSale] = useState<any>(null);
  const [editItems, setEditItems] = useState<EditItem[]>([]);
  const [editMethod, setEditMethod] = useState('CASH');
  const [editCash, setEditCash] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    if (id) fetchLoad();
  }, [id]);

  async function fetchLoad() {
    setLoading(true);
    try {
      const res = await api.get(`/api/truck-loads/${id}`);
      const data = res.data?.data ?? res.data;
      setLoad(data);
      if (data?.items) {
        setReturnItems(
          data.items.map((item: any) => {
            const remaining = (item.loadedQty || 0) - (item.soldQty || 0);
            return {
              productId: item.productId,
              returnedQty: item.returnedQty > 0 ? item.returnedQty : (remaining > 0 ? remaining : 0),
              damagedQty: item.damagedQty || 0,
            };
          })
        );
      }
    } catch (err: any) {
      console.error(err);
      alert('Ачилтын мэдээлэл ачааллахад алдаа гарлаа');
    }
    setLoading(false);
  }

  async function fetchProducts() {
    try {
      const res = await api.get('/api/products?limit=100');
      setProducts(res.data?.data ?? res.data ?? []);
    } catch (err) { console.error(err); }
  }

  // --- Actions ---
  async function handleDispatch() {
    if (!confirm('Энэ ачилтыг илгээх үү? Агуулахаас бараа хасагдана.')) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/api/truck-loads/${id}/dispatch`);
      const dispatched = res.data?.data ?? res.data;
      await fetchLoad();
      // Print dispatch handover receipt (2 copies)
      const receipt1 = buildHandoverReceipt(dispatched, 'dispatch', 'АГУУЛАХЫН ХУВЬ');
      const receipt2 = buildHandoverReceipt(dispatched, 'dispatch', 'ЖОЛООЧИЙН ХУВЬ');
      printReceipt('Ачилт баримт', receipt1 + '\n\n' + receipt2);
    } catch (err: any) {
      alert('Алдаа: ' + (err.response?.data?.message || err.message));
    }
    setActionLoading(false);
  }

  async function handleSubmitReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm('Буцаалт илгээх үү?')) return;
    setSubmittingReturn(true);
    try {
      await api.post(`/api/truck-loads/${id}/submit-return`, {
        items: returnItems,
        notes: returnNotes || undefined,
      });
      await fetchLoad();
      alert('Буцаалт амжилттай илгээгдлээ. Менежер баталгаажуулна.');
    } catch (err: any) {
      alert('Алдаа: ' + (err.response?.data?.message || err.message));
    }
    setSubmittingReturn(false);
  }

  async function handleVerifyReturn() {
    if (!confirm('Буцаалтыг баталгаажуулах уу? Бараа агуулахад буцна.')) return;
    setActionLoading(true);
    try {
      const res = await api.post(`/api/truck-loads/${id}/verify-return`);
      const completed = res.data?.data ?? res.data;
      await fetchLoad();
      // Print return handover receipt (2 copies)
      const receipt1 = buildHandoverReceipt(completed, 'return', 'АГУУЛАХЫН ХУВЬ');
      const receipt2 = buildHandoverReceipt(completed, 'return', 'ЖОЛООЧИЙН ХУВЬ');
      printReceipt('Буцаалт баримт', receipt1 + '\n\n' + receipt2);
    } catch (err: any) {
      alert('Алдаа: ' + (err.response?.data?.message || err.message));
    }
    setActionLoading(false);
  }

  // Driver requested completion → admin enters return quantities directly + approve
  async function handleApproveCompletion() {
    if (!load) return;
    // Build items: pre-fill returnedQty = unaccounted remaining for each item
    // Account for any previously returned/damaged quantities
    const items = (load.items ?? [])
      .filter((it: any) => {
        const unaccounted = (it.loadedQty ?? 0) - (it.soldQty ?? 0) - (it.returnedQty ?? 0) - (it.damagedQty ?? 0);
        return unaccounted > 0;
      })
      .map((it: any) => ({
        productId: it.productId,
        returnedQty: (it.loadedQty ?? 0) - (it.soldQty ?? 0) - (it.returnedQty ?? 0) - (it.damagedQty ?? 0),
        damagedQty: 0,
      }));

    // Quick confirmation
    const itemSummary = items.map((i: any) => {
      const it = load.items.find((x: any) => x.productId === i.productId);
      return `${it?.product?.name}: ${i.returnedQty}`;
    }).join('\n');

    if (!confirm(`Дараах үлдэгдлийг агуулахад буцаахыг баталгаажуулах уу?\n\n${itemSummary}\n\nБүх барааг сайн гэж тооцно. Хэрэв гэмтсэн бараа байгаа бол "Буцаалт бүртгэх" хэсгийг ашиглана уу.`)) return;

    setActionLoading(true);
    try {
      const res = await api.post(`/api/truck-loads/${id}/approve-completion`, { items });
      const completed = res.data?.data ?? res.data;
      await fetchLoad();
      const receipt1 = buildHandoverReceipt(completed, 'return', 'АГУУЛАХЫН ХУВЬ');
      const receipt2 = buildHandoverReceipt(completed, 'return', 'ЖОЛООЧИЙН ХУВЬ');
      printReceipt('Буцаалт баримт', receipt1 + '\n\n' + receipt2);
    } catch (err: any) {
      alert('Алдаа: ' + (err.response?.data?.message || err.message));
    }
    setActionLoading(false);
  }

  function printSaleReceipt(sale: any) {
    const a = buildSaleReceipt(sale, load, 'ХАРИЛЦАГЧИЙН ХУВЬ');
    const b = buildSaleReceipt(sale, load, 'ЖОЛООЧИЙН ХУВЬ');
    printReceipt(`Борлуулалт #${sale.saleNumber}`, `${a}\n\n${b}`);
  }

  async function handleCancel() {
    if (!confirm('Энэ ачилтыг цуцлах уу?')) return;
    setActionLoading(true);
    try {
      await api.post(`/api/truck-loads/${id}/cancel`);
      await fetchLoad();
    } catch (err: any) {
      alert('Алдаа: ' + (err.response?.data?.message || err.message));
    }
    setActionLoading(false);
  }

  async function handleAddItems(e: React.FormEvent) {
    e.preventDefault();
    const validItems = addItems.filter((i) => i.productId && i.loadedQty > 0);
    if (validItems.length === 0) { alert('Бараа нэмнэ үү'); return; }
    setAddingItems(true);
    try {
      const res = await api.post(`/api/truck-loads/${id}/add-items`, { items: validItems });
      const updated = res.data?.data ?? res.data;
      await fetchLoad();
      setShowAddItems(false);
      setAddItems([]);
      // Print additional load receipt
      const receiptItems = validItems.map((vi) => {
        const prod = products.find((p: any) => p.id === vi.productId);
        return { product: { name: prod?.name ?? '?' }, _addedQty: vi.loadedQty, loadedQty: vi.loadedQty };
      });
      const receiptLoad = { ...updated, items: receiptItems };
      const receipt1 = buildHandoverReceipt(receiptLoad, 'additional', 'АГУУЛАХЫН ХУВЬ');
      const receipt2 = buildHandoverReceipt(receiptLoad, 'additional', 'ЖОЛООЧИЙН ХУВЬ');
      printReceipt('Нэмэлт ачилт баримт', receipt1 + '\n\n' + receipt2);
    } catch (err: any) {
      alert('Алдаа: ' + (Array.isArray(err.response?.data?.message) ? err.response.data.message.join(', ') : err.response?.data?.message || err.message));
    }
    setAddingItems(false);
  }

  function handlePrintCurrentState() {
    if (!load) return;
    if (load.status === 'COMPLETED') {
      const receipt1 = buildHandoverReceipt(load, 'return', 'АГУУЛАХЫН ХУВЬ');
      const receipt2 = buildHandoverReceipt(load, 'return', 'ЖОЛООЧИЙН ХУВЬ');
      printReceipt('Буцаалт баримт', receipt1 + '\n\n' + receipt2);
    } else {
      const receipt1 = buildHandoverReceipt(load, 'dispatch', 'АГУУЛАХЫН ХУВЬ');
      const receipt2 = buildHandoverReceipt(load, 'dispatch', 'ЖОЛООЧИЙН ХУВЬ');
      printReceipt('Ачилт баримт', receipt1 + '\n\n' + receipt2);
    }
  }

  async function handleVoidSale(saleId: string) {
    if (!confirm('Энэ борлуулалтыг цуцлах уу? Бараа тоо буцаагдана.')) return;
    setActionLoading(true);
    try {
      await api.delete(`/api/truck-sales/${saleId}/void`);
      await fetchLoad();
    } catch (err: any) {
      alert('Борлуулалт цуцлахад алдаа гарлаа: ' + (err.response?.data?.message || err.message));
    }
    setActionLoading(false);
  }

  function openEditSale(sale: any) {
    setEditSale(sale);
    setEditItems(
      (sale.items ?? []).map((si: any) => ({
        productId: si.productId,
        name: si.product?.name ?? '—',
        quantity: si.quantity ?? 0,
        unitPrice: Number(si.unitPrice ?? 0),
      })),
    );
    setEditMethod(sale.paymentMethod);
    setEditCash(String(parseCombinedCash(sale.notes) || ''));
    if (products.length === 0) fetchProducts();
  }

  function closeEditSale() {
    setEditSale(null);
    setEditItems([]);
  }

  function addEditItem(productId: string) {
    if (!productId || editItems.some((i) => i.productId === productId)) return;
    const p = products.find((x: any) => x.id === productId);
    // Үнийг сервер ачилтын байршлаар тодорхойлно — энд зөвхөн урьдчилсан харагдац.
    setEditItems((prev) => [...prev, { productId, name: p?.name ?? '—', quantity: 1, unitPrice: null }]);
  }

  /** Мэдэгдэж буй үнээр тооцсон дүн. Шинэ мөрийн үнэ серверээс ирнэ. */
  const editTotal = editItems.reduce((sum, i) => sum + i.quantity * (i.unitPrice ?? 0), 0);
  const hasUnknownPrice = editItems.some((i) => i.unitPrice === null);

  async function handleSaveEdit(allowWarehouseReturn = false) {
    if (!editSale) return;

    const items = editItems.filter((i) => i.quantity > 0);
    if (items.length === 0) {
      alert('Бүх барааг хасах бол борлуулалтыг цуцлана уу.');
      return;
    }

    const payload: any = {
      items: items.map((i) => ({ productId: i.productId, quantity: i.quantity })),
      paymentMethod: editMethod,
    };
    if (allowWarehouseReturn) payload.allowWarehouseReturn = true;

    if (editMethod === 'COMBINED') {
      if (hasUnknownPrice) {
        alert('Шинэ барааны үнэ мэдэгдэхгүй тул хосолсон төлбөрийг тооцох боломжгүй. Эхлээд хадгалаад дараа нь төлбөрийн хэлбэрийг засна уу.');
        return;
      }
      const cash = Number(editCash || 0);
      if (cash <= 0 || cash >= editTotal) {
        alert('Хосолсон төлбөрт бэлэн дүн 0-ээс их, нийт дүнгээс бага байх ёстой.');
        return;
      }
      payload.combinedPayments = [
        { method: 'CASH', amount: cash },
        { method: 'CREDIT', amount: editTotal - cash },
      ];
    }

    setSavingEdit(true);
    try {
      await api.patch(`/api/truck-sales/${editSale.id}`, payload);
      await fetchLoad();
      closeEditSale();
    } catch (err: any) {
      const data = err.response?.data;
      // Ачилт хаагдсан бол үлдэгдэл машин руу биш агуулах руу буцна — баталгаажуулна.
      if (data?.code === 'WAREHOUSE_RETURN_CONFIRM' && !allowWarehouseReturn) {
        setSavingEdit(false);
        if (confirm(`${data.message}\n\nАгуулах руу үлдэгдэл буцаахад итгэлтэй байна уу?`)) {
          await handleSaveEdit(true);
        }
        return;
      }
      const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || err.message;
      alert('Борлуулалт засахад алдаа гарлаа: ' + msg);
    }
    setSavingEdit(false);
  }

  function toggleSaleExpand(saleId: string) {
    setExpandedSales((prev) => {
      const next = new Set(prev);
      if (next.has(saleId)) next.delete(saleId);
      else next.add(saleId);
      return next;
    });
  }

  function updateReturnItem(productId: string, field: 'returnedQty' | 'damagedQty', value: number) {
    setReturnItems((prev) =>
      prev.map((ri) => (ri.productId === productId ? { ...ri, [field]: value } : ri))
    );
  }

  if (loading) {
    return (
      <div className="py-24 text-center">
        <RefreshCw className="w-6 h-6 text-[#8C8FA3] mx-auto animate-spin" />
        <p className="text-[13px] text-[#8C8FA3] mt-3">Ачааллаж байна...</p>
      </div>
    );
  }

  if (!load) {
    return (
      <div className="py-24 text-center">
        <Truck className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
        <p className="text-[17px] font-semibold text-[#1A1D26]">Ачилт олдсонгүй</p>
        <button
          onClick={() => router.push('/truck-loads')}
          className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-[14px] font-semibold text-[#007AFF] bg-[#007AFF]/10"
        >
          <ChevronLeft className="w-4 h-4" /> Буцах
        </button>
      </div>
    );
  }

  const st = STATUS_CONFIG[load.status] || STATUS_CONFIG.LOADING;
  const items: any[] = load.items || [];
  const sales: any[] = load.sales || [];
  const totalLoaded = items.reduce((s: number, i: any) => s + (i.loadedQty || 0), 0);
  const totalSold = items.reduce((s: number, i: any) => s + (i.soldQty || 0), 0);
  const totalReturned = items.reduce((s: number, i: any) => s + (i.returnedQty || 0), 0);
  const totalRemaining = totalLoaded - totalSold - totalReturned;
  const batches = load?.batches ?? [];
  // Ачилтын нийт жин — жин оруулаагүй бараа 0 гэж тооцогдоно.
  const totalWeightGrams = items.reduce(
    (s: number, i: any) => s + (i.loadedQty || 0) * Number(i.product?.weightGrams ?? 0),
    0,
  );
  const driverSubtitle = [`${load.driver?.lastName ?? ''} ${load.driver?.firstName ?? ''}`.trim(), load.driver?.phone].filter(Boolean).join(' · ');

  return (
    <div className="space-y-5 animate-ios-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <button
          onClick={() => router.push('/truck-loads')}
          className="inline-flex items-center gap-1 text-[13px] font-semibold text-[#007AFF] hover:opacity-80 transition-opacity"
        >
          <ChevronLeft className="w-4 h-4" /> Буцах
        </button>
        <PageHeader
          title={`#${load.loadNumber}`}
          subtitle={driverSubtitle || undefined}
          icon={Truck}
          iconColor={st.color}
          actions={
            <>
              <span className="px-2.5 py-1 rounded-full text-[12px] font-semibold" style={{ color: st.color, backgroundColor: st.bg }}>
                {st.label}
              </span>
              <button
                onClick={handlePrintCurrentState}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20"
              >
                <Printer className="w-3.5 h-3.5" /> Баримт хэвлэх
              </button>
              {load.status === 'LOADING' && (
                <button onClick={handleDispatch} disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50"
                  style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}>
                  <Send className="w-3.5 h-3.5" /> Илгээх
                </button>
              )}
              {(load.status === 'DISPATCHED' || load.status === 'COMPLETION_REQUESTED') && (
                <>
                  {load.status === 'DISPATCHED' && (
                    <button onClick={() => { setShowAddItems(true); fetchProducts(); }}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20">
                      <PackagePlus className="w-3.5 h-3.5" /> Нэмэлт ачилт
                    </button>
                  )}
                  <button onClick={handleApproveCompletion} disabled={actionLoading}
                    className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-white disabled:opacity-50"
                    style={{ background: load.status === 'COMPLETION_REQUESTED'
                      ? 'linear-gradient(135deg, #FF3B30, #FF6961)'
                      : 'linear-gradient(135deg, #34C759, #30D158)' }}>
                    <CheckCircle className="w-3.5 h-3.5" />
                    {load.status === 'COMPLETION_REQUESTED' ? 'Дуусгах хүсэлтийг батлах' : 'Ачилт дуусгаж батлах'}
                  </button>
                </>
              )}
              {(load.status === 'LOADING' || load.status === 'DISPATCHED' || load.status === 'COMPLETION_REQUESTED') && (
                <button onClick={handleCancel} disabled={actionLoading}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-[13px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 disabled:opacity-50">
                  <Ban className="w-3.5 h-3.5" /> Цуцлах
                </button>
              )}
              {actionLoading && <RefreshCw className="w-4 h-4 text-[#8C8FA3] animate-spin" />}
            </>
          }
        />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <StatCard label="Ачсан" value={totalLoaded} gradient="blue" index={0} />
        <StatCard label="Борлуулсан" value={totalSold} gradient="green" index={1} />
        <StatCard label="Буцаасан" value={totalReturned} gradient="orange" index={2} />
        <StatCard label="Үлдэгдэл" value={totalRemaining} gradient="indigo" index={3} />
        <StatCard label="Борлуулалт" value={sales.length} gradient="purple" index={4} />
        <StatCard label="Нийт жин" value={formatWeight(totalWeightGrams)} gradient="teal" index={5} />
      </div>

      {/* Additional Load Modal */}
      {showAddItems && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#007AFF]/30 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F2F5] bg-[#007AFF]/5">
            <div className="flex items-center gap-2">
              <PackagePlus className="w-5 h-5 text-[#007AFF]" />
              <h2 className="text-[17px] font-bold text-[#1A1D26]">Нэмэлт ачилт</h2>
            </div>
            <button onClick={() => setShowAddItems(false)} className="p-1 rounded-lg hover:bg-[#F2F4F7]">
              <X className="w-5 h-5 text-[#8C8FA3]" />
            </button>
          </div>
          <form onSubmit={handleAddItems} className="p-5 space-y-3">
            {addItems.map((ai, idx) => (
              <div key={idx} className="flex items-center gap-2">
                <SearchableSelect
                  value={ai.productId}
                  onChange={(v) => {
                    const next = [...addItems]; next[idx].productId = v; setAddItems(next);
                  }}
                  options={products.map((p: any) => ({
                    value: p.id,
                    label: `${p.name} (${primaryBarcode(p) ?? "—"}) — нөөц: ${p.stockAvailable ?? "?"}`,
                  }))}
                  emptyText="Бараа сонгох..."
                  inputClassName={inputClass}
                  widthClass="flex-1 min-w-0"
                  aria-label="Бараа"
                />
                <input type="number" min={1} value={ai.loadedQty || ''} onChange={(e) => {
                  const next = [...addItems]; next[idx].loadedQty = parseInt(e.target.value) || 0; setAddItems(next);
                }} placeholder="Тоо" className={inputClass + ' w-28'} />
                <button type="button" onClick={() => setAddItems(addItems.filter((_, i) => i !== idx))}
                  className="p-2 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10"><X className="w-4 h-4" /></button>
              </div>
            ))}
            <button type="button" onClick={() => setAddItems([...addItems, { productId: '', loadedQty: 1 }])}
              className="text-[13px] font-semibold text-[#007AFF] flex items-center gap-1">
              <Plus className="w-3.5 h-3.5" /> Бараа нэмэх
            </button>
            <div className="flex gap-2 pt-2">
              <button type="submit" disabled={addingItems}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
                <PackagePlus className="w-4 h-4" /> {addingItems ? 'Нэмж байна...' : 'Нэмэлт ачилт хийх'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Ачилтын түүх — анхны ачилт болон нэмэлт ачилт бүр тусад нь */}
      {batches.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden">
          <button
            onClick={() => setHistoryOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-5 py-4 border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors"
          >
            <History className="w-5 h-5 text-[#5856D6]" />
            <h2 className="text-[17px] font-bold text-[#1A1D26]">Ачилтын түүх</h2>
            <span className="text-[13px] text-[#8C8FA3]">({batches.length})</span>
            <span className="flex-1" />
            {historyOpen
              ? <ChevronUp className="w-4 h-4 text-[#8C8FA3]" />
              : <ChevronDown className="w-4 h-4 text-[#8C8FA3]" />}
          </button>

          {historyOpen && (
            <div className="divide-y divide-[#F0F2F5]">
              {batches.map((b: any) => {
                const qty = (b.items ?? []).reduce((s: number, i: any) => s + (i.quantity ?? 0), 0);
                const first = b.sequence === 1;
                return (
                  <div key={b.id} className="px-5 py-4">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span
                        className="text-[11px] font-bold px-2.5 py-1 rounded-lg"
                        style={{
                          color: first ? '#34C759' : '#FF9500',
                          background: first ? '#34C75915' : '#FF950015',
                        }}
                      >
                        {first ? 'Анхны ачилт' : `${b.sequence - 1}-р нэмэлт`}
                      </span>
                      <span className="text-[12px] text-[#8C8FA3]">
                        {new Date(b.createdAt).toLocaleString('mn-MN')}
                        {b.createdBy ? ` · ${b.createdBy.lastName ?? ''} ${b.createdBy.firstName ?? ''}`.trimEnd() : ''}
                      </span>
                      <span className="flex-1" />
                      <span className="text-[15px] font-bold text-[#1A1D26] tabular-nums">{qty}ш</span>
                    </div>
                    <div className="mt-2.5 space-y-1">
                      {(b.items ?? []).map((bi: any) => (
                        <div key={bi.id} className="flex items-center justify-between text-[13px]">
                          <span className="text-[#4A4D5C] truncate pr-3">{bi.product?.name ?? '-'}</span>
                          <span className="font-semibold text-[#1A1D26] tabular-nums shrink-0">
                            {formatQty(bi.quantity, bi.product?.unitsPerBox)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Items Table */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-4 border-b border-[#F0F2F5]">
          <Package className="w-5 h-5 text-[#007AFF]" />
          <h2 className="text-[17px] font-bold text-[#1A1D26]">Бараанууд</h2>
          <span className="text-[13px] text-[#8C8FA3]">({items.length})</span>
        </div>
        {items.length === 0 ? (
          <div className="py-10 text-center text-[#8C8FA3] text-[14px]">Бараа байхгүй</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="bg-[#F9FAFB] text-[12px] font-semibold text-[#8C8FA3] uppercase">
                  <th className="px-5 py-3">Бараа</th>
                  <th className="px-4 py-3 text-center">Ачсан</th>
                  <th className="px-4 py-3 text-center">Зарсан</th>
                  <th className="px-4 py-3 text-center">Буцсан</th>
                  <th className="px-4 py-3 text-center">Гэмтсэн</th>
                  <th className="px-4 py-3 text-center">Үлдсэн</th>
                  <th className="px-4 py-3 min-w-[140px]">Явц</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7]">
                {items.map((item: any) => {
                  const loaded = item.loadedQty || 0;
                  const sold = item.soldQty || 0;
                  const returned = item.returnedQty || 0;
                  const damaged = item.damagedQty || 0;
                  const perBox = Number(item.product?.unitsPerBox ?? 1);
                  const remaining = Math.max(0, loaded - sold - returned - damaged);
                  const soldPct = loaded > 0 ? (sold / loaded) * 100 : 0;
                  const returnedPct = loaded > 0 ? (returned / loaded) * 100 : 0;
                  const damagedPct = loaded > 0 ? (damaged / loaded) * 100 : 0;

                  return (
                    <tr key={item.id} className="hover:bg-[#F7F9FC]">
                      <td className="px-5 py-3">
                        <p className="text-[14px] font-medium text-[#1A1D26]">{item.product?.name ?? '—'}</p>
                        {primaryBarcode(item.product) && <p className="text-[12px] text-[#8C8FA3]">{primaryBarcode(item.product)}</p>}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-[14px] font-semibold text-[#1A1D26] tabular-nums">{loaded}</p>
                        {perBox > 1 && (
                          <p className="text-[11px] text-[#8C8FA3]">{formatQty(loaded, perBox)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-[14px] font-semibold text-[#34C759] tabular-nums">{sold}</p>
                        {perBox > 1 && sold > 0 && (
                          <p className="text-[11px] text-[#8C8FA3]">{formatQty(sold, perBox)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-center text-[14px] font-semibold text-[#FF9500]">{returned}</td>
                      <td className="px-4 py-3 text-center text-[14px] font-semibold text-[#FF3B30]">{damaged}</td>
                      <td className="px-4 py-3 text-center">
                        <p className="text-[14px] font-semibold text-[#8C8FA3] tabular-nums">{remaining}</p>
                        {perBox > 1 && remaining > 0 && (
                          <p className="text-[11px] text-[#8C8FA3]">{formatQty(remaining, perBox)}</p>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex h-2.5 rounded-full overflow-hidden bg-[#F2F4F7]">
                          {soldPct > 0 && <div className="h-full bg-[#34C759]" style={{ width: `${soldPct}%` }} />}
                          {returnedPct > 0 && <div className="h-full bg-[#FF9500]" style={{ width: `${returnedPct}%` }} />}
                          {damagedPct > 0 && <div className="h-full bg-[#FF3B30]" style={{ width: `${damagedPct}%` }} />}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Sales History */}
      {sales.length > 0 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden">
          <button
            onClick={() => setSalesOpen((v) => !v)}
            className="w-full flex items-center gap-2 px-5 py-4 border-b border-[#F0F2F5] hover:bg-[#FAFBFC] transition-colors"
          >
            <ShoppingCart className="w-5 h-5 text-[#34C759]" />
            <h2 className="text-[17px] font-bold text-[#1A1D26]">Борлуулалтын түүх</h2>
            <span className="text-[13px] text-[#8C8FA3]">({sales.length})</span>
            <span className="flex-1" />
            {salesOpen
              ? <ChevronUp className="w-4 h-4 text-[#8C8FA3]" />
              : <ChevronDown className="w-4 h-4 text-[#8C8FA3]" />}
          </button>
          <div className={salesOpen ? 'divide-y divide-[#F2F4F7]' : 'hidden'}>
            {sales.map((sale: any) => {
              const isExpanded = expandedSales.has(sale.id);
              return (
                <Fragment key={sale.id}>
                  <div
                    onClick={() => toggleSaleExpand(sale.id)}
                    className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#F7F9FC] text-left cursor-pointer"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-9 h-9 rounded-lg bg-[#34C759]/10 flex items-center justify-center shrink-0">
                        <Hash className="w-4 h-4 text-[#34C759]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[14px] font-semibold text-[#1A1D26]">#{sale.saleNumber}</span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-[#F2F4F7] text-[#8C8FA3]">
                            {PAYMENT_LABELS[sale.paymentMethod] ?? sale.paymentMethod}
                          </span>
                        </div>
                        <span className="text-[13px] text-[#8C8FA3]">
                          {sale.customer?.storeName ?? sale.customer?.contactName ?? '—'}
                          {sale.createdAt && ` • ${new Date(sale.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}`}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-[15px] font-bold text-[#1A1D26]">{formatMnt(sale.totalAmount)}</span>
                      {isAdmin && (
                        <button
                          onClick={(e) => { e.stopPropagation(); openEditSale(sale); }}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 transition-colors disabled:opacity-50"
                        >
                          Засах
                        </button>
                      )}
                      {(load.status === 'DISPATCHED' || load.status === 'COMPLETION_REQUESTED') && (
                        <button
                          onClick={(e) => { e.stopPropagation(); handleVoidSale(sale.id); }}
                          disabled={actionLoading}
                          className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 transition-colors disabled:opacity-50"
                        >
                          Цуцлах
                        </button>
                      )}
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8C8FA3]" /> : <ChevronDown className="w-4 h-4 text-[#8C8FA3]" />}
                    </div>
                  </div>
                  {isExpanded && sale.items?.length > 0 && (
                    <div className="px-5 pb-4">
                      <div className="bg-[#F9FAFB] rounded-xl overflow-hidden">
                        <table className="w-full text-left">
                          <thead>
                            <tr className="text-[11px] font-semibold text-[#8C8FA3] uppercase">
                              <th className="px-4 py-2">Бараа</th>
                              <th className="px-4 py-2 text-center">Тоо</th>
                              <th className="px-4 py-2 text-right">Үнэ</th>
                              <th className="px-4 py-2 text-right">Нийт</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[#F2F4F7]">
                            {sale.items.map((si: any, idx: number) => (
                              <tr key={idx}>
                                <td className="px-4 py-2 text-[13px]">{si.product?.name ?? '—'}</td>
                                <td className="px-4 py-2 text-center text-[13px]">
                                  {formatQty(si.quantity ?? 0, si.product?.unitsPerBox)}
                                </td>
                                <td className="px-4 py-2 text-right text-[13px] text-[#8C8FA3]">{formatMnt(si.unitPrice)}</td>
                                <td className="px-4 py-2 text-right text-[13px] font-semibold">{formatMnt(si.lineTotal)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="flex justify-end mt-3">
                          <button
                            onClick={() => printSaleReceipt(sale)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-semibold text-[#007AFF] bg-[#007AFF]/10 border border-[#007AFF]/20 hover:bg-[#007AFF]/15 transition-all active:scale-[0.97]"
                          >
                            <Printer className="w-4 h-4" /> Баримт хэвлэх
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </Fragment>
              );
            })}
          </div>
        </div>
      )}

      {/* Return Form - DISPATCHED only */}
      {load.status === 'DISPATCHED' && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#FF9500]/30 overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-4 border-b border-[#F0F2F5] bg-[#FF9500]/5">
            <CornerDownLeft className="w-5 h-5 text-[#FF9500]" />
            <h2 className="text-[17px] font-bold text-[#1A1D26]">Буцаалт бүртгэх</h2>
          </div>
          <form onSubmit={handleSubmitReturn} className="p-5 space-y-4">
            <div className="overflow-x-auto">
              <table className="w-full text-left">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[12px] font-semibold text-[#8C8FA3] uppercase">
                    <th className="px-4 py-3">Бараа</th>
                    <th className="px-4 py-3 text-center">Ачсан</th>
                    <th className="px-4 py-3 text-center">Зарсан</th>
                    <th className="px-4 py-3 text-center">Үлдсэн</th>
                    <th className="px-4 py-3 text-center">Буцаах тоо</th>
                    <th className="px-4 py-3 text-center">Гэмтсэн</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#F2F4F7]">
                  {items.map((item: any) => {
                    const ri = returnItems.find((r) => r.productId === item.productId);
                    const loaded = item.loadedQty || 0;
                    const sold = item.soldQty || 0;
                    const remaining = loaded - sold;
                    return (
                      <tr key={item.id}>
                        <td className="px-4 py-3">
                          <p className="text-[14px] font-medium text-[#1A1D26]">{item.product?.name ?? '—'}</p>
                        </td>
                        <td className="px-4 py-3 text-center text-[14px]">{loaded}</td>
                        <td className="px-4 py-3 text-center text-[14px] text-[#34C759] font-semibold">{sold}</td>
                        <td className="px-4 py-3 text-center text-[14px] text-[#007AFF] font-semibold">{remaining}</td>
                        <td className="px-4 py-3">
                          <input type="number" min={0} max={remaining}
                            value={ri?.returnedQty ?? 0}
                            onChange={(e) => updateReturnItem(item.productId, 'returnedQty', parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto block px-3 py-2 rounded-lg bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-center outline-none focus:border-[#007AFF]"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <input type="number" min={0} max={remaining}
                            value={ri?.damagedQty ?? 0}
                            onChange={(e) => updateReturnItem(item.productId, 'damagedQty', parseInt(e.target.value) || 0)}
                            className="w-20 mx-auto block px-3 py-2 rounded-lg bg-[#F5F6FA] border border-[#FF3B30]/30 text-[14px] text-center outline-none focus:border-[#FF3B30]"
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div>
              <label className="block text-[13px] font-semibold text-[#8C8FA3] mb-1">Тэмдэглэл</label>
              <textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)}
                placeholder="Нэмэлт тайлбар..." rows={2} className={inputClass} />
            </div>
            <div className="flex items-center gap-2 pt-2">
              <button type="submit" disabled={submittingReturn}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}>
                <CornerDownLeft className="w-4 h-4" />
                {submittingReturn ? 'Илгээж байна...' : 'Буцаалт илгээх'}
              </button>
              <button type="button" onClick={handleVerifyReturn} disabled={actionLoading}
                className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white disabled:opacity-50"
                style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}>
                <CheckCircle className="w-4 h-4" /> Баталгаажуулах + Баримт
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Completion Info */}
      {load.status === 'COMPLETED' && (
        <div className="bg-[#34C759]/5 rounded-2xl border border-[#34C759]/20 p-5">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle className="w-5 h-5 text-[#34C759]" />
            <h3 className="text-[15px] font-bold text-[#34C759]">Ачилт дууссан</h3>
          </div>
          <div className="grid grid-cols-2 gap-4 text-[13px] text-[#1A1D26]">
            {load.completedAt && <p>Дууссан: <span className="font-semibold">{new Date(load.completedAt).toLocaleString('mn-MN')}</span></p>}
            {load.returnVerifiedBy && (
              <p>Баталгаажуулсан: <span className="font-semibold">{load.returnVerifiedBy.lastName} {load.returnVerifiedBy.firstName}</span></p>
            )}
            {load.returnNotes && <p className="col-span-2">Тэмдэглэл: <span className="italic text-[#8C8FA3]">{load.returnNotes}</span></p>}
          </div>
        </div>
      )}

      {/* Борлуулалт засах цонх (зөвхөн админ) */}
      {editSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between px-5 py-4 border-b border-[#F0F2F5] sticky top-0 bg-white">
              <div>
                <h3 className="text-[17px] font-bold text-[#1A1D26]">
                  Борлуулалт #{editSale.saleNumber} засах
                </h3>
                <p className="text-[13px] text-[#8C8FA3]">
                  {editSale.customer?.storeName ?? editSale.customer?.contactName ?? '—'}
                </p>
              </div>
              <button onClick={closeEditSale} className="p-2 rounded-lg hover:bg-[#F2F4F7]">
                <X className="w-4 h-4 text-[#8C8FA3]" />
              </button>
            </div>

            <div className="p-5 space-y-5">
              {load.status !== 'DISPATCHED' && (
                <div className="flex items-start gap-2 px-4 py-3 rounded-xl bg-[#FF9500]/10 border border-[#FF9500]/25">
                  <AlertTriangle className="w-4 h-4 text-[#FF9500] shrink-0 mt-0.5" />
                  <p className="text-[13px] text-[#1A1D26]">
                    Ачилт хаагдсан тул тоо хэмжээний өөрчлөлт шууд агуулахын үлдэгдэлд тусна.
                  </p>
                </div>
              )}

              {/* Барааны мөрүүд */}
              <div>
                <label className="block text-[13px] font-semibold text-[#1A1D26] mb-2">Бараа</label>
                <div className="rounded-xl border border-[#E8ECF0] divide-y divide-[#F2F4F7]">
                  {editItems.map((item, idx) => (
                    <div key={item.productId} className="flex items-center gap-3 px-4 py-3">
                      <div className="flex-1 min-w-0">
                        <div className="text-[14px] font-medium text-[#1A1D26] truncate">{item.name}</div>
                        <div className="text-[12px] text-[#8C8FA3]">
                          {item.unitPrice === null
                            ? 'Үнэ серверээс тодорхойлогдоно'
                            : `${formatMnt(item.unitPrice)} × ${item.quantity} = ${formatMnt(item.quantity * item.unitPrice)}`}
                        </div>
                      </div>
                      <input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(e) => {
                          const q = parseInt(e.target.value, 10);
                          setEditItems((prev) =>
                            prev.map((x, i) => (i === idx ? { ...x, quantity: Number.isNaN(q) ? 0 : q } : x)),
                          );
                        }}
                        className="w-24 px-3 py-2 rounded-lg bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-center outline-none focus:border-[#007AFF]"
                      />
                      <button
                        onClick={() => setEditItems((prev) => prev.filter((_, i) => i !== idx))}
                        className="p-2 rounded-lg text-[#FF3B30] hover:bg-[#FF3B30]/10"
                        title="Мөр хасах"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {editItems.length === 0 && (
                    <div className="px-4 py-6 text-center text-[13px] text-[#8C8FA3]">
                      Бараа үлдээгүй байна. Бүх барааг хасах бол борлуулалтыг цуцлана уу.
                    </div>
                  )}
                </div>
              </div>

              {/* Бараа нэмэх */}
              <div>
                <label className="block text-[13px] font-semibold text-[#1A1D26] mb-2">Бараа нэмэх</label>
                <SearchableSelect
                  value=""
                  onChange={addEditItem}
                  options={products
                    .filter((p: any) => !editItems.some((i) => i.productId === p.id))
                    .map((p: any) => ({ value: p.id, label: p.name }))}
                  emptyText="Бараа сонгох..."
                  inputClassName={inputClass}
                />
              </div>

              {/* Төлбөрийн хэлбэр */}
              <div>
                <label className="block text-[13px] font-semibold text-[#1A1D26] mb-2">Төлбөрийн хэлбэр</label>
                <div className="flex flex-wrap gap-2">
                  {EDITABLE_METHODS.map((m) => (
                    <button
                      key={m}
                      onClick={() => setEditMethod(m)}
                      className={`px-3.5 py-2 rounded-xl text-[13px] font-semibold transition-colors ${
                        editMethod === m
                          ? 'bg-[#007AFF] text-white'
                          : 'bg-[#F5F6FA] text-[#1A1D26] hover:bg-[#E8ECF0]'
                      }`}
                    >
                      {PAYMENT_LABELS[m] ?? m}
                    </button>
                  ))}
                </div>
                {editMethod === 'COMBINED' && (
                  <div className="mt-3">
                    <label className="block text-[12px] font-medium text-[#8C8FA3] mb-1.5">
                      Бэлэн төлсөн дүн (үлдсэн нь дараа тооцоо)
                    </label>
                    <MoneyInput value={editCash} onChange={setEditCash} className={inputClass} />
                    {!hasUnknownPrice && (
                      <p className="mt-1.5 text-[12px] text-[#8C8FA3]">
                        Дараа тооцоо: {formatMnt(Math.max(0, editTotal - Number(editCash || 0)))}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-[#F9FAFB]">
                <span className="text-[14px] font-semibold text-[#1A1D26]">Нийт дүн</span>
                <span className="text-[17px] font-bold text-[#1A1D26]">
                  {hasUnknownPrice ? 'Хадгалсны дараа тодорхой болно' : formatMnt(editTotal)}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 px-5 py-4 border-t border-[#F0F2F5] sticky bottom-0 bg-white">
              <button
                onClick={closeEditSale}
                disabled={savingEdit}
                className="px-4 py-2.5 rounded-xl text-[14px] font-semibold text-[#8C8FA3] bg-[#F5F6FA] hover:bg-[#E8ECF0] disabled:opacity-50"
              >
                Болих
              </button>
              <button
                onClick={() => handleSaveEdit()}
                disabled={savingEdit || editItems.length === 0}
                className="px-5 py-2.5 rounded-xl text-[14px] font-semibold text-white bg-[#007AFF] hover:bg-[#0066DB] disabled:opacity-50"
              >
                {savingEdit ? 'Хадгалж байна...' : 'Хадгалах'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
