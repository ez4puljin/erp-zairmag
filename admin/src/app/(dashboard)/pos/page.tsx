'use client';

import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import api from '@/lib/api';
import {
  Truck,
  ShoppingCart,
  Plus,
  Minus,
  Trash2,
  Printer,
  RefreshCw,
  Package,
  User,
  MapPin,
  Phone,
  ChevronDown,
  Check,
  X,
  Loader2,
  Search,
  CreditCard,
  Banknote,
  Building2,
  Clock,
  Blend,
} from 'lucide-react';

interface TruckLoadItem {
  id: string;
  productId: string;
  product: {
    id: string;
    name: string;
    sku?: string;
    sellingPrice: number;
    unitsPerBox?: number;
  };
  loadedQty: number;
  soldQty: number;
  unitPrice: number;
}

interface TruckLoad {
  id: string;
  loadNumber: string;
  driver?: { id: string; firstName?: string; lastName?: string; name?: string; phone?: string };
  driverName?: string;
  items: TruckLoadItem[];
  status: string;
}

interface Customer {
  id: string;
  storeName: string;
  contactPerson?: string;
  contactName?: string;
  phone?: string;
  address?: string;
  region?: { name: string };
}

interface CartItem {
  productId: string;
  name: string;
  sku?: string;
  quantity: number;
  unitPrice: number;
  maxQty: number;
  unitsPerBox: number;
}

interface SaleResult {
  id: string;
  saleNumber: string;
  createdAt: string;
  customer: Customer;
  items: { product: { name: string; sku?: string }; quantity: number; unitPrice: number; lineTotal: number }[];
  totalAmount: number;
  paymentMethod: string;
  notes?: string;
  truckLoad?: { driver?: { name: string }; driverName?: string; loadNumber?: string };
  driverName?: string;
}

interface CombinedPayment {
  method: string;
  amount: number;
}

const PAYMENT_METHODS = [
  { value: 'CASH', label: 'Бэлэн', icon: Banknote, color: '#34C759' },
  { value: 'BANK_TRANSFER', label: 'Шилжүүлэг', icon: Building2, color: '#007AFF' },
  { value: 'CARD', label: 'Карт', icon: CreditCard, color: '#AF52DE' },
  { value: 'CREDIT', label: 'Дараа тооцоо', icon: Clock, color: '#FF9500' },
  { value: 'COMBINED', label: 'Хосолсон', icon: Blend, color: '#FF3B30' },
];

const COMBINED_METHODS = [
  { value: 'CASH', label: 'Бэлэн' },
  { value: 'BANK_TRANSFER', label: 'Шилжүүлэг' },
  { value: 'CARD', label: 'Карт' },
  { value: 'CREDIT', label: 'Дараа тооцоо' },
];

export default function POSPage() {
  // Data state
  const [truckLoad, setTruckLoad] = useState<TruckLoad | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [noActiveLoad, setNoActiveLoad] = useState(false);

  // Customer search state
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerList, setShowCustomerList] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState('');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Product search state
  const [productSearch, setProductSearch] = useState('');

  // Payment state
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [combinedPayments, setCombinedPayments] = useState<CombinedPayment[]>([
    { method: 'CASH', amount: 0 },
    { method: 'CREDIT', amount: 0 },
  ]);

  // Cart state
  const [cart, setCart] = useState<CartItem[]>([]);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResult | null>(null);

  // Load active truck load and customers
  const fetchData = useCallback(async () => {
    setLoading(true);
    setNoActiveLoad(false);
    try {
      const [loadRes, custRes] = await Promise.all([
        api.get('/api/truck-loads/driver/active'),
        api.get('/api/customers?limit=100'),
      ]);
      const load = loadRes.data?.data ?? loadRes.data;
      if (!load || (Array.isArray(load) && load.length === 0)) {
        setNoActiveLoad(true);
        setTruckLoad(null);
      } else {
        setTruckLoad(Array.isArray(load) ? load[0] : load);
      }
      setCustomers(custRes.data?.data ?? custRes.data ?? []);
    } catch (err: any) {
      console.error('POS fetch error:', err);
      setNoActiveLoad(true);
      setTruckLoad(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Close customer dropdown when clicking outside
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setShowCustomerList(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filtered customers
  const filteredCustomers = useMemo(() => {
    if (!customerSearch.trim()) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(
      (c) =>
        c.storeName?.toLowerCase().includes(q) ||
        c.contactPerson?.toLowerCase().includes(q) ||
        c.contactName?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.address?.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const selectCustomer = (c: Customer) => {
    setSelectedCustomerId(c.id);
    setSelectedCustomer(c);
    setCustomerSearch(c.storeName);
    setShowCustomerList(false);
  };

  const clearCustomer = () => {
    setSelectedCustomerId('');
    setSelectedCustomer(null);
    setCustomerSearch('');
  };

  // Derived: available products (remaining > 0)
  const availableProducts = (truckLoad?.items ?? []).filter(
    (item) => item.loadedQty - item.soldQty > 0
  );

  // Filtered products by search
  const filteredProducts = useMemo(() => {
    if (!productSearch.trim()) return availableProducts;
    const q = productSearch.toLowerCase();
    return availableProducts.filter(
      (item) =>
        item.product.name?.toLowerCase().includes(q) ||
        item.product.sku?.toLowerCase().includes(q)
    );
  }, [availableProducts, productSearch]);

  // Derived: summary
  const totalLoaded = (truckLoad?.items ?? []).reduce((s, i) => s + i.loadedQty, 0);
  const totalSold = (truckLoad?.items ?? []).reduce((s, i) => s + i.soldQty, 0);
  const totalRemaining = totalLoaded - totalSold;

  // Cart helpers
  const getCartItem = (productId: string) => cart.find((c) => c.productId === productId);

  const addToCart = (item: TruckLoadItem, qty = 1) => {
    const remaining = item.loadedQty - item.soldQty;
    const upb = item.product.unitsPerBox || 1;
    const existing = getCartItem(item.productId);
    if (existing) {
      const newQty = Math.min(existing.quantity + qty, remaining);
      setCart((prev) =>
        prev.map((c) =>
          c.productId === item.productId ? { ...c, quantity: newQty, maxQty: remaining } : c
        )
      );
    } else {
      setCart((prev) => [
        ...prev,
        {
          productId: item.productId,
          name: item.product.name,
          sku: item.product.sku,
          quantity: Math.min(qty, remaining),
          unitPrice: item.unitPrice || item.product.sellingPrice,
          maxQty: remaining,
          unitsPerBox: upb,
        },
      ]);
    }
  };

  const addBoxToCart = (item: TruckLoadItem) => {
    const upb = item.product.unitsPerBox || 1;
    addToCart(item, upb);
  };

  const updateCartQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => {
          if (c.productId !== productId) return c;
          const newQty = c.quantity + delta;
          if (newQty <= 0) return null as any;
          if (newQty > c.maxQty) return c;
          return { ...c, quantity: newQty };
        })
        .filter(Boolean)
    );
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((c) => c.productId !== productId));
  };

  const cartTotal = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);

  // Combined payment helpers
  const combinedTotal = combinedPayments.reduce((s, p) => s + p.amount, 0);
  const combinedRemaining = cartTotal - combinedTotal;

  const updateCombinedPayment = (index: number, field: 'method' | 'amount', value: any) => {
    setCombinedPayments((prev) =>
      prev.map((p, i) => (i === index ? { ...p, [field]: field === 'amount' ? Number(value) || 0 : value } : p))
    );
  };

  const addCombinedRow = () => {
    setCombinedPayments((prev) => [...prev, { method: 'CASH', amount: 0 }]);
  };

  const removeCombinedRow = (index: number) => {
    if (combinedPayments.length <= 2) return;
    setCombinedPayments((prev) => prev.filter((_, i) => i !== index));
  };

  // Auto-fill last combined row remainder
  const autoFillLastCombined = () => {
    if (combinedPayments.length < 2) return;
    const othersTotal = combinedPayments.slice(0, -1).reduce((s, p) => s + p.amount, 0);
    const remainder = Math.max(0, cartTotal - othersTotal);
    setCombinedPayments((prev) => prev.map((p, i) => (i === prev.length - 1 ? { ...p, amount: remainder } : p)));
  };

  // Submit sale
  const handleSubmit = async () => {
    if (!truckLoad) return;
    if (!selectedCustomerId) {
      alert('Харилцагч сонгоно уу');
      return;
    }
    if (cart.length === 0) {
      alert('Сагсанд бараа нэмнэ үү');
      return;
    }
    if (paymentMethod === 'COMBINED') {
      if (Math.abs(combinedTotal - cartTotal) > 1) {
        alert(`Хосолсон төлбөрийн нийт дүн (₮${combinedTotal.toLocaleString()}) нийт дүнтэй (₮${cartTotal.toLocaleString()}) тохирохгүй байна.`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const body: any = {
        truckLoadId: truckLoad.id,
        customerId: selectedCustomerId,
        paymentMethod,
        items: cart.map((c) => ({
          productId: c.productId,
          quantity: c.quantity,
          unitPrice: c.unitPrice,
        })),
      };
      if (paymentMethod === 'COMBINED') {
        body.combinedPayments = combinedPayments.filter((p) => p.amount > 0);
      }
      const res = await api.post('/api/truck-sales', body);
      const result = res.data?.data ?? res.data;
      // Attach combined payments info for receipt
      if (paymentMethod === 'COMBINED') {
        result._combinedPayments = combinedPayments.filter((p) => p.amount > 0);
      }
      setSaleResult(result);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Алдаа гарлаа';
      alert('Борлуулалт бүртгэхэд алдаа гарлаа: ' + (Array.isArray(msg) ? msg.join(', ') : msg));
    } finally {
      setSubmitting(false);
    }
  };

  // Print receipt
  const handlePrint = () => {
    window.print();
  };

  // New sale - reset and refetch
  const handleNewSale = () => {
    setSaleResult(null);
    setCart([]);
    setSelectedCustomerId('');
    setSelectedCustomer(null);
    setCustomerSearch('');
    setPaymentMethod('CASH');
    setCombinedPayments([
      { method: 'CASH', amount: 0 },
      { method: 'CREDIT', amount: 0 },
    ]);
    fetchData();
  };

  const driverName = (() => {
    if (truckLoad?.driver?.name) return truckLoad.driver.name;
    if (truckLoad?.driver) return `${truckLoad.driver.lastName ?? ''} ${truckLoad.driver.firstName ?? ''}`.trim();
    return truckLoad?.driverName ?? '';
  })();
  const loadNumber = truckLoad?.loadNumber ?? '';

  const getMethodLabel = (method: string) =>
    PAYMENT_METHODS.find((m) => m.value === method)?.label ??
    COMBINED_METHODS.find((m) => m.value === method)?.label ??
    method;

  // --- RECEIPT VIEW ---
  if (saleResult) {
    const saleDriverName =
      saleResult.truckLoad?.driver?.name ??
      saleResult.truckLoad?.driverName ??
      saleResult.driverName ??
      driverName;
    const saleCustomer = saleResult.customer ?? selectedCustomer;
    const methodLabel = getMethodLabel(saleResult.paymentMethod);
    const saleLoadNumber = saleResult.truckLoad?.loadNumber ?? loadNumber;
    const saleCombined = (saleResult as any)._combinedPayments as CombinedPayment[] | undefined;

    return (
      <div className="min-h-screen bg-[#F2F2F7] pb-8">
        {/* Screen UI (hidden when printing) */}
        <div className="print:hidden px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
          <div className="flex items-center justify-center gap-2 mb-2">
            <Check className="w-8 h-8 text-[#34C759]" />
            <h1 className="text-[22px] font-bold text-[#1C1C1E]">Борлуулалт амжилттай!</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5 space-y-3">
            <p className="text-[15px] text-[#8E8E93]">
              Баримт №: <span className="font-semibold text-[#1C1C1E]">{saleResult.saleNumber ?? saleResult.id}</span>
            </p>
            <p className="text-[15px] text-[#8E8E93]">
              Харилцагч: <span className="font-semibold text-[#1C1C1E]">{saleCustomer?.storeName}</span>
            </p>
            <p className="text-[15px] text-[#8E8E93]">
              Нийт дүн:{' '}
              <span className="font-bold text-[#1C1C1E] text-[20px]">
                ₮{Number(saleResult.totalAmount).toLocaleString()}
              </span>
            </p>
            <p className="text-[15px] text-[#8E8E93]">
              Төлбөр: <span className="font-semibold text-[#1C1C1E]">{methodLabel}</span>
            </p>
            {saleCombined && saleCombined.length > 0 && (
              <div className="bg-[#F2F2F7] rounded-xl p-3 space-y-1">
                {saleCombined.map((cp, i) => (
                  <p key={i} className="text-[13px] text-[#1C1C1E]">
                    {getMethodLabel(cp.method)}: <span className="font-semibold">₮{cp.amount.toLocaleString()}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 min-h-12 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
            >
              <Printer className="w-5 h-5" /> Баримт хэвлэх (2 хувь)
            </button>
            <button
              onClick={handleNewSale}
              className="flex-1 flex items-center justify-center gap-2 min-h-12 rounded-2xl text-[15px] font-semibold text-[#34C759] bg-[#34C759]/10 border border-[#34C759]/20 transition-all active:scale-[0.97]"
            >
              <RefreshCw className="w-5 h-5" /> Шинэ борлуулалт
            </button>
          </div>
        </div>

        {/* Printable receipt (shown only when printing) - 2 copies */}
        <div className="hidden print:block print-receipt" style={{ fontFamily: 'monospace', fontSize: '12px', width: '300px', margin: '0 auto', color: '#000' }}>
          <ReceiptContent
            saleResult={saleResult}
            driverName={saleDriverName}
            customer={saleCustomer}
            methodLabel={methodLabel}
            loadNumber={saleLoadNumber}
            combinedPayments={saleCombined}
            getMethodLabel={getMethodLabel}
            copyLabel="ХАРИЛЦАГЧИЙН ХУВЬ"
          />
          <div style={{ pageBreakAfter: 'always' }} />
          <ReceiptContent
            saleResult={saleResult}
            driverName={saleDriverName}
            customer={saleCustomer}
            methodLabel={methodLabel}
            loadNumber={saleLoadNumber}
            combinedPayments={saleCombined}
            getMethodLabel={getMethodLabel}
            copyLabel="ЖОЛООЧИЙН ХУВЬ"
          />
        </div>

        {/* Print styles */}
        <style>{`
          @media print {
            body * { visibility: hidden; }
            .print-receipt, .print-receipt * { visibility: visible; }
            .print-receipt { position: absolute; left: 0; top: 0; }
            .print\\:hidden { display: none !important; }
            .print\\:block { display: block !important; }
          }
        `}</style>
      </div>
    );
  }

  // --- LOADING ---
  if (loading) {
    return (
      <div className="h-[calc(100vh-56px)] bg-[#F2F2F7] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
          <p className="text-[15px] text-[#8E8E93]">Ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  // --- NO ACTIVE LOAD ---
  if (noActiveLoad || !truckLoad) {
    return (
      <div className="h-[calc(100vh-56px)] bg-[#F2F2F7] flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-8 text-center max-w-sm w-full">
          <Truck className="w-12 h-12 text-[#AEAEB2] mx-auto mb-4" />
          <h2 className="text-[20px] font-bold text-[#1C1C1E] mb-2">Идэвхтэй ачилт олдсонгүй</h2>
          <p className="text-[15px] text-[#8E8E93] mb-6">
            Эхлээд ачилт үүсгэж илгээнэ үү. Ачилт &quot;Илгээсэн&quot; төлөвтэй байх шаардлагатай.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/truck-loads"
              className="inline-flex items-center justify-center gap-2 px-5 min-h-12 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.97]"
              style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}
            >
              <Truck className="w-4 h-4" /> Ачилт руу очих
            </a>
            <button
              onClick={fetchData}
              className="inline-flex items-center justify-center gap-2 px-5 min-h-12 rounded-2xl text-[15px] font-semibold text-[#007AFF] bg-[#007AFF]/10 transition-all active:scale-[0.97]"
            >
              <RefreshCw className="w-4 h-4" /> Дахин шалгах
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- MAIN POS INTERFACE (Split Layout) ---
  return (
    <div className="h-[calc(100vh-56px)] bg-[#F2F2F7] flex flex-col lg:flex-row overflow-hidden">
      {/* ========== LEFT SIDE: Products ========== */}
      <div className="flex-1 flex flex-col min-h-0 lg:min-w-0">
        {/* Top bar: Load info + stats + refresh */}
        <div className="flex-shrink-0 bg-white border-b border-[#E5E5EA]">
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
              >
                <Truck className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] font-bold text-[#1C1C1E] truncate">
                  {truckLoad.loadNumber}
                </h1>
                {driverName && (
                  <p className="text-[12px] text-[#8E8E93] truncate">{driverName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="hidden sm:flex items-center gap-1.5">
                <div className="bg-[#F2F2F7] rounded-lg px-2.5 py-1.5 text-center">
                  <p className="text-[10px] text-[#8E8E93] uppercase font-semibold leading-tight">Ачсан</p>
                  <p className="text-[14px] font-bold text-[#1C1C1E] leading-tight">{totalLoaded}</p>
                </div>
                <div className="bg-[#34C759]/10 rounded-lg px-2.5 py-1.5 text-center">
                  <p className="text-[10px] text-[#34C759] uppercase font-semibold leading-tight">Зарсан</p>
                  <p className="text-[14px] font-bold text-[#34C759] leading-tight">{totalSold}</p>
                </div>
                <div className="bg-[#007AFF]/10 rounded-lg px-2.5 py-1.5 text-center">
                  <p className="text-[10px] text-[#007AFF] uppercase font-semibold leading-tight">Үлдэгдэл</p>
                  <p className="text-[14px] font-bold text-[#007AFF] leading-tight">{totalRemaining}</p>
                </div>
              </div>
              <button
                onClick={fetchData}
                className="w-9 h-9 rounded-lg bg-[#F2F2F7] flex items-center justify-center hover:bg-[#E5E5EA] active:scale-[0.92] transition-all"
              >
                <RefreshCw className="w-4 h-4 text-[#8E8E93]" />
              </button>
            </div>
          </div>
          {/* Mobile-only stats row */}
          <div className="flex sm:hidden items-center gap-1.5 px-4 pb-3">
            <div className="flex-1 bg-[#F2F2F7] rounded-lg px-2 py-1.5 text-center">
              <p className="text-[10px] text-[#8E8E93] uppercase font-semibold leading-tight">Ачсан</p>
              <p className="text-[14px] font-bold text-[#1C1C1E] leading-tight">{totalLoaded}</p>
            </div>
            <div className="flex-1 bg-[#34C759]/10 rounded-lg px-2 py-1.5 text-center">
              <p className="text-[10px] text-[#34C759] uppercase font-semibold leading-tight">Зарсан</p>
              <p className="text-[14px] font-bold text-[#34C759] leading-tight">{totalSold}</p>
            </div>
            <div className="flex-1 bg-[#007AFF]/10 rounded-lg px-2 py-1.5 text-center">
              <p className="text-[10px] text-[#007AFF] uppercase font-semibold leading-tight">Үлдэгдэл</p>
              <p className="text-[14px] font-bold text-[#007AFF] leading-tight">{totalRemaining}</p>
            </div>
          </div>
        </div>

        {/* Product search bar */}
        <div className="flex-shrink-0 px-4 py-3 bg-[#F2F2F7]">
          <div className="relative">
            <Search className="w-4 h-4 text-[#AEAEB2] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              placeholder="Бараа хайх (нэр, SKU)..."
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white border border-[#E5E5EA] text-[14px] text-[#1C1C1E] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15"
            />
            {productSearch && (
              <button
                onClick={() => setProductSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#AEAEB2]/20 flex items-center justify-center"
              >
                <X className="w-3 h-3 text-[#8E8E93]" />
              </button>
            )}
          </div>
          <p className="text-[11px] text-[#AEAEB2] mt-1.5 px-1">
            {filteredProducts.length} бараа {productSearch && `(${availableProducts.length} нийт)`}
          </p>
        </div>

        {/* Product grid - scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredProducts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Package className="w-12 h-12 text-[#AEAEB2] mb-3" />
              <p className="text-[14px] text-[#8E8E93]">
                {productSearch ? 'Хайлтад тохирох бараа олдсонгүй' : 'Үлдэгдэл бараа байхгүй'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProducts.map((item) => {
                const remaining = item.loadedQty - item.soldQty;
                const inCart = getCartItem(item.productId);
                const upb = item.product.unitsPerBox || 1;
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-xl border p-3.5 transition-all hover:shadow-md ${
                      inCart
                        ? 'border-[#34C759] ring-1 ring-[#34C759]/20'
                        : 'border-[#E5E5EA] hover:border-[#D1D1D6]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[#1C1C1E] truncate leading-tight">
                          {item.product.name}
                        </p>
                        {item.product.sku && (
                          <p className="text-[11px] text-[#AEAEB2] mt-0.5">{item.product.sku}</p>
                        )}
                      </div>
                      <span className="text-[14px] font-bold text-[#1C1C1E] flex-shrink-0">
                        ₮{Number(item.unitPrice || item.product.sellingPrice).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#8E8E93]">
                          Үлдэгдэл: <span className="font-semibold text-[#007AFF]">{remaining}</span>
                        </span>
                        {upb > 1 && (
                          <span className="text-[#AEAEB2] text-[11px]">
                            ({Math.floor(remaining / upb)}х + {remaining % upb}ш)
                          </span>
                        )}
                      </div>
                      {upb > 1 && (
                        <span className="text-[10px] text-[#AEAEB2] bg-[#F2F2F7] rounded px-1.5 py-0.5">
                          {upb}ш/хайрцаг
                        </span>
                      )}
                    </div>
                    {/* Qty input */}
                    <div className="mt-3 pt-2.5 border-t border-[#F2F2F7]">
                      {upb > 1 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-[#8E8E93] font-semibold uppercase">Хайрцаг</label>
                            <input
                              type="number"
                              min="0"
                              max={Math.floor(remaining / upb)}
                              value={inCart ? Math.floor(inCart.quantity / upb) : ''}
                              placeholder="0"
                              onChange={(e) => {
                                const boxes = Math.max(0, parseInt(e.target.value) || 0);
                                const currentPieces = inCart ? inCart.quantity % upb : 0;
                                const total = Math.min(boxes * upb + currentPieces, remaining);
                                if (total <= 0) { removeFromCart(item.productId); }
                                else { addToCart(item, total - (inCart?.quantity ?? 0)); if (!inCart) addToCart(item, total); else { setCart(prev => prev.map(c => c.productId === item.productId ? { ...c, quantity: total, maxQty: remaining } : c)); } }
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-[14px] font-bold text-center text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/20"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-[#8E8E93] font-semibold uppercase">Ширхэг</label>
                            <input
                              type="number"
                              min="0"
                              max={upb - 1}
                              value={inCart ? inCart.quantity % upb : ''}
                              placeholder="0"
                              onChange={(e) => {
                                const pieces = Math.max(0, Math.min(parseInt(e.target.value) || 0, upb - 1));
                                const currentBoxes = inCart ? Math.floor(inCart.quantity / upb) : 0;
                                const total = Math.min(currentBoxes * upb + pieces, remaining);
                                if (total <= 0) { removeFromCart(item.productId); }
                                else { setCart(prev => { const exists = prev.find(c => c.productId === item.productId); if (exists) return prev.map(c => c.productId === item.productId ? { ...c, quantity: total, maxQty: remaining } : c); return [...prev, { productId: item.productId, name: item.product.name, sku: item.product.sku, quantity: total, unitPrice: item.unitPrice || item.product.sellingPrice, maxQty: remaining, unitsPerBox: upb }]; }); }
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-[14px] font-bold text-center text-[#1C1C1E] outline-none focus:border-[#FF9500] focus:ring-1 focus:ring-[#FF9500]/20"
                            />
                          </div>
                          {inCart && (
                            <button onClick={() => removeFromCart(item.productId)} className="self-end mb-0.5 w-8 h-8 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center active:scale-[0.92]">
                              <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />
                            </button>
                          )}
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-[#8E8E93] font-semibold uppercase">Тоо ширхэг</label>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={inCart?.quantity ?? ''}
                              placeholder="0"
                              onChange={(e) => {
                                const qty = Math.max(0, Math.min(parseInt(e.target.value) || 0, remaining));
                                if (qty <= 0) { removeFromCart(item.productId); }
                                else { setCart(prev => { const exists = prev.find(c => c.productId === item.productId); if (exists) return prev.map(c => c.productId === item.productId ? { ...c, quantity: qty, maxQty: remaining } : c); return [...prev, { productId: item.productId, name: item.product.name, sku: item.product.sku, quantity: qty, unitPrice: item.unitPrice || item.product.sellingPrice, maxQty: remaining, unitsPerBox: 1 }]; }); }
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-[14px] font-bold text-center text-[#1C1C1E] outline-none focus:border-[#34C759] focus:ring-1 focus:ring-[#34C759]/20"
                            />
                          </div>
                          {inCart && (
                            <button onClick={() => removeFromCart(item.productId)} className="self-end mb-0.5 w-8 h-8 rounded-lg bg-[#FF3B30]/10 flex items-center justify-center active:scale-[0.92]">
                              <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ========== RIGHT SIDE: Cart & Checkout ========== */}
      <div className="w-full lg:w-[380px] flex-shrink-0 bg-white border-t lg:border-t-0 lg:border-l border-[#E5E5EA] flex flex-col min-h-0 max-h-[50vh] lg:max-h-none">
        {/* Customer search - compact */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-[#F2F2F7]">
          <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">
            Харилцагч
          </label>
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#AEAEB2] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={customerSearch}
                onChange={(e) => {
                  setCustomerSearch(e.target.value);
                  setShowCustomerList(true);
                  if (selectedCustomerId && e.target.value !== selectedCustomer?.storeName) {
                    clearCustomer();
                  }
                }}
                onFocus={() => setShowCustomerList(true)}
                placeholder="Нэр, утас, хаяг..."
                className="w-full pl-9 pr-8 py-2 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA] text-[13px] text-[#1C1C1E] outline-none transition-all focus:border-[#007AFF] focus:ring-[2px] focus:ring-[#007AFF]/15 focus:bg-white"
              />
              {selectedCustomerId && (
                <button
                  onClick={clearCustomer}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#AEAEB2]/20 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-[#8E8E93]" />
                </button>
              )}
            </div>

            {/* Customer dropdown */}
            {showCustomerList && !selectedCustomerId && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#E5E5EA] shadow-lg max-h-[240px] overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="px-4 py-5 text-center text-[13px] text-[#8E8E93]">Харилцагч олдсонгүй</div>
                ) : (
                  filteredCustomers.slice(0, 30).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#F2F2F7] active:bg-[#E5E5EA] transition-colors border-b border-[#F2F2F7] last:border-b-0"
                    >
                      <p className="text-[13px] font-medium text-[#1C1C1E]">{c.storeName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.phone && (
                          <span className="text-[11px] text-[#8E8E93] flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" /> {c.phone}
                          </span>
                        )}
                        {c.address && (
                          <span className="text-[11px] text-[#8E8E93] truncate flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {c.address}
                          </span>
                        )}
                        {c.region && (
                          <span className="text-[10px] text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded">{c.region.name}</span>
                        )}
                      </div>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected customer compact info */}
          {selectedCustomer && (
            <div className="mt-2 bg-[#34C759]/5 border border-[#34C759]/20 rounded-lg p-2 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#34C759] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[13px] text-[#1C1C1E] font-semibold truncate block">{selectedCustomer.storeName}</span>
                <span className="text-[11px] text-[#8E8E93] truncate block">
                  {[selectedCustomer.phone, selectedCustomer.address].filter(Boolean).join(' / ')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cart items list - scrollable middle section */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {cart.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 px-4">
              <ShoppingCart className="w-10 h-10 text-[#AEAEB2] mb-2" />
              <p className="text-[13px] text-[#8E8E93]">Сагс хоосон байна</p>
              <p className="text-[11px] text-[#AEAEB2] mt-0.5">Зүүн талаас бараа сонгоно уу</p>
            </div>
          ) : (
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">
                  Сагс
                </span>
                <span className="text-[11px] text-[#AEAEB2]">
                  {cart.length} бараа / {cart.reduce((s, c) => s + c.quantity, 0)} ш
                </span>
              </div>
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-2.5 p-2.5 rounded-lg bg-[#F2F2F7] border border-[#E5E5EA]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1C1C1E] truncate">{item.name}</p>
                    <p className="text-[11px] text-[#8E8E93]">
                      {item.quantity} ш
                      {item.unitsPerBox > 1 && ` (${Math.floor(item.quantity / item.unitsPerBox)}х${item.quantity % item.unitsPerBox > 0 ? ` +${item.quantity % item.unitsPerBox}ш` : ''})`}
                      {' '}&times; ₮{Number(item.unitPrice).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold text-[#1C1C1E] flex-shrink-0">
                    ₮{(item.quantity * item.unitPrice).toLocaleString()}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateCartQty(item.productId, -1)}
                      className="w-7 h-7 rounded-md bg-white flex items-center justify-center active:scale-[0.92] transition-all border border-[#E5E5EA]"
                    >
                      <Minus className="w-3 h-3 text-[#8E8E93]" />
                    </button>
                    <span className="w-6 text-center text-[13px] font-bold text-[#1C1C1E]">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(item.productId, 1)}
                      disabled={item.quantity >= item.maxQty}
                      className="w-7 h-7 rounded-md bg-white flex items-center justify-center active:scale-[0.92] transition-all border border-[#E5E5EA] disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3 text-[#8E8E93]" />
                    </button>
                    <button
                      onClick={() => removeFromCart(item.productId)}
                      className="w-7 h-7 rounded-md bg-[#FF3B30]/10 flex items-center justify-center active:scale-[0.92] transition-all ml-0.5"
                    >
                      <Trash2 className="w-3 h-3 text-[#FF3B30]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Bottom section: total, payment, submit - always visible */}
        <div className="flex-shrink-0 border-t border-[#E5E5EA] bg-white">
          {/* Cart total */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F2F7]">
            <span className="text-[13px] font-semibold text-[#8E8E93]">Нийт дүн</span>
            <span className="text-[20px] font-bold text-[#1C1C1E]">₮{cartTotal.toLocaleString()}</span>
          </div>

          {/* Payment method - horizontal pills */}
          <div className="px-4 py-3 space-y-2">
            <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase tracking-wide">
              Төлбөр
            </label>
            <div className="flex flex-wrap gap-1.5">
              {PAYMENT_METHODS.map((m) => {
                const Icon = m.icon;
                const isActive = paymentMethod === m.value;
                return (
                  <button
                    key={m.value}
                    type="button"
                    onClick={() => setPaymentMethod(m.value)}
                    className={`h-8 px-3 rounded-full text-[12px] font-semibold transition-all active:scale-[0.97] border flex items-center gap-1.5 ${
                      isActive
                        ? 'text-white border-transparent shadow-sm'
                        : 'bg-[#F2F2F7] text-[#1C1C1E] border-[#E5E5EA] hover:bg-[#E5E5EA]'
                    }`}
                    style={isActive ? { background: m.color } : undefined}
                  >
                    <Icon className="w-3.5 h-3.5" />
                    {m.label}
                  </button>
                );
              })}
            </div>

            {/* Combined payment details */}
            {paymentMethod === 'COMBINED' && cart.length > 0 && (
              <div className="bg-[#F2F2F7] rounded-lg p-2.5 space-y-2 mt-1">
                <p className="text-[10px] font-semibold text-[#8E8E93] uppercase">Хосолсон задаргаа</p>
                {combinedPayments.map((cp, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <select
                      value={cp.method}
                      onChange={(e) => updateCombinedPayment(idx, 'method', e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-md bg-white border border-[#E5E5EA] text-[12px] text-[#1C1C1E] outline-none"
                    >
                      {COMBINED_METHODS.map((m) => (
                        <option key={m.value} value={m.value}>{m.label}</option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={cp.amount || ''}
                      onChange={(e) => updateCombinedPayment(idx, 'amount', e.target.value)}
                      onBlur={() => { if (idx === combinedPayments.length - 1) autoFillLastCombined(); }}
                      placeholder="Дүн"
                      className="w-24 px-2 py-1.5 rounded-md bg-white border border-[#E5E5EA] text-[12px] text-[#1C1C1E] outline-none text-right"
                    />
                    {combinedPayments.length > 2 && (
                      <button
                        onClick={() => removeCombinedRow(idx)}
                        className="w-6 h-6 rounded-full bg-[#FF3B30]/10 flex items-center justify-center"
                      >
                        <X className="w-3 h-3 text-[#FF3B30]" />
                      </button>
                    )}
                  </div>
                ))}
                <div className="flex items-center justify-between">
                  <button
                    onClick={addCombinedRow}
                    className="text-[11px] font-semibold text-[#007AFF] flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" /> Мөр нэмэх
                  </button>
                  <div className="text-right">
                    <p className="text-[11px] text-[#8E8E93]">
                      ₮{combinedTotal.toLocaleString()} / ₮{cartTotal.toLocaleString()}
                    </p>
                    {Math.abs(combinedRemaining) > 1 && (
                      <p className={`text-[11px] font-semibold ${combinedRemaining > 0 ? 'text-[#FF3B30]' : 'text-[#FF9500]'}`}>
                        {combinedRemaining > 0 ? `Дутуу: ₮${combinedRemaining.toLocaleString()}` : `Илүү: ₮${Math.abs(combinedRemaining).toLocaleString()}`}
                      </p>
                    )}
                    {Math.abs(combinedRemaining) <= 1 && combinedTotal > 0 && (
                      <p className="text-[11px] font-semibold text-[#34C759]">Тохирч байна</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Submit button */}
          <div className="px-4 pb-4 pt-1">
            <button
              onClick={handleSubmit}
              disabled={submitting || cart.length === 0 || !selectedCustomerId || (paymentMethod === 'COMBINED' && Math.abs(combinedRemaining) > 1)}
              className="w-full h-12 rounded-xl text-[15px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg"
              style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Бүртгэж байна...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" /> Борлуулалт бүртгэх {cartTotal > 0 && `₮${cartTotal.toLocaleString()}`}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Receipt content component for print - shows detailed receipt
function ReceiptContent({
  saleResult,
  driverName,
  customer,
  methodLabel,
  loadNumber,
  combinedPayments,
  getMethodLabel,
  copyLabel,
}: {
  saleResult: SaleResult;
  driverName: string;
  customer: Customer | null;
  methodLabel: string;
  loadNumber: string;
  combinedPayments?: CombinedPayment[];
  getMethodLabel: (m: string) => string;
  copyLabel: string;
}) {
  const date = saleResult.createdAt
    ? new Date(saleResult.createdAt).toLocaleString('mn-MN')
    : new Date().toLocaleString('mn-MN');

  const totalQty = saleResult.items?.reduce((s, i) => s + i.quantity, 0) ?? 0;

  const combinedDetail = combinedPayments
    ? combinedPayments.map((p) => `  ${getMethodLabel(p.method)}: ₮${p.amount.toLocaleString()}`).join('\n')
    : '';

  return (
    <div style={{ padding: '8px 0' }}>
      <pre style={{ margin: 0, whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '12px', lineHeight: '1.5' }}>
{`====================================
      ЗАЙРМАГ ТҮГЭЭЛТ
     Борлуулалтын баримт
       ${copyLabel}
====================================
Баримт №: ${saleResult.saleNumber ?? saleResult.id}
Огноо:    ${date}
Ачилт №:  ${loadNumber}
Жолооч:   ${driverName}
------------------------------------
ХАРИЛЦАГЧ
  Нэр:  ${customer?.storeName ?? '-'}
  Утас:  ${customer?.phone ?? '-'}
  Хаяг:  ${customer?.address ?? '-'}
------------------------------------
БАРАА               Тоо   Үнэ    Дүн`}
{saleResult.items?.map((item) => {
  const name = (item.product?.name ?? '').substring(0, 18).padEnd(18);
  const qty = String(item.quantity).padStart(4);
  const price = Number(item.unitPrice).toLocaleString().padStart(7);
  const total = Number(item.lineTotal ?? item.quantity * item.unitPrice).toLocaleString().padStart(8);
  return `\n${name} ${qty} ${price} ${total}`;
}).join('') ?? ''}
{`
------------------------------------
Нийт бараа:                ${String(totalQty).padStart(4)} ш
====================================
НИЙТ ДҮН:       ₮${Number(saleResult.totalAmount).toLocaleString()}
====================================
Төлбөр: ${methodLabel}`}
{combinedDetail ? `\n${combinedDetail}` : ''}
{`
------------------------------------

Хүлээн авсан: ___________________

Хүлээлгэн өгсөн: _______________

------------------------------------
       Баярлалаа!
====================================`}
      </pre>
    </div>
  );
}
