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
  MapPin,
  Phone,
  Check,
  X,
  Loader2,
  Search,
  ScanLine,
} from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';
import { BarcodeScanner, type BarcodeScanFeedback } from '@/components/shared/barcode-scanner';
import { useAuth } from '@/hooks/use-auth';
import { PAYMENT_METHODS, COMBINED_METHODS } from './_lib/payment-methods';
import { CustomerSheet } from './_components/customer-sheet';
import { CartSheet } from './_components/cart-sheet';
import { MobilePos, type PosProductEntry } from './_components/mobile-pos';

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

/** Жолоочийн доод таб цэсний өндөр — гар утсан дээр сагсны мөр үүнээс дээш сууна. */
const DRIVER_TABBAR_HEIGHT = 80;

export default function POSPage() {
  // Жолоочийн бүрхүүлд доод таб цэс байдаг тул түүнд зай үлдээнэ.
  const { user } = useAuth();
  const bottomInset = user?.role === 'DRIVER' ? DRIVER_TABBAR_HEIGHT : 0;

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

  // Barcode scanner state
  const [scannerOpen, setScannerOpen] = useState(false);
  const [scanFeedback, setScanFeedback] = useState<BarcodeScanFeedback>(null);

  // Гар утасны хуудсууд (bottom sheet)
  const [cartSheetOpen, setCartSheetOpen] = useState(false);
  const [customerSheetOpen, setCustomerSheetOpen] = useState(false);

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
        c.contactName?.toLowerCase().includes(q) ||
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

  // Сагсны мөрийг тухайн барааны нийт тоогоор шинэчилнэ (0 бол мөрийг устгана).
  // Нэг productId дээр үргэлж ганц мөр байхаар upsert хийнэ.
  const setCartQty = (item: TruckLoadItem, qty: number) => {
    const remaining = item.loadedQty - item.soldQty;
    const upb = item.product.unitsPerBox || 1;
    const next = Math.min(Math.max(0, qty), remaining);
    setCart((prev) => {
      if (next <= 0) return prev.filter((c) => c.productId !== item.productId);
      if (prev.some((c) => c.productId === item.productId)) {
        return prev.map((c) =>
          c.productId === item.productId ? { ...c, quantity: next, maxQty: remaining } : c
        );
      }
      return [
        ...prev,
        {
          productId: item.productId,
          name: item.product.name,
          sku: item.product.sku,
          quantity: next,
          unitPrice: item.unitPrice || item.product.sellingPrice,
          maxQty: remaining,
          unitsPerBox: upb,
        },
      ];
    });
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

  const clearCart = () => setCart([]);

  /** Гар утасны жагсаалтад зориулж бэлдсэн барааны мөрүүд. */
  const mobileProducts = useMemo<PosProductEntry[]>(
    () =>
      filteredProducts.map((item) => ({
        key: item.id,
        productId: item.productId,
        name: item.product.name,
        sku: item.product.sku,
        unitPrice: item.unitPrice || item.product.sellingPrice,
        remaining: item.loadedQty - item.soldQty,
        unitsPerBox: item.product.unitsPerBox || 1,
        quantity: cart.find((c) => c.productId === item.productId)?.quantity ?? 0,
      })),
    [filteredProducts, cart]
  );

  /** Барааны id-гаар сагсны тоог тохируулна (гар утасны stepper-үүд ашиглана). */
  const setQtyByProductId = (productId: string, nextQty: number) => {
    const item = availableProducts.find((i) => i.productId === productId);
    if (item) setCartQty(item, nextQty);
  };

  /** Сагсанд аль хэдийн байгаа мөрийн тоог шууд өөрчилнө (сагсны хуудсанд ашиглана). */
  const setCartLineQty = (productId: string, nextQty: number) => {
    setCart((prev) =>
      prev.flatMap((c) => {
        if (c.productId !== productId) return [c];
        const clamped = Math.min(Math.max(0, nextQty), c.maxQty);
        return clamped <= 0 ? [] : [{ ...c, quantity: clamped }];
      })
    );
  };

  // --- Зураасан код (barcode) ---
  // Барааны SKU нь өөрөө EAN-13 зураасан код тул шууд тааруулна.
  // Уншигч 12 оронтой UPC-A буцаах тохиолдол байдаг тул зөвхөн цифрийг үлдээж,
  // эхний тэгүүдийг хасаад харьцуулна.
  const normalizeCode = (code: string) => code.replace(/\D/g, '').replace(/^0+/, '');

  const handleBarcode = (code: string) => {
    const scanned = normalizeCode(code);
    const item = scanned
      ? availableProducts.find((i) => normalizeCode(i.product.sku ?? '') === scanned)
      : undefined;

    if (!item) {
      // Ачилтад байхгүй бол кодыг хайлтын талбарт тавина — modal хаагдмагц харагдана.
      setProductSearch(code.trim());
      setScanFeedback({ type: 'error', text: `Ачилтад олдсонгүй: ${code.trim()}` });
      return;
    }

    const remaining = item.loadedQty - item.soldQty;
    const current = cart.find((c) => c.productId === item.productId)?.quantity ?? 0;
    if (current >= remaining) {
      setScanFeedback({
        type: 'error',
        text: `${item.product.name} — үлдэгдэл хүрэлцэхгүй (${remaining}ш)`,
      });
      return;
    }

    setCartQty(item, current + 1);
    setScanFeedback({ type: 'success', text: `${item.product.name} +1ш → ${current + 1}ш` });
  };

  // Скан мэдэгдлийг богино хугацааны дараа арилгана.
  useEffect(() => {
    if (!scanFeedback) return;
    const t = setTimeout(() => setScanFeedback(null), 2500);
    return () => clearTimeout(t);
  }, [scanFeedback]);

  const cartTotal = cart.reduce((s, c) => s + c.quantity * c.unitPrice, 0);
  const cartUnitCount = cart.reduce((s, c) => s + c.quantity, 0);

  // Combined payment helpers
  const combinedTotal = combinedPayments.reduce((s, p) => s + p.amount, 0);
  const combinedRemaining = cartTotal - combinedTotal;

  const updateCombinedPayment = (index: number, field: 'method' | 'amount', value: string) => {
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
        alert(`Хосолсон төлбөрийн нийт дүн (${formatMnt(combinedTotal)}) нийт дүнтэй (${formatMnt(cartTotal)}) тохирохгүй байна.`);
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
      setCartSheetOpen(false);
      setCustomerSheetOpen(false);
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
    setCartSheetOpen(false);
    setCustomerSheetOpen(false);
    setProductSearch('');
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
      <div className="min-h-screen bg-[#F5F6FA] pb-8 animate-ios-fade-in">
        {/* Screen UI (hidden when printing) */}
        <div className="print:hidden px-4 pt-6 pb-4 max-w-lg mx-auto space-y-4">
          <div className="flex flex-col items-center justify-center gap-3 mb-1">
            <div className="w-16 h-16 rounded-2xl bg-[#34C759]/10 flex items-center justify-center animate-ios-scale-in">
              <Check className="w-8 h-8 text-[#34C759]" />
            </div>
            <h1 className="text-[22px] font-bold text-[#1A1D26] tracking-tight">Борлуулалт амжилттай!</h1>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 p-5 space-y-3">
            <p className="text-[15px] text-[#8C8FA3]">
              Баримт №: <span className="font-semibold text-[#1A1D26]">{saleResult.saleNumber ?? saleResult.id}</span>
            </p>
            <p className="text-[15px] text-[#8C8FA3]">
              Харилцагч: <span className="font-semibold text-[#1A1D26]">{saleCustomer?.storeName}</span>
            </p>
            <p className="text-[15px] text-[#8C8FA3]">
              Нийт дүн:{' '}
              <span className="font-bold text-[#1A1D26] text-[20px] tabular-nums">
                {formatMnt(saleResult.totalAmount)}
              </span>
            </p>
            <p className="text-[15px] text-[#8C8FA3]">
              Төлбөр: <span className="font-semibold text-[#1A1D26]">{methodLabel}</span>
            </p>
            {saleCombined && saleCombined.length > 0 && (
              <div className="bg-[#F5F6FA] rounded-xl p-3 space-y-1">
                {saleCombined.map((cp, i) => (
                  <p key={i} className="text-[13px] text-[#1A1D26]">
                    {getMethodLabel(cp.method)}: <span className="font-semibold tabular-nums">{formatMnt(cp.amount)}</span>
                  </p>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3">
            <button
              onClick={handlePrint}
              className="flex-1 flex items-center justify-center gap-2 min-h-12 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] shadow-sm shadow-[#007AFF]/25"
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
      <div className="min-h-[60vh] lg:h-[calc(100vh-56px)] bg-[#F5F6FA] flex items-center justify-center animate-ios-fade-in">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-[#007AFF] animate-spin" />
          <p className="text-[15px] text-[#8C8FA3]">Ачааллаж байна...</p>
        </div>
      </div>
    );
  }

  // --- NO ACTIVE LOAD ---
  if (noActiveLoad || !truckLoad) {
    return (
      <div className="min-h-[60vh] lg:h-[calc(100vh-56px)] bg-[#F5F6FA] flex items-center justify-center px-4 animate-ios-fade-in">
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 p-8 text-center max-w-sm w-full">
          <div className="w-16 h-16 rounded-2xl bg-[#F2F4F7] flex items-center justify-center mx-auto mb-4">
            <Truck className="w-8 h-8 text-[#8C8FA3]" />
          </div>
          <h2 className="text-[20px] font-bold text-[#1A1D26] tracking-tight mb-2">Идэвхтэй ачилт олдсонгүй</h2>
          <p className="text-[15px] text-[#8C8FA3] mb-6">
            Эхлээд ачилт үүсгэж илгээнэ үү. Ачилт &quot;Илгээсэн&quot; төлөвтэй байх шаардлагатай.
          </p>
          <div className="flex flex-col gap-3">
            <a
              href="/truck-loads"
              className="inline-flex items-center justify-center gap-2 px-5 min-h-12 rounded-2xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] shadow-sm shadow-[#FF9500]/25"
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

  // --- MAIN POS INTERFACE ---
  // Гар утас (< lg) болон дэлгэц (lg+) хоёр өөр зохиомжтой: утсанд нэг баганаар
  // урсгаж, сагсыг доод хуудсаар нээдэг; дэлгэцэд хажуу тийш хуваасан хэвээр.
  return (
    <>
      {/* ==================== ДЭЛГЭЦ: хажуу тийш хуваасан ==================== */}
      <div className="hidden lg:flex h-[calc(100vh-56px)] bg-[#F5F6FA] flex-row overflow-hidden animate-ios-fade-in">
      {/* ========== LEFT SIDE: Products ========== */}
      <div className="flex-1 flex flex-col min-h-0 lg:min-w-0">
        {/* Top bar: Load info + stats + refresh */}
        <div className="flex-shrink-0 bg-white border-b border-[#E8ECF0]">
          <div className="flex items-center justify-between px-4 py-3 gap-3">
            <div className="flex items-center gap-3 min-w-0">
              <div
                className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
              >
                <Truck className="w-4.5 h-4.5 text-white" />
              </div>
              <div className="min-w-0">
                <h1 className="text-[15px] font-bold text-[#1A1D26] tracking-tight truncate">
                  {truckLoad.loadNumber}
                </h1>
                {driverName && (
                  <p className="text-[12px] text-[#8C8FA3] truncate">{driverName}</p>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <div className="flex items-center gap-1.5">
                <div className="bg-[#F2F4F7] rounded-xl px-2.5 py-1.5 text-center">
                  <p className="text-[10px] text-[#8C8FA3] uppercase font-semibold leading-tight">Ачсан</p>
                  <p className="text-[14px] font-bold text-[#1A1D26] leading-tight tabular-nums">{totalLoaded}</p>
                </div>
                <div className="bg-[#34C759]/10 rounded-xl px-2.5 py-1.5 text-center">
                  <p className="text-[10px] text-[#34C759] uppercase font-semibold leading-tight">Зарсан</p>
                  <p className="text-[14px] font-bold text-[#34C759] leading-tight tabular-nums">{totalSold}</p>
                </div>
                <div className="bg-[#007AFF]/10 rounded-xl px-2.5 py-1.5 text-center">
                  <p className="text-[10px] text-[#007AFF] uppercase font-semibold leading-tight">Үлдэгдэл</p>
                  <p className="text-[14px] font-bold text-[#007AFF] leading-tight tabular-nums">{totalRemaining}</p>
                </div>
              </div>
              <button
                onClick={fetchData}
                className="w-9 h-9 rounded-xl bg-[#F2F4F7] flex items-center justify-center hover:bg-[#E8ECF0] active:scale-[0.92] transition-all"
              >
                <RefreshCw className="w-4 h-4 text-[#8C8FA3]" />
              </button>
            </div>
          </div>
        </div>

        {/* Product search bar */}
        <div className="flex-shrink-0 px-4 py-3 bg-[#F5F6FA]">
          <div className="flex items-center gap-2">
            <div className="relative flex-1 min-w-0">
              <Search className="w-4 h-4 text-[#8C8FA3] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={productSearch}
                onChange={(e) => setProductSearch(e.target.value)}
                placeholder="Бараа хайх (нэр, SKU)..."
                className="w-full pl-10 pr-9 py-2.5 rounded-xl bg-white border border-[#E8ECF0] text-[14px] text-[#1A1D26] outline-none transition-all focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15"
              />
              {productSearch && (
                <button
                  onClick={() => setProductSearch('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#AEAEB2]/20 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-[#8C8FA3]" />
                </button>
              )}
            </div>
            <button
              onClick={() => {
                setScanFeedback(null);
                setScannerOpen(true);
              }}
              title="Камераар зураасан код унших"
              className="flex-shrink-0 h-[42px] px-3.5 rounded-xl text-[13px] font-semibold text-white flex items-center gap-1.5 transition-all active:scale-[0.95] shadow-sm shadow-[#007AFF]/25"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
            >
              <ScanLine className="w-4 h-4" />
              Скан
            </button>
          </div>
          <p className="text-[11px] text-[#AEAEB2] mt-1.5 px-1">
            {filteredProducts.length} бараа {productSearch && `(${availableProducts.length} нийт)`}
          </p>
        </div>

        {/* Product grid - scrollable */}
        <div className="flex-1 overflow-y-auto px-4 pb-4">
          {filteredProducts.length === 0 ? (
            <EmptyState
              icon={Package}
              title={productSearch ? 'Хайлтад тохирох бараа олдсонгүй' : 'Үлдэгдэл бараа байхгүй'}
            />
          ) : (
            <div className="grid grid-cols-2 xl:grid-cols-3 gap-3">
              {filteredProducts.map((item) => {
                const remaining = item.loadedQty - item.soldQty;
                const inCart = getCartItem(item.productId);
                const upb = item.product.unitsPerBox || 1;
                return (
                  <div
                    key={item.id}
                    className={`bg-white rounded-2xl border p-3.5 transition-all hover:shadow-md ${
                      inCart
                        ? 'border-[#34C759] ring-1 ring-[#34C759]/20'
                        : 'border-[#E8ECF0]/70 hover:border-[#D8DEE8]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-[14px] font-semibold text-[#1A1D26] truncate leading-tight">
                          {item.product.name}
                        </p>
                        {item.product.sku && (
                          <p className="text-[11px] text-[#AEAEB2] mt-0.5">{item.product.sku}</p>
                        )}
                      </div>
                      <span className="text-[14px] font-bold text-[#1A1D26] flex-shrink-0 tabular-nums">
                        {formatMnt(item.unitPrice || item.product.sellingPrice)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-[12px]">
                        <span className="text-[#8C8FA3]">
                          Үлдэгдэл: <span className="font-semibold text-[#007AFF] tabular-nums">{remaining}</span>
                        </span>
                        {upb > 1 && (
                          <span className="text-[#AEAEB2] text-[11px]">
                            ({Math.floor(remaining / upb)}х + {remaining % upb}ш)
                          </span>
                        )}
                      </div>
                      {upb > 1 && (
                        <span className="text-[10px] text-[#8C8FA3] bg-[#F2F4F7] rounded-md px-1.5 py-0.5">
                          {upb}ш/хайрцаг
                        </span>
                      )}
                    </div>
                    {/* Qty input */}
                    <div className="mt-3 pt-2.5 border-t border-[#F2F4F7]">
                      {upb > 1 ? (
                        <div className="flex items-center gap-2">
                          <div className="flex-1">
                            <label className="text-[10px] text-[#8C8FA3] font-semibold uppercase">Хайрцаг</label>
                            <input
                              type="number"
                              min="0"
                              max={Math.floor(remaining / upb)}
                              value={inCart ? Math.floor(inCart.quantity / upb) : ''}
                              placeholder="0"
                              onChange={(e) => {
                                const boxes = Math.max(0, parseInt(e.target.value) || 0);
                                const currentPieces = inCart ? inCart.quantity % upb : 0;
                                setCartQty(item, boxes * upb + currentPieces);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] font-bold text-center text-[#1A1D26] outline-none focus:border-[#007AFF] focus:ring-1 focus:ring-[#007AFF]/20"
                            />
                          </div>
                          <div className="flex-1">
                            <label className="text-[10px] text-[#8C8FA3] font-semibold uppercase">Ширхэг</label>
                            <input
                              type="number"
                              min="0"
                              max={upb - 1}
                              value={inCart ? inCart.quantity % upb : ''}
                              placeholder="0"
                              onChange={(e) => {
                                const pieces = Math.max(0, Math.min(parseInt(e.target.value) || 0, upb - 1));
                                const currentBoxes = inCart ? Math.floor(inCart.quantity / upb) : 0;
                                setCartQty(item, currentBoxes * upb + pieces);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] font-bold text-center text-[#1A1D26] outline-none focus:border-[#FF9500] focus:ring-1 focus:ring-[#FF9500]/20"
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
                            <label className="text-[10px] text-[#8C8FA3] font-semibold uppercase">Тоо ширхэг</label>
                            <input
                              type="number"
                              min="0"
                              max={remaining}
                              value={inCart?.quantity ?? ''}
                              placeholder="0"
                              onChange={(e) => {
                                setCartQty(item, parseInt(e.target.value) || 0);
                              }}
                              onFocus={(e) => e.target.select()}
                              className="w-full mt-0.5 px-2 py-1.5 rounded-lg bg-[#F5F6FA] border border-[#E8ECF0] text-[14px] font-bold text-center text-[#1A1D26] outline-none focus:border-[#34C759] focus:ring-1 focus:ring-[#34C759]/20"
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
      <div className="w-[380px] flex-shrink-0 bg-white border-l border-[#E8ECF0] flex flex-col min-h-0">
        {/* Customer search - compact */}
        <div className="flex-shrink-0 px-4 pt-4 pb-3 border-b border-[#F2F4F7]">
          <label className="block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide mb-1.5">
            Харилцагч
          </label>
          <div ref={searchRef} className="relative">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8C8FA3] absolute left-3 top-1/2 -translate-y-1/2" />
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
                className="w-full pl-9 pr-8 py-2 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0] text-[13px] text-[#1A1D26] outline-none transition-all focus:border-[#007AFF] focus:ring-[2px] focus:ring-[#007AFF]/15 focus:bg-white"
              />
              {selectedCustomerId && (
                <button
                  onClick={clearCustomer}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-[#AEAEB2]/20 flex items-center justify-center"
                >
                  <X className="w-3 h-3 text-[#8C8FA3]" />
                </button>
              )}
            </div>

            {/* Customer dropdown */}
            {showCustomerList && !selectedCustomerId && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white rounded-xl border border-[#E8ECF0] shadow-lg max-h-[240px] overflow-y-auto">
                {filteredCustomers.length === 0 ? (
                  <div className="px-4 py-5 text-center text-[13px] text-[#8C8FA3]">Харилцагч олдсонгүй</div>
                ) : (
                  filteredCustomers.slice(0, 30).map((c) => (
                    <button
                      key={c.id}
                      onClick={() => selectCustomer(c)}
                      className="w-full text-left px-3 py-2.5 hover:bg-[#F5F6FA] active:bg-[#F2F4F7] transition-colors border-b border-[#F2F4F7] last:border-b-0"
                    >
                      <p className="text-[13px] font-medium text-[#1A1D26]">{c.storeName}</p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {c.phone && (
                          <span className="text-[11px] text-[#8C8FA3] flex items-center gap-0.5">
                            <Phone className="w-2.5 h-2.5" /> {c.phone}
                          </span>
                        )}
                        {c.address && (
                          <span className="text-[11px] text-[#8C8FA3] truncate flex items-center gap-0.5">
                            <MapPin className="w-2.5 h-2.5" /> {c.address}
                          </span>
                        )}
                        {c.region && (
                          <span className="text-[10px] text-[#007AFF] bg-[#007AFF]/10 px-1.5 py-0.5 rounded-md">{c.region.name}</span>
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
            <div className="mt-2 bg-[#34C759]/5 border border-[#34C759]/20 rounded-xl p-2 flex items-center gap-2">
              <Check className="w-3.5 h-3.5 text-[#34C759] flex-shrink-0" />
              <div className="min-w-0 flex-1">
                <span className="text-[13px] text-[#1A1D26] font-semibold truncate block">{selectedCustomer.storeName}</span>
                <span className="text-[11px] text-[#8C8FA3] truncate block">
                  {[selectedCustomer.phone, selectedCustomer.address].filter(Boolean).join(' / ')}
                </span>
              </div>
            </div>
          )}
        </div>

        {/* Cart items list - scrollable middle section */}
        <div className="flex-1 overflow-y-auto min-h-0">
          {cart.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="Сагс хоосон байна"
              hint="Зүүн талаас бараа сонгоно уу"
            />
          ) : (
            <div className="px-4 py-3 space-y-2">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide">
                  Сагс
                </span>
                <span className="text-[11px] text-[#AEAEB2]">
                  {cart.length} бараа / {cart.reduce((s, c) => s + c.quantity, 0)} ш
                </span>
              </div>
              {cart.map((item) => (
                <div
                  key={item.productId}
                  className="flex items-center gap-2.5 p-2.5 rounded-xl bg-[#F5F6FA] border border-[#E8ECF0]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-medium text-[#1A1D26] truncate">{item.name}</p>
                    <p className="text-[11px] text-[#8C8FA3]">
                      {item.quantity} ш
                      {item.unitsPerBox > 1 && ` (${Math.floor(item.quantity / item.unitsPerBox)}х${item.quantity % item.unitsPerBox > 0 ? ` +${item.quantity % item.unitsPerBox}ш` : ''})`}
                      {' '}&times; {formatMnt(item.unitPrice)}
                    </p>
                  </div>
                  <span className="text-[13px] font-bold text-[#1A1D26] flex-shrink-0 tabular-nums">
                    {formatMnt(item.quantity * item.unitPrice)}
                  </span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateCartQty(item.productId, -1)}
                      className="w-7 h-7 rounded-md bg-white flex items-center justify-center active:scale-[0.92] transition-all border border-[#E8ECF0]"
                    >
                      <Minus className="w-3 h-3 text-[#8C8FA3]" />
                    </button>
                    <span className="w-6 text-center text-[13px] font-bold text-[#1A1D26] tabular-nums">
                      {item.quantity}
                    </span>
                    <button
                      onClick={() => updateCartQty(item.productId, 1)}
                      disabled={item.quantity >= item.maxQty}
                      className="w-7 h-7 rounded-md bg-white flex items-center justify-center active:scale-[0.92] transition-all border border-[#E8ECF0] disabled:opacity-40"
                    >
                      <Plus className="w-3 h-3 text-[#8C8FA3]" />
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
        <div className="flex-shrink-0 border-t border-[#E8ECF0] bg-white">
          {/* Cart total */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-[#F2F4F7]">
            <span className="text-[13px] font-semibold text-[#8C8FA3]">Нийт дүн</span>
            <span className="text-[20px] font-bold text-[#1A1D26] tabular-nums">{formatMnt(cartTotal)}</span>
          </div>

          {/* Payment method - horizontal pills */}
          <div className="px-4 py-3 space-y-2">
            <label className="block text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide">
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
                        : 'bg-[#F2F4F7] text-[#1A1D26] border-[#E8ECF0] hover:bg-[#E8ECF0]'
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
              <div className="bg-[#F5F6FA] rounded-xl p-2.5 space-y-2 mt-1">
                <p className="text-[10px] font-semibold text-[#8C8FA3] uppercase">Хосолсон задаргаа</p>
                {combinedPayments.map((cp, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <select
                      value={cp.method}
                      onChange={(e) => updateCombinedPayment(idx, 'method', e.target.value)}
                      className="flex-1 px-2 py-1.5 rounded-lg bg-white border border-[#E8ECF0] text-[12px] text-[#1A1D26] outline-none"
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
                      className="w-24 px-2 py-1.5 rounded-lg bg-white border border-[#E8ECF0] text-[12px] text-[#1A1D26] outline-none text-right tabular-nums"
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
                    <p className="text-[11px] text-[#8C8FA3] tabular-nums">
                      {formatMnt(combinedTotal)} / {formatMnt(cartTotal)}
                    </p>
                    {Math.abs(combinedRemaining) > 1 && (
                      <p className={`text-[11px] font-semibold tabular-nums ${combinedRemaining > 0 ? 'text-[#FF3B30]' : 'text-[#FF9500]'}`}>
                        {combinedRemaining > 0 ? `Дутуу: ${formatMnt(combinedRemaining)}` : `Илүү: ${formatMnt(Math.abs(combinedRemaining))}`}
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
              className="w-full h-12 rounded-xl text-[15px] font-bold text-white transition-all active:scale-[0.97] disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg shadow-[#34C759]/25"
              style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}
            >
              {submitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" /> Бүртгэж байна...
                </>
              ) : (
                <>
                  <Check className="w-5 h-5" /> Борлуулалт бүртгэх {cartTotal > 0 && formatMnt(cartTotal)}
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      </div>

      {/* ==================== ГАР УТАС: нэг баганат зохиомж ==================== */}
      <MobilePos
        loadNumber={truckLoad.loadNumber}
        driverName={driverName}
        totalLoaded={totalLoaded}
        totalSold={totalSold}
        totalRemaining={totalRemaining}
        onRefresh={fetchData}
        customerName={selectedCustomer?.storeName ?? null}
        customerDetail={
          [selectedCustomer?.phone, selectedCustomer?.address].filter(Boolean).join(' · ') || null
        }
        onPickCustomer={() => setCustomerSheetOpen(true)}
        productSearch={productSearch}
        onProductSearchChange={setProductSearch}
        onScan={() => {
          setScanFeedback(null);
          setScannerOpen(true);
        }}
        products={mobileProducts}
        totalProductCount={availableProducts.length}
        onQtyChange={setQtyByProductId}
        cartItemCount={cart.length}
        cartUnitCount={cartUnitCount}
        cartTotal={cartTotal}
        onOpenCart={() => setCartSheetOpen(true)}
        bottomInset={bottomInset}
      />

      {/* Гар утасны сагс / төлбөрийн хуудас */}
      <CartSheet
        open={cartSheetOpen}
        onClose={() => setCartSheetOpen(false)}
        cart={cart}
        onQtyChange={setCartLineQty}
        onRemove={removeFromCart}
        onClearAll={clearCart}
        total={cartTotal}
        customerName={selectedCustomer?.storeName ?? null}
        onPickCustomer={() => setCustomerSheetOpen(true)}
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        combinedPayments={combinedPayments}
        onCombinedChange={updateCombinedPayment}
        onAddCombinedRow={addCombinedRow}
        onRemoveCombinedRow={removeCombinedRow}
        onAutoFillLastCombined={autoFillLastCombined}
        combinedTotal={combinedTotal}
        combinedRemaining={combinedRemaining}
        submitting={submitting}
        onSubmit={handleSubmit}
      />

      {/* Гар утасны харилцагч сонгох хуудас */}
      {customerSheetOpen && (
      <CustomerSheet
        customers={customers}
        selectedId={selectedCustomerId}
        onSelect={(c) => {
          selectCustomer(c);
          setCustomerSheetOpen(false);
        }}
        onClose={() => setCustomerSheetOpen(false)}
      />
      )}

      {/* Камерын зураасан код уншигч */}
      <BarcodeScanner
        open={scannerOpen}
        onClose={() => {
          setScannerOpen(false);
          setScanFeedback(null);
        }}
        onDetected={handleBarcode}
        feedback={scanFeedback}
        title="Бараа скан хийх"
        hint="Барааны зураасан кодыг хүрээн дотор барина уу"
      />
    </>
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
