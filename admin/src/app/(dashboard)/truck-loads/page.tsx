'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import {
  Truck, Plus, Package, Calendar, User, Phone,
  RefreshCw, X, Send, CheckCircle, Ban, Hash,
  ChevronRight, DollarSign, Clock, Archive,
  PackageCheck, ShoppingBag, AlertTriangle,
  Search, Filter, ImageOff,
} from 'lucide-react';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

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
  const [categories, setCategories] = useState<any[]>([]);
  const [formDriverId, setFormDriverId] = useState('');
  const [formVehicle, setFormVehicle] = useState('');
  const [formDate, setFormDate] = useState(today);
  const [formLocationType, setFormLocationType] = useState<'URBAN' | 'RURAL'>('URBAN');
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
      api.get('/api/categories'),
    ]).then(([dRes, pRes, cRes]) => {
      setDrivers(dRes.data?.data ?? dRes.data ?? []);
      setProducts((pRes.data?.data ?? pRes.data ?? []).filter((p: any) => p.isActive));
      setCategories(cRes.data?.data ?? cRes.data ?? []);
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
        locationType: formLocationType,
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
    setFormLocationType('URBAN');
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

      {/* New Load Full-Screen Modal */}
      {showForm && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1400px] h-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E8ECF0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
                  <Truck className="w-5 h-5 text-[#007AFF]" />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#1A1D26]">Шинэ ачилт үүсгэх</h2>
                  <p className="text-[11px] text-[#8C8FA3]">Бараа сонгож, жолоочид хуваарилна</p>
                </div>
              </div>
              <button onClick={() => { setShowForm(false); resetForm(); }} className="p-2 rounded-lg hover:bg-[#F5F6FA]">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            {/* Body — 2 column layout: left product grid, right form */}
            <div className="flex-1 flex flex-col lg:flex-row overflow-hidden min-h-0">
              {/* LEFT: Product Grid */}
              <div className="flex-1 overflow-hidden flex flex-col min-w-0 border-r border-[#E8ECF0]">
                <ProductGrid
                  products={products}
                  categories={categories}
                  selectedItems={formItems}
                  onUpdate={(items) => setFormItems(items)}
                />
              </div>

              {/* RIGHT: Form */}
              <div className="w-full lg:w-[360px] shrink-0 overflow-y-auto bg-[#FAFBFC]">
                <div className="p-5 space-y-4">
                  {/* Driver */}
                  <div>
                    <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Жолооч *</label>
                    {drivers.length === 0 ? (
                      <a href="/drivers" className="block px-4 py-2.5 rounded-xl bg-[#FEF2F2] border border-[#FECACA] text-[13px] text-[#B91C1C] font-medium hover:bg-[#FECDD3] transition-all">
                        ⚠️ Жолооч бүртгээгүй байна. Эхлээд жолооч бүртгэнэ үү. <span className="underline font-bold">Жолооч бүртгэх</span>
                      </a>
                    ) : (
                      <select value={formDriverId} onChange={(e) => setFormDriverId(e.target.value)} className={inputClass}>
                        <option value="">Сонгох...</option>
                        {drivers.map((d: any) => (
                          <option key={d.id} value={d.id}>{d.firstName} {d.lastName} ({d.phone})</option>
                        ))}
                      </select>
                    )}
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

                  {/* Location type */}
                  <div>
                    <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Ачилтын төрөл *</label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setFormLocationType('URBAN')}
                        className={`px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border-2 ${
                          formLocationType === 'URBAN'
                            ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-md'
                            : 'bg-white text-[#4A4D5C] border-[#E5E5EA] hover:border-[#007AFF]/40'
                        }`}
                      >
                        🏙️ Мөрөн
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormLocationType('RURAL')}
                        className={`px-3 py-2.5 rounded-xl text-[13px] font-semibold transition-all border-2 ${
                          formLocationType === 'RURAL'
                            ? 'bg-[#34C759] text-white border-[#34C759] shadow-md'
                            : 'bg-white text-[#4A4D5C] border-[#E5E5EA] hover:border-[#34C759]/40'
                        }`}
                      >
                        🏞️ Орон нутаг
                      </button>
                    </div>
                    <p className="text-[10px] text-[#8C8FA3] mt-1">
                      {formLocationType === 'URBAN' ? 'Жолоочийн POS-д Мөрөн үнэ хэрэглэгдэнэ' : 'Жолоочийн POS-д орон нутгийн үнэ хэрэглэгдэнэ'}
                    </p>
                  </div>

                  {/* Notes */}
                  <div>
                    <label className="text-[11px] font-bold text-[#8C8FA3] uppercase mb-1.5 block">Тэмдэглэл</label>
                    <input type="text" value={formNotes} onChange={(e) => setFormNotes(e.target.value)} placeholder="Нэмэлт мэдээлэл..." className={inputClass} />
                  </div>

                  {/* Selected summary */}
                  {formItems.length > 0 && (
                    <div className="bg-white rounded-xl border border-[#E8ECF0] p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] font-bold text-[#8C8FA3] uppercase">Сонгогдсон</span>
                        <span className="text-[12px] font-bold text-[#007AFF]">
                          {formItems.length} бараа · {formItems.reduce((s, i) => s + i.loadedQty, 0)} ш
                        </span>
                      </div>
                      <div className="space-y-1 max-h-[160px] overflow-y-auto">
                        {formItems.map((fi) => (
                          <div key={fi.productId} className="flex items-center justify-between text-[12px]">
                            <span className="text-[#4A4D5C] truncate flex-1 mr-2">{fi.productName}</span>
                            <span className="font-bold text-[#1A1D26]">{fi.loadedQty} ш</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#E8ECF0] flex items-center justify-between gap-3 shrink-0 bg-white">
              <div className="text-[12px] text-[#8C8FA3]">
                {formItems.length === 0 ? 'Бараа сонгоно уу' : `${formItems.length} бараа · нийт ${formItems.reduce((s, i) => s + i.loadedQty, 0)} ш`}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setShowForm(false); resetForm(); }}
                  className="px-5 py-2.5 rounded-xl bg-[#F5F6FA] text-[#8C8FA3] font-semibold text-[13px] hover:bg-[#E8ECF0]"
                >
                  Цуцлах
                </button>
                <button
                  onClick={handleCreateLoad}
                  disabled={submitting || !formDriverId || formItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-[#007AFF] text-white text-[13px] font-semibold shadow-md shadow-[#007AFF]/25 disabled:opacity-50 disabled:cursor-not-allowed hover:bg-[#0066D6] transition-colors flex items-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  {submitting ? 'Үүсгэж байна...' : 'Ачилт үүсгэх'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Items Full-Screen Modal */}
      {addItemsLoadId && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm p-4 flex items-center justify-center">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-[1200px] h-full max-h-[92vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="px-6 py-4 border-b border-[#E8ECF0] flex items-center justify-between shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#F59E0B]/10 flex items-center justify-center">
                  <Package className="w-5 h-5 text-[#F59E0B]" />
                </div>
                <div>
                  <h2 className="text-[18px] font-bold text-[#1A1D26]">Нэмэлт бараа нэмэх</h2>
                  <p className="text-[11px] text-[#8C8FA3]">Одоо байгаа ачилтад нэмэлт бараа. Агуулахаас шууд хасагдана.</p>
                </div>
              </div>
              <button onClick={() => { setAddItemsLoadId(null); setAddItemsFormItems([]); }} className="p-2 rounded-lg hover:bg-[#F5F6FA]">
                <X className="w-5 h-5 text-[#8C8FA3]" />
              </button>
            </div>

            {/* Body — Product Grid */}
            <div className="flex-1 overflow-hidden min-h-0">
              <ProductGrid
                products={products}
                categories={categories}
                selectedItems={addItemsFormItems}
                onUpdate={(items) => setAddItemsFormItems(items)}
              />
            </div>

            {/* Footer */}
            <div className="px-6 py-4 border-t border-[#E8ECF0] flex items-center justify-between gap-3 shrink-0 bg-white">
              <div className="text-[12px] text-[#8C8FA3]">
                {addItemsFormItems.length === 0 ? 'Бараа сонгоно уу' : `${addItemsFormItems.length} бараа · нийт ${addItemsFormItems.reduce((s, i) => s + i.loadedQty, 0)} ш`}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => { setAddItemsLoadId(null); setAddItemsFormItems([]); }}
                  className="px-5 py-2.5 rounded-xl bg-[#F5F6FA] text-[#8C8FA3] font-semibold text-[13px] hover:bg-[#E8ECF0]"
                >
                  Цуцлах
                </button>
                <button
                  onClick={handleAddItemsSubmit}
                  disabled={submitting || addItemsFormItems.length === 0}
                  className="px-6 py-2.5 rounded-xl bg-[#F59E0B] text-white text-[13px] font-semibold shadow-md shadow-[#F59E0B]/25 disabled:opacity-50 hover:bg-[#D97706] transition-colors flex items-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  {submitting ? 'Нэмж байна...' : 'Нэмэлт бараа нэмэх'}
                </button>
              </div>
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
// Full grid layout with image, stock, direct qty input, category filter
function ProductGrid({
  products,
  categories = [],
  selectedItems,
  onUpdate,
}: {
  products: any[];
  categories?: any[];
  selectedItems: { productId: string; productName: string; loadedQty: number; unitsPerBox: number }[];
  onUpdate: (items: { productId: string; productName: string; loadedQty: number; unitsPerBox: number }[]) => void;
}) {
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [stockFilter, setStockFilter] = useState<'all' | 'in_stock'>('all');
  // Per-product input mode toggle: 'box' (default if upb>1) or 'piece'
  const [inputMode, setInputMode] = useState<Record<string, 'box' | 'piece'>>({});
  const getMode = (p: any): 'box' | 'piece' => {
    if (inputMode[p.id]) return inputMode[p.id];
    return (p.unitsPerBox ?? 1) > 1 ? 'box' : 'piece';
  };
  const setMode = (productId: string, mode: 'box' | 'piece') => {
    setInputMode(prev => ({ ...prev, [productId]: mode }));
  };

  const filtered = products.filter((p: any) => {
    if (search) {
      const q = search.toLowerCase();
      if (!p.name?.toLowerCase().includes(q) && !p.sku?.toLowerCase().includes(q)) return false;
    }
    if (categoryId && p.categoryId !== categoryId && p.category?.id !== categoryId) return false;
    if (stockFilter === 'in_stock' && (p.stockAvailable ?? 0) <= 0) return false;
    return true;
  });

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

  const totalSelected = selectedItems.reduce((s, fi) => s + fi.loadedQty, 0);

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar: search + filters */}
      <div className="px-5 py-3 border-b border-[#E8ECF0] bg-white shrink-0">
        <div className="flex items-center gap-2 mb-3">
          {/* Search */}
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#A0A3B1]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Бараа хайх (нэр, баркод)..."
              className="w-full pl-9 pr-3 py-2 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[13px] text-[#1A1D26] placeholder-[#A0A3B1] outline-none focus:border-[#007AFF] focus:ring-2 focus:ring-[#007AFF]/15"
            />
          </div>

          {/* Stock toggle */}
          <div className="flex items-center gap-1 bg-[#F5F6FA] rounded-xl p-1 border border-[#E8ECF0]">
            <button
              type="button"
              onClick={() => setStockFilter('all')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                stockFilter === 'all' ? 'bg-white text-[#1A1D26] shadow-sm' : 'text-[#8C8FA3]'
              }`}
            >
              Бүгд
            </button>
            <button
              type="button"
              onClick={() => setStockFilter('in_stock')}
              className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold transition-all ${
                stockFilter === 'in_stock' ? 'bg-white text-[#10B981] shadow-sm' : 'text-[#8C8FA3]'
              }`}
            >
              Нөөцтэй
            </button>
          </div>

          <div className="text-[11px] font-semibold text-[#007AFF] whitespace-nowrap">
            {selectedItems.length > 0 ? `${selectedItems.length} бараа · ${totalSelected} ш` : `${filtered.length} бараа`}
          </div>
        </div>

        {/* Category chips */}
        {categories.length > 0 && (
          <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1">
            <button
              type="button"
              onClick={() => setCategoryId('')}
              className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border ${
                categoryId === ''
                  ? 'bg-[#007AFF] text-white border-[#007AFF]'
                  : 'bg-white text-[#4A4D5C] border-[#E8ECF0] hover:border-[#007AFF]/40'
              }`}
            >
              Бүх ангилал
            </button>
            {categories.map((c: any) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setCategoryId(c.id)}
                className={`px-3 py-1.5 rounded-full text-[11px] font-semibold whitespace-nowrap transition-all border ${
                  categoryId === c.id
                    ? 'bg-[#007AFF] text-white border-[#007AFF]'
                    : 'bg-white text-[#4A4D5C] border-[#E8ECF0] hover:border-[#007AFF]/40'
                }`}
              >
                {c.name}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Grid */}
      <div className="flex-1 overflow-y-auto p-5 bg-[#FAFBFC] min-h-0">
        {filtered.length === 0 ? (
          <div className="text-center py-16 text-[13px] text-[#A0A3B1]">
            <Package className="w-12 h-12 text-[#E8ECF0] mx-auto mb-2" />
            Бараа олдсонгүй
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((p: any) => {
              const qty = getQty(p.id);
              const upb = p.unitsPerBox ?? 1;
              const stock = p.stockAvailable ?? 0;
              const isSelected = qty > 0;
              const boxes = upb > 1 ? Math.floor(qty / upb) : 0;
              const pieces = upb > 1 ? qty % upb : qty;

              return (
                <div
                  key={p.id}
                  className={`rounded-xl border-2 overflow-hidden transition-all flex flex-col ${
                    isSelected
                      ? 'border-[#007AFF] shadow-md shadow-[#007AFF]/15 bg-white'
                      : stock > 0
                      ? 'border-[#E8ECF0] bg-white hover:border-[#007AFF]/40'
                      : 'border-[#E8ECF0] bg-[#F5F6FA] opacity-75'
                  }`}
                >
                  {/* Image */}
                  <div className="relative w-full aspect-square bg-[#F5F6FA] flex items-center justify-center">
                    {p.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={`${API_URL}${p.imageUrl}`}
                        alt={p.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <ImageOff className="w-10 h-10 text-[#D0D2DA]" />
                    )}
                    {/* Stock badge overlay */}
                    <div className={`absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-md text-[10px] font-bold ${
                      stock > 0 ? 'bg-[#10B981] text-white' : 'bg-[#EF4444] text-white'
                    }`}>
                      {stock} нөөц
                    </div>
                    {isSelected && (
                      <div className="absolute top-1.5 left-1.5 w-6 h-6 rounded-full bg-[#007AFF] text-white flex items-center justify-center text-[10px] font-bold shadow-md">
                        ✓
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="p-2.5 flex-1 flex flex-col">
                    <p className="text-[12px] font-semibold text-[#1A1D26] leading-tight line-clamp-2 min-h-[30px]">
                      {p.name}
                    </p>
                    <div className="flex items-center justify-between mt-1 mb-2">
                      <span className="text-[11px] font-semibold text-[#4A4D5C]">
                        ₮{Number(p.sellingPrice ?? 0).toLocaleString()}
                      </span>
                      {upb > 1 && (
                        <span className="text-[9px] text-[#8C8FA3] bg-[#F5F6FA] px-1 py-0.5 rounded">
                          {upb}ш/хайрцаг
                        </span>
                      )}
                    </div>

                    {/* Box/Piece toggle + qty input */}
                    <div className="mt-auto space-y-1.5">
                      {upb > 1 ? (
                        <div className="flex items-center gap-0 bg-[#F5F6FA] rounded-lg p-0.5 border border-[#E8ECF0]">
                          <button
                            type="button"
                            onClick={() => setMode(p.id, 'box')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                              getMode(p) === 'box'
                                ? 'bg-[#007AFF] text-white shadow-sm'
                                : 'text-[#8C8FA3] hover:text-[#4A4D5C]'
                            }`}
                          >
                            Хайрцаг
                          </button>
                          <button
                            type="button"
                            onClick={() => setMode(p.id, 'piece')}
                            className={`flex-1 py-1 rounded text-[10px] font-bold transition-all ${
                              getMode(p) === 'piece'
                                ? 'bg-[#FF9500] text-white shadow-sm'
                                : 'text-[#8C8FA3] hover:text-[#4A4D5C]'
                            }`}
                          >
                            Ширхэг
                          </button>
                        </div>
                      ) : (
                        <div className="text-center text-[9px] text-[#8C8FA3] font-semibold py-0.5">ширхэгээр</div>
                      )}

                      {(() => {
                        const mode = getMode(p);
                        const displayValue = mode === 'box' ? (qty > 0 ? Math.floor(qty / upb) : 0) : qty;
                        const placeholder = mode === 'box' ? 'хайрцаг' : 'ширхэг';
                        const accentColor = mode === 'box' ? '#007AFF' : '#FF9500';
                        return (
                          <div className="relative">
                            <input
                              type="number"
                              min={0}
                              value={displayValue || ''}
                              onChange={(e) => {
                                const v = Math.max(0, parseInt(e.target.value) || 0);
                                if (mode === 'box') {
                                  setQty(p, v * upb);
                                } else {
                                  setQty(p, v);
                                }
                              }}
                              onFocus={(e) => e.target.select()}
                              placeholder="0"
                              className={`w-full h-10 px-2 text-center rounded-lg border-2 text-[15px] font-bold outline-none transition-all ${
                                isSelected
                                  ? 'bg-white text-[#1A1D26]'
                                  : 'bg-white border-[#E8ECF0] text-[#1A1D26] focus:border-[#007AFF]'
                              }`}
                              style={isSelected ? { borderColor: accentColor, color: accentColor, backgroundColor: `${accentColor}08` } : undefined}
                            />
                            <span
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-[9px] font-bold pointer-events-none"
                              style={{ color: isSelected ? accentColor : '#A0A3B1' }}
                            >
                              {placeholder}
                            </span>
                          </div>
                        );
                      })()}

                      {isSelected && upb > 1 && (
                        <p className="text-[9px] text-[#007AFF] font-semibold text-center">
                          = {qty} ш {boxes > 0 ? `(${boxes} хайрцаг${pieces > 0 ? ` + ${pieces} ш` : ''})` : ''}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
