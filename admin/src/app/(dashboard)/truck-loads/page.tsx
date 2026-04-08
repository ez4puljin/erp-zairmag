'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Truck, Plus, Package, Calendar, User, Phone,
  RefreshCw, X, Send, CheckCircle, Ban, Hash,
  ChevronRight, DollarSign, Clock, Archive,
  PackageCheck, ShoppingBag, AlertTriangle,
} from 'lucide-react';

// ====================== TYPES ======================
interface TruckLoadItem {
  id: string;
  productId: string;
  product: { id: string; name: string; sku?: string; sellingPrice?: number; unitsPerBox?: number };
  loadedQty: number;
  soldQty: number;
  returnedQty: number;
  damagedQty: number;
}

interface TruckLoad {
  id: string;
  loadNumber: number;
  status: string;
  driverId: string;
  driver: { id: string; firstName?: string; lastName?: string; phone?: string };
  vehicleInfo?: string;
  loadDate: string;
  notes?: string;
  dispatchedAt?: string;
  completedAt?: string;
  createdAt: string;
  items: TruckLoadItem[];
  sales?: any[];
  _count?: { items: number; sales: number };
}

// ====================== CONSTANTS ======================
const COLUMNS = [
  { id: 'loading', label: 'Жолооч ачилт', status: 'LOADING', color: '#007AFF', bg: '#EFF6FF', border: '#BFDBFE' },
  { id: 'dispatched', label: 'Хүргэлтэнд гарсан', status: 'DISPATCHED', color: '#F59E0B', bg: '#FFFBEB', border: '#FDE68A' },
  { id: 'completed', label: 'Буцаасан', status: 'COMPLETED', color: '#10B981', bg: '#ECFDF5', border: '#A7F3D0' },
  { id: 'archive', label: 'Архив', status: 'ARCHIVE', color: '#6B7280', bg: '#F3F4F6', border: '#D1D5DB' },
];

const inputClass =
  'w-full px-3 py-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none transition-all focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15 focus:bg-white';

// ====================== MAIN COMPONENT ======================
export default function TruckLoadsKanban() {
  const router = useRouter();
  const today = new Date().toISOString().split('T')[0];

  const [loads, setLoads] = useState<TruckLoad[]>([]);
  const [archiveLoads, setArchiveLoads] = useState<TruckLoad[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState(0); // mobile tabs

  // Form state
  const [drivers, setDrivers] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [formDriverId, setFormDriverId] = useState('');
  const [formVehicle, setFormVehicle] = useState('');
  const [formDate, setFormDate] = useState(today);
  const [formNotes, setFormNotes] = useState('');
  const [formItems, setFormItems] = useState<{ productId: string; productName: string; loadedQty: number; unitsPerBox: number }[]>([]);
  const [formProductId, setFormProductId] = useState('');
  const [formBoxQty, setFormBoxQty] = useState(0);
  const [formPieceQty, setFormPieceQty] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  // Add-items state (for adding items to existing DISPATCHED load)
  const [addItemsLoadId, setAddItemsLoadId] = useState<string | null>(null);
  const [addItemsFormItems, setAddItemsFormItems] = useState<{ productId: string; productName: string; loadedQty: number; unitsPerBox: number }[]>([]);
  const [addItemsProductId, setAddItemsProductId] = useState('');
  const [addItemsBoxQty, setAddItemsBoxQty] = useState(0);
  const [addItemsPieceQty, setAddItemsPieceQty] = useState(0);

  // ====================== DATA FETCHING ======================
  const fetchLoads = useCallback(async () => {
    try {
      setLoading(true);
      // Fetch 3 things in parallel:
      // 1) ALL active loads (LOADING + DISPATCHED) regardless of date — always visible
      // 2) Today's completed loads
      // 3) Archive (older completed + cancelled)
      const [activeRes, todayCompletedRes, archiveRes] = await Promise.all([
        api.get('/api/truck-loads', { params: { status: 'LOADING', limit: 50 } })
          .then(async (loadingRes) => {
            const [dispatchedRes, completionReqRes] = await Promise.all([
              api.get('/api/truck-loads', { params: { status: 'DISPATCHED', limit: 50 } }),
              api.get('/api/truck-loads', { params: { status: 'COMPLETION_REQUESTED', limit: 50 } }),
            ]);
            return [
              ...(loadingRes.data?.data ?? loadingRes.data ?? []),
              ...(dispatchedRes.data?.data ?? dispatchedRes.data ?? []),
              ...(completionReqRes.data?.data ?? completionReqRes.data ?? []),
            ];
          }),
        api.get('/api/truck-loads', { params: { status: 'COMPLETED', dateFrom: today, dateTo: today, limit: 50 } }),
        api.get('/api/truck-loads', { params: { dateTo: new Date(Date.now() - 86400000).toISOString().split('T')[0], limit: 20 } }),
      ]);
      setLoads([...activeRes, ...(todayCompletedRes.data?.data ?? todayCompletedRes.data ?? [])]);
      setArchiveLoads(archiveRes.data?.data ?? archiveRes.data ?? []);
    } catch (e) {
      console.error('Failed to fetch loads', e);
    } finally {
      setLoading(false);
    }
  }, [today]);

  useEffect(() => { fetchLoads(); }, [fetchLoads]);

  // Auto-refresh every 30s
  useEffect(() => {
    const interval = setInterval(fetchLoads, 30000);
    return () => clearInterval(interval);
  }, [fetchLoads]);

  // Fetch form data when form or add-items opens
  useEffect(() => {
    if (!showForm && !addItemsLoadId) return;
    Promise.all([
      api.get('/api/drivers'),
      api.get('/api/products', { params: { limit: 100 } }),
    ]).then(([dRes, pRes]) => {
      setDrivers(dRes.data?.data ?? dRes.data ?? []);
      setProducts((pRes.data?.data ?? pRes.data ?? []).filter((p: any) => p.isActive));
    }).catch(() => {});
  }, [showForm, addItemsLoadId]);

  // ====================== COLUMN DATA ======================
  const columnData = COLUMNS.map((col) => {
    let items: TruckLoad[] = [];
    if (col.status === 'LOADING') items = loads.filter((l) => l.status === 'LOADING');
    else if (col.status === 'DISPATCHED') items = loads.filter((l) => l.status === 'DISPATCHED' || l.status === 'COMPLETION_REQUESTED');
    else if (col.status === 'COMPLETED') items = loads.filter((l) => l.status === 'COMPLETED');
    else items = [...archiveLoads.filter((l) => l.status === 'COMPLETED' || l.status === 'CANCELLED')];
    return { ...col, items };
  });

  // ====================== ACTIONS ======================
  const handleDispatch = async (id: string) => {
    if (!confirm('Ачилтыг илгээх үү? Агуулахаас бараа хасагдана.')) return;
    setActionLoading(id);
    try {
      await api.post(`/api/truck-loads/${id}/dispatch`);
      fetchLoads();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setActionLoading(null);
    }
  };

  const handleVerifyReturn = async (id: string) => {
    if (!confirm('Буцаалт баталгаажуулах уу? Бараа агуулах руу буцна.')) return;
    setActionLoading(id);
    try {
      await api.post(`/api/truck-loads/${id}/verify-return`);
      fetchLoads();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (id: string) => {
    if (!confirm('Ачилтыг цуцлах уу?')) return;
    setActionLoading(id);
    try {
      await api.post(`/api/truck-loads/${id}/cancel`);
      fetchLoads();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setActionLoading(null);
    }
  };

  // ====================== ADD ITEMS TO EXISTING LOAD ======================
  const addProductToAddItems = () => {
    if (!addItemsProductId) return;
    const p = products.find((pr: any) => pr.id === addItemsProductId);
    if (!p) return;
    const unitsPerBox = p.unitsPerBox ?? 1;
    const totalQty = (addItemsBoxQty * unitsPerBox) + addItemsPieceQty;
    if (totalQty <= 0) return;
    if (addItemsFormItems.some((fi) => fi.productId === addItemsProductId)) {
      setAddItemsFormItems((prev) => prev.map((fi) => fi.productId === addItemsProductId ? { ...fi, loadedQty: fi.loadedQty + totalQty } : fi));
    } else {
      setAddItemsFormItems((prev) => [...prev, { productId: addItemsProductId, productName: p.name, loadedQty: totalQty, unitsPerBox }]);
    }
    setAddItemsProductId('');
    setAddItemsBoxQty(0);
    setAddItemsPieceQty(0);
  };

  const handleAddItemsSubmit = async () => {
    if (!addItemsLoadId || addItemsFormItems.length === 0) return;
    setSubmitting(true);
    try {
      await api.post(`/api/truck-loads/${addItemsLoadId}/add-items`, {
        items: addItemsFormItems.map((fi) => ({ productId: fi.productId, loadedQty: fi.loadedQty })),
      });
      setAddItemsLoadId(null);
      setAddItemsFormItems([]);
      fetchLoads();
    } catch (e: any) {
      alert(e.response?.data?.message ?? 'Алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  const openAddItems = (loadId: string) => {
    setAddItemsLoadId(loadId);
    setAddItemsFormItems([]);
    setAddItemsProductId('');
    setAddItemsBoxQty(0);
    setAddItemsPieceQty(0);
  };

  // ====================== NEW LOAD FORM ======================
  const addProductToForm = () => {
    if (!formProductId) return;
    const p = products.find((pr: any) => pr.id === formProductId);
    if (!p) return;
    const unitsPerBox = p.unitsPerBox ?? 1;
    const totalQty = (formBoxQty * unitsPerBox) + formPieceQty;
    if (totalQty <= 0) return;
    if (formItems.some((fi) => fi.productId === formProductId)) {
      setFormItems((prev) => prev.map((fi) => fi.productId === formProductId ? { ...fi, loadedQty: fi.loadedQty + totalQty } : fi));
    } else {
      setFormItems((prev) => [...prev, { productId: formProductId, productName: p.name, loadedQty: totalQty, unitsPerBox }]);
    }
    setFormProductId('');
    setFormBoxQty(0);
    setFormPieceQty(0);
  };

  const handleCreateLoad = async () => {
    if (!formDriverId || formItems.length === 0) {
      alert('Жолооч болон бараа сонгоно уу.');
      return;
    }
    setSubmitting(true);
    try {
      await api.post('/api/truck-loads', {
        driverId: formDriverId,
        loadDate: formDate,
        notes: formNotes || undefined,
        vehicleInfo: formVehicle || undefined,
        items: formItems.map((fi) => ({ productId: fi.productId, loadedQty: fi.loadedQty })),
      });
      setShowForm(false);
      resetForm();
      fetchLoads();
    } catch (e: any) {
      const msg = e.response?.data?.message ?? '';
      // If driver has active load, offer to add items instead
      if (msg.includes('идэвхтэй ачилт')) {
        const activeLoad = loads.find((l) => l.driverId === formDriverId && (l.status === 'LOADING' || l.status === 'DISPATCHED'));
        if (activeLoad && confirm(`${msg}\n\nОдоо байгаа ачилт №${activeLoad.loadNumber}-д бараа нэмэх үү?`)) {
          setShowForm(false);
          // Transfer selected items to addItems sheet
          setAddItemsFormItems(formItems);
          setAddItemsLoadId(activeLoad.id);
          resetForm();
        }
      } else {
        alert(msg || 'Алдаа гарлаа');
      }
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setFormDriverId('');
    setFormVehicle('');
    setFormDate(today);
    setFormNotes('');
    setFormItems([]);
    setFormProductId('');
    setFormBoxQty(0);
    setFormPieceQty(0);
  };

  // ====================== RENDER ======================
  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col gap-4 animate-ios-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h1 className="text-[22px] font-bold text-[#1A1D26]">Машины ачилт</h1>
          <p className="text-[12px] text-[#8C8FA3]">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={fetchLoads} className="p-2.5 rounded-xl bg-white border border-[#E8ECF0] hover:bg-[#F5F6FA] transition-colors">
            <RefreshCw className={`w-4 h-4 text-[#8C8FA3] ${loading ? 'animate-spin' : ''}`} />
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold shadow-md shadow-[#007AFF]/25 hover:bg-[#0066D6] transition-colors"
          >
            <Plus className="w-4 h-4" />
            Шинэ ачилт
          </button>
        </div>
      </div>

      {/* Mobile Tab Bar */}
      <div className="flex lg:hidden gap-1 bg-white rounded-xl p-1 border border-[#E8ECF0] flex-shrink-0">
        {columnData.map((col, i) => (
          <button
            key={col.id}
            onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 px-2 rounded-lg text-[11px] font-semibold text-center transition-all ${
              activeTab === i ? 'bg-[#007AFF] text-white shadow-sm' : 'text-[#8C8FA3]'
            }`}
          >
            {col.label.split(' ')[0]}
            <span className="ml-1 opacity-80">({col.items.length})</span>
          </button>
        ))}
      </div>

      {/* Kanban Board — Desktop: 4 columns, Mobile: single column */}
      <div className="flex-1 min-h-0">
        {/* Desktop */}
        <div className="hidden lg:grid grid-cols-4 gap-4 h-full">
          {columnData.map((col) => (
            <KanbanColumn
              key={col.id}
              column={col}
              actionLoading={actionLoading}
              onDispatch={handleDispatch}
              onVerifyReturn={handleVerifyReturn}
              onCancel={handleCancel}
              onAddItems={openAddItems}
              onCardClick={(id) => router.push(`/truck-loads/${id}`)}
            />
          ))}
        </div>
        {/* Mobile */}
        <div className="lg:hidden h-full overflow-y-auto space-y-2 pb-4">
          {columnData[activeTab].items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <Package className="w-10 h-10 text-[#D0D2DA] mb-3" />
              <p className="text-[14px] text-[#8C8FA3] font-medium">Ачилт байхгүй</p>
            </div>
          ) : (
            columnData[activeTab].items.map((load) => (
              <KanbanCard
                key={load.id}
                load={load}
                columnStatus={columnData[activeTab].status}
                actionLoading={actionLoading}
                onDispatch={handleDispatch}
                onVerifyReturn={handleVerifyReturn}
                onCancel={handleCancel}
                onAddItems={openAddItems}
                onClick={() => router.push(`/truck-loads/${load.id}`)}
              />
            ))
          )}
        </div>
      </div>

      {/* New Load Sheet/Overlay */}
      {showForm && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setShowForm(false); resetForm(); }} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-ios-slide-right" style={{ animationDuration: '0.3s' }}>
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-[#E8ECF0] flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-[#1A1D26]">Шинэ ачилт</h2>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 rounded-lg hover:bg-[#F5F6FA]">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Driver */}
              <div>
                <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Жолооч *</label>
                <select value={formDriverId} onChange={(e) => setFormDriverId(e.target.value)} className={inputClass}>
                  <option value="">Сонгох...</option>
                  {drivers.map((d: any) => (
                    <option key={d.id} value={d.id}>{d.firstName} {d.lastName} ({d.phone})</option>
                  ))}
                </select>
              </div>

              {/* Vehicle */}
              <div>
                <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Машин</label>
                <input
                  type="text"
                  value={formVehicle}
                  onChange={(e) => setFormVehicle(e.target.value)}
                  placeholder="Машины дугаар, нэр..."
                  className={inputClass}
                />
              </div>

              {/* Date */}
              <div>
                <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Огноо</label>
                <input type="date" value={formDate} onChange={(e) => setFormDate(e.target.value)} className={inputClass} />
              </div>

              {/* Notes */}
              <div>
                <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Тэмдэглэл</label>
                <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Нэмэлт мэдээлэл..." className={inputClass} />
              </div>

              {/* Product Grid — All products with stock */}
              <ProductGrid
                products={products}
                selectedItems={formItems}
                onUpdate={(items) => setFormItems(items)}
              />

              {/* Submit */}
              <button
                onClick={handleCreateLoad}
                disabled={submitting || !formDriverId || formItems.length === 0}
                className="w-full py-3 rounded-xl bg-[#007AFF] text-white text-[14px] font-semibold shadow-md shadow-[#007AFF]/25 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0066D6] transition-colors"
              >
                {submitting ? 'Үүсгэж байна...' : 'Ачилт үүсгэх'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Sheet */}
      {addItemsLoadId && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => { setAddItemsLoadId(null); setAddItemsFormItems([]); }} />
          <div className="relative w-full max-w-md bg-white h-full shadow-2xl overflow-y-auto animate-ios-slide-right" style={{ animationDuration: '0.3s' }}>
            <div className="sticky top-0 bg-white z-10 px-5 py-4 border-b border-[#E8ECF0] flex items-center justify-between">
              <h2 className="text-[17px] font-bold text-[#1A1D26]">Нэмэлт ачилт</h2>
              <button onClick={() => { setAddItemsLoadId(null); setAddItemsFormItems([]); }} className="p-2 rounded-lg hover:bg-[#F5F6FA]">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="p-3 rounded-xl bg-[#FFF7ED] border border-[#FDE68A]">
                <p className="text-[12px] text-[#92400E] font-medium">
                  Одоо байгаа ачилтад нэмэлт бараа нэмэх. Агуулахаас бараа шууд хасагдана.
                </p>
              </div>

              {/* Product Grid — All products with stock */}
              <ProductGrid
                products={products}
                selectedItems={addItemsFormItems}
                onUpdate={(items) => setAddItemsFormItems(items)}
              />

              <button
                onClick={handleAddItemsSubmit}
                disabled={submitting || addItemsFormItems.length === 0}
                className="w-full py-3 rounded-xl bg-[#F59E0B] text-white text-[14px] font-semibold shadow-md shadow-[#F59E0B]/25 disabled:opacity-50 hover:bg-[#D97706] transition-colors"
              >
                {submitting ? 'Нэмж байна...' : 'Нэмэлт бараа нэмэх'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ====================== KANBAN COLUMN ======================
function KanbanColumn({
  column,
  actionLoading,
  onDispatch,
  onVerifyReturn,
  onCancel,
  onAddItems,
  onCardClick,
}: {
  column: { id: string; label: string; status: string; color: string; bg: string; border: string; items: TruckLoad[] };
  actionLoading: string | null;
  onDispatch: (id: string) => void;
  onVerifyReturn: (id: string) => void;
  onCancel: (id: string) => void;
  onAddItems: (id: string) => void;
  onCardClick: (id: string) => void;
}) {
  return (
    <div className="flex flex-col h-full">
      {/* Column Header */}
      <div
        className="flex items-center gap-2 px-3 py-3 rounded-t-2xl border border-b-0"
        style={{ background: column.bg, borderColor: column.border }}
      >
        <div className="w-2.5 h-2.5 rounded-full" style={{ background: column.color }} />
        <span className="text-[13px] font-bold" style={{ color: column.color }}>{column.label}</span>
        <span
          className="ml-auto text-[11px] font-bold px-2 py-0.5 rounded-full"
          style={{ background: `${column.color}20`, color: column.color }}
        >
          {column.items.length}
        </span>
      </div>

      {/* Column Body */}
      <div
        className="flex-1 overflow-y-auto p-2 space-y-2 rounded-b-2xl border border-t-0"
        style={{ borderColor: column.border, background: `${column.bg}80` }}
      >
        {column.items.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 opacity-50">
            <Package className="w-8 h-8 text-[#D0D2DA] mb-2" />
            <p className="text-[12px] text-[#8C8FA3]">Хоосон</p>
          </div>
        ) : (
          column.items.map((load) => (
            <KanbanCard
              key={load.id}
              load={load}
              columnStatus={column.status}
              actionLoading={actionLoading}
              onDispatch={onDispatch}
              onVerifyReturn={onVerifyReturn}
              onCancel={onCancel}
              onAddItems={onAddItems}
              onClick={() => onCardClick(load.id)}
            />
          ))
        )}
      </div>
    </div>
  );
}

// ====================== KANBAN CARD ======================
function KanbanCard({
  load,
  columnStatus,
  actionLoading,
  onDispatch,
  onVerifyReturn,
  onCancel,
  onAddItems,
  onClick,
}: {
  load: TruckLoad;
  columnStatus: string;
  actionLoading: string | null;
  onDispatch: (id: string) => void;
  onVerifyReturn: (id: string) => void;
  onCancel: (id: string) => void;
  onAddItems: (id: string) => void;
  onClick: () => void;
}) {
  const isActioning = actionLoading === load.id;
  const driverName = `${load.driver?.lastName ?? ''} ${load.driver?.firstName ?? ''}`.trim();
  const items = load.items ?? [];
  const totalLoaded = items.reduce((s, i) => s + i.loadedQty, 0);
  const totalSold = items.reduce((s, i) => s + i.soldQty, 0);
  const totalReturned = items.reduce((s, i) => s + i.returnedQty, 0);
  const totalDamaged = items.reduce((s, i) => s + i.damagedQty, 0);
  const salesCount = load._count?.sales ?? load.sales?.length ?? 0;
  const salesTotal = (load.sales ?? []).reduce((s: number, sale: any) => s + Number(sale.totalAmount ?? 0), 0);
  const isArchive = columnStatus === 'ARCHIVE';
  const isCompletionRequested = load.status === 'COMPLETION_REQUESTED';

  return (
    <div
      className={`bg-white rounded-xl border p-3 cursor-pointer hover:shadow-md transition-all group ${
        isCompletionRequested
          ? 'border-2 border-[#EF4444] shadow-lg shadow-[#EF4444]/20 ring-2 ring-[#EF4444]/20 animate-pulse'
          : 'border-[#E8ECF0] hover:border-[#007AFF]/30'
      } ${isArchive ? 'opacity-70' : ''} ${isActioning ? 'opacity-60 pointer-events-none' : ''}`}
      onClick={onClick}
    >
      {/* Completion request banner */}
      {isCompletionRequested && (
        <div className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg bg-[#FEF2F2] border border-[#FECACA] mb-2 text-[11px] font-bold text-[#B91C1C]">
          <AlertTriangle className="w-3.5 h-3.5" />
          ДУУСГАХ ХҮСЭЛТ — Батлахыг хүлээж байна
        </div>
      )}

      {/* Old date warning */}
      {!isArchive && !isCompletionRequested && new Date(load.loadDate).toISOString().split('T')[0] < new Date().toISOString().split('T')[0] && (
        <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#FEF3C7] border border-[#FDE68A] mb-2 text-[10px] font-semibold text-[#92400E]">
          <AlertTriangle className="w-3 h-3" />
          {new Date(load.loadDate).toLocaleDateString('mn-MN')} — өмнөх өдрийн ачилт
        </div>
      )}

      {/* Top row */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[14px] font-bold text-[#007AFF]">#{load.loadNumber}</span>
        <span className="text-[10px] text-[#8C8FA3]">
          {new Date(load.dispatchedAt ?? load.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' })}
        </span>
      </div>

      {/* Driver */}
      <div className="flex items-center gap-1.5 mb-1">
        <User className="w-3.5 h-3.5 text-[#8C8FA3]" />
        <span className="text-[12px] font-medium text-[#4A4D5C] truncate">{driverName || 'Жолооч'}</span>
        {load.driver?.phone && (
          <span className="text-[10px] text-[#A0A3B1] ml-auto">{load.driver.phone}</span>
        )}
      </div>

      {/* Vehicle */}
      {load.vehicleInfo && (
        <div className="flex items-center gap-1.5 mb-1">
          <Truck className="w-3.5 h-3.5 text-[#8C8FA3]" />
          <span className="text-[11px] text-[#8C8FA3]">{load.vehicleInfo}</span>
        </div>
      )}

      {/* Archive: show date */}
      {isArchive && (
        <div className="flex items-center gap-1.5 mb-1">
          <Calendar className="w-3.5 h-3.5 text-[#8C8FA3]" />
          <span className="text-[11px] text-[#8C8FA3]">{new Date(load.loadDate).toLocaleDateString('mn-MN')}</span>
          <span
            className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: load.status === 'CANCELLED' ? '#FEF2F2' : '#ECFDF5',
              color: load.status === 'CANCELLED' ? '#EF4444' : '#10B981',
            }}
          >
            {load.status === 'CANCELLED' ? 'Цуцалсан' : 'Дууссан'}
          </span>
        </div>
      )}

      {/* Summary */}
      <div className="flex items-center gap-3 mt-2 mb-2">
        <div className="flex items-center gap-1">
          <Package className="w-3 h-3 text-[#007AFF]" />
          <span className="text-[11px] font-semibold text-[#4A4D5C]">{items.length} бараа</span>
        </div>
        <span className="text-[11px] text-[#A0A3B1]">·</span>
        <span className="text-[11px] font-semibold text-[#4A4D5C]">{totalLoaded} ш</span>
      </div>

      {/* DISPATCHED: sold progress */}
      {load.status === 'DISPATCHED' && totalLoaded > 0 && (
        <div className="mb-2">
          <div className="flex justify-between text-[10px] mb-1">
            <span className="text-[#8C8FA3]">Зарагдсан</span>
            <span className="font-bold text-[#4A4D5C]">{totalSold}/{totalLoaded}</span>
          </div>
          <div className="w-full h-1.5 bg-[#E8ECF0] rounded-full overflow-hidden">
            <div className="h-full bg-[#10B981] rounded-full transition-all" style={{ width: `${Math.min(100, (totalSold / totalLoaded) * 100)}%` }} />
          </div>
        </div>
      )}

      {/* COMPLETED: summary stats */}
      {load.status === 'COMPLETED' && !isArchive && (
        <div className="grid grid-cols-4 gap-1 mb-2">
          {[
            { label: 'Ачсан', val: totalLoaded, color: '#007AFF' },
            { label: 'Зарсан', val: totalSold, color: '#10B981' },
            { label: 'Буцсан', val: totalReturned, color: '#F59E0B' },
            { label: 'Гэмтсэн', val: totalDamaged, color: '#EF4444' },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-[13px] font-bold" style={{ color: s.color }}>{s.val}</div>
              <div className="text-[9px] text-[#A0A3B1]">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Sales info */}
      {salesCount > 0 && (
        <div className="flex items-center gap-1.5 text-[11px] text-[#8C8FA3] mb-2">
          <DollarSign className="w-3 h-3" />
          <span>{salesCount} борлуулалт</span>
          <span className="ml-auto font-bold text-[#1A1D26]">₮{salesTotal.toLocaleString()}</span>
        </div>
      )}

      {/* Action Buttons — stop propagation so card click doesn't fire */}
      {!isArchive && (
        <div className="flex gap-1.5 mt-2 pt-2 border-t border-[#F2F4F7]" onClick={(e) => e.stopPropagation()}>
          {load.status === 'LOADING' && (
            <>
              <button
                onClick={() => onDispatch(load.id)}
                disabled={isActioning}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#F59E0B] text-white text-[11px] font-semibold hover:bg-[#D97706] transition-colors disabled:opacity-50"
              >
                <Send className="w-3 h-3" /> Илгээх
              </button>
              <button
                onClick={() => onCancel(load.id)}
                disabled={isActioning}
                className="p-2 rounded-lg border border-[#E8ECF0] text-[#EF4444] hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
          {load.status === 'DISPATCHED' && (
            <>
              <button
                onClick={() => onAddItems(load.id)}
                disabled={isActioning}
                className="flex items-center justify-center gap-1 py-2 px-2.5 rounded-lg bg-[#007AFF] text-white text-[11px] font-semibold hover:bg-[#0066D6] transition-colors disabled:opacity-50"
              >
                <Plus className="w-3 h-3" /> Нэмэх
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); onClick(); }}
                className="flex-1 flex items-center justify-center gap-1 py-2 rounded-lg bg-[#10B981] text-white text-[11px] font-semibold hover:bg-[#059669] transition-colors"
              >
                <CheckCircle className="w-3 h-3" /> Дуусгах
              </button>
              <button
                onClick={() => onCancel(load.id)}
                disabled={isActioning}
                className="p-2 rounded-lg border border-[#E8ECF0] text-[#EF4444] hover:bg-[#FEF2F2] transition-colors disabled:opacity-50"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ====================== PRODUCT GRID ======================
// Shows ALL products as a grid. Each product card shows stock, +/- qty controls.
function ProductGrid({
  products,
  selectedItems,
  onUpdate,
}: {
  products: any[];
  selectedItems: { productId: string; productName: string; loadedQty: number; unitsPerBox: number }[];
  onUpdate: (items: { productId: string; productName: string; loadedQty: number; unitsPerBox: number }[]) => void;
}) {
  const [search, setSearch] = useState('');

  const filtered = products.filter((p: any) =>
    !search || p.name.toLowerCase().includes(search.toLowerCase()) || (p.sku ?? '').toLowerCase().includes(search.toLowerCase())
  );

  const getQty = (productId: string) => selectedItems.find((fi) => fi.productId === productId)?.loadedQty ?? 0;

  const setQty = (product: any, newQty: number) => {
    if (newQty <= 0) {
      onUpdate(selectedItems.filter((fi) => fi.productId !== product.id));
    } else {
      const existing = selectedItems.find((fi) => fi.productId === product.id);
      if (existing) {
        onUpdate(selectedItems.map((fi) => fi.productId === product.id ? { ...fi, loadedQty: newQty } : fi));
      } else {
        onUpdate([...selectedItems, {
          productId: product.id,
          productName: product.name,
          loadedQty: newQty,
          unitsPerBox: product.unitsPerBox ?? 1,
        }]);
      }
    }
  };

  const addBox = (product: any) => {
    const upb = product.unitsPerBox ?? 1;
    const current = getQty(product.id);
    setQty(product, current + upb);
  };

  const totalSelected = selectedItems.reduce((s, fi) => s + fi.loadedQty, 0);

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <label className="text-[11px] font-bold text-[#8C8FA3] uppercase">
          Бараа сонгох
        </label>
        {selectedItems.length > 0 && (
          <span className="text-[11px] font-bold text-[#007AFF]">
            {selectedItems.length} бараа · {totalSelected} ш
          </span>
        )}
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Бараа хайх..."
          className="w-full px-3 py-2 pl-9 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[13px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
        />
        <Package className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#A0A3B1]" />
      </div>

      {/* Product list */}
      <div className="space-y-1.5 max-h-[400px] overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-6 text-[13px] text-[#A0A3B1]">Бараа олдсонгүй</div>
        ) : (
          filtered.map((p: any) => {
            const qty = getQty(p.id);
            const upb = p.unitsPerBox ?? 1;
            const stock = p.stockAvailable ?? 0;
            const boxes = upb > 1 ? Math.floor(qty / upb) : 0;
            const pieces = upb > 1 ? qty % upb : qty;
            const isSelected = qty > 0;

            return (
              <div
                key={p.id}
                className={`rounded-xl border p-3 transition-all ${
                  isSelected
                    ? 'bg-[#EFF6FF] border-[#007AFF]/30'
                    : 'bg-white border-[#E8ECF0] hover:border-[#D0D2DA]'
                }`}
              >
                {/* Product info row */}
                <div className="flex items-start justify-between mb-1.5">
                  <div className="flex-1 min-w-0 mr-2">
                    <p className="text-[13px] font-semibold text-[#1A1D26] leading-tight truncate">{p.name}</p>
                    <p className="text-[10px] text-[#A0A3B1] mt-0.5">{p.sku}</p>
                  </div>
                  {/* Stock badge */}
                  <div className={`text-right shrink-0 px-2 py-0.5 rounded-lg ${stock > 0 ? 'bg-[#ECFDF5]' : 'bg-[#FEF2F2]'}`}>
                    <span className={`text-[12px] font-bold ${stock > 0 ? 'text-[#10B981]' : 'text-[#EF4444]'}`}>
                      {stock}
                    </span>
                    <span className="text-[9px] text-[#8C8FA3] ml-0.5">нөөц</span>
                  </div>
                </div>

                {/* Price + box info */}
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[11px] font-semibold text-[#4A4D5C]">₮{Number(p.sellingPrice ?? 0).toLocaleString()}</span>
                  {upb > 1 && (
                    <span className="text-[10px] text-[#A0A3B1] bg-[#F5F6FA] px-1.5 py-0.5 rounded">{upb} ш/хайрцаг</span>
                  )}
                </div>

                {/* Qty controls */}
                <div className="flex items-center gap-2">
                  {/* Add box button */}
                  {upb > 1 && (
                    <button
                      onClick={() => addBox(p)}
                      disabled={stock <= 0}
                      className="px-2.5 py-1.5 rounded-lg bg-[#007AFF] text-white text-[10px] font-bold hover:bg-[#0066D6] disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                    >
                      +1 хайрцаг
                    </button>
                  )}

                  {/* +/- unit buttons */}
                  <div className="flex items-center gap-0 ml-auto">
                    <button
                      onClick={() => setQty(p, qty - 1)}
                      disabled={qty <= 0}
                      className="w-8 h-8 rounded-l-lg bg-[#F5F6FA] border border-[#E8ECF0] flex items-center justify-center text-[#4A4D5C] font-bold hover:bg-[#E8ECF0] disabled:opacity-30 transition-colors"
                    >
                      −
                    </button>
                    <input
                      type="number"
                      min={0}
                      value={qty || ''}
                      onChange={(e) => setQty(p, Math.max(0, parseInt(e.target.value) || 0))}
                      placeholder="0"
                      className="w-14 h-8 text-center border-y border-[#E8ECF0] text-[13px] font-bold text-[#1A1D26] outline-none bg-white"
                    />
                    <button
                      onClick={() => setQty(p, qty + 1)}
                      disabled={stock <= 0}
                      className="w-8 h-8 rounded-r-lg bg-[#F5F6FA] border border-[#E8ECF0] flex items-center justify-center text-[#4A4D5C] font-bold hover:bg-[#E8ECF0] disabled:opacity-30 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Show selected qty breakdown */}
                {isSelected && upb > 1 && (
                  <div className="mt-1.5 text-[10px] text-[#007AFF] font-semibold">
                    = {boxes} хайрцаг + {pieces} ширхэг
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
