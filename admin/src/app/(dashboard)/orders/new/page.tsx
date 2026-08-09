'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
import { primaryBarcode, matchesSearch, hasBarcode } from '@/lib/barcode';
import {
  ChevronLeft,
  Search,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  Package,
  User,
  X,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { SearchField } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

interface Product {
  id: string;
  name: string;
  barcodes?: { code: string }[];
  sellingPrice: number;
  stockAvailable: number;
  imageUrl?: string;
  category?: { name: string };
  supplier?: { name: string };
}

interface Customer {
  id: string;
  storeName: string;
  contactName: string;
  phone?: string;
  pricingTier?: string;
}

interface CartItem {
  product: Product;
  quantity: number;
}

export default function NewOrderPage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [productSearch, setProductSearch] = useState('');
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerPicker, setShowCustomerPicker] = useState(false);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  useEffect(() => {
    api.get('/api/products?limit=100').then(res => {
      setProducts(res.data?.data ?? []);
    }).catch(() => setError('Бүтээгдэхүүний жагсаалт ачааллахад алдаа гарлаа'));
    api.get('/api/customers?limit=100').then(res => {
      setCustomers(res.data?.data ?? []);
    }).catch(() => setError('Харилцагчдын жагсаалт ачааллахад алдаа гарлаа'));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!productSearch) return products;
    const q = productSearch.toLowerCase();
    return products.filter(p =>
      matchesSearch(p, q) ||
      p.category?.name?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.storeName.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q)
    );
  }, [customers, customerSearch]);

  const addToCart = (product: Product) => {
    setCart(prev => {
      const existing = prev.find(i => i.product.id === product.id);
      if (existing) {
        if (existing.quantity >= product.stockAvailable) return prev;
        return prev.map(i =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      if (product.stockAvailable <= 0) return prev;
      return [...prev, { product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.product.id !== productId) return item;
        const newQty = item.quantity + delta;
        if (newQty <= 0) return item;
        if (newQty > item.product.stockAvailable) return item;
        return { ...item, quantity: newQty };
      });
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(i => i.product.id !== productId));
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + Number(item.product.sellingPrice) * item.quantity, 0);
  }, [cart]);

  const cartCount = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart]);

  const handleSubmit = async () => {
    if (!selectedCustomer) {
      setError('Харилцагч сонгоно уу');
      return;
    }
    if (cart.length === 0) {
      setError('Бүтээгдэхүүн нэмнэ үү');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/api/orders/admin', {
        customerId: selectedCustomer.id,
        items: cart.map(item => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
        notes: notes || undefined,
      });
      setSuccess(true);
      setTimeout(() => router.push('/orders'), 1500);
    } catch (err: any) {
      setError(err.response?.data?.message ?? 'Захиалга үүсгэхэд алдаа гарлаа');
    } finally {
      setSubmitting(false);
    }
  };

  const getCartQty = (productId: string) => {
    return cart.find(i => i.product.id === productId)?.quantity ?? 0;
  };

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] animate-ios-scale-in">
        <div className="text-center">
          <div className="w-20 h-20 rounded-full bg-[#34C759]/10 flex items-center justify-center mx-auto mb-4">
            <Check className="w-10 h-10 text-[#34C759]" />
          </div>
          <h2 className="text-[22px] font-bold text-[#1A1D26] mb-1">Захиалга үүсгэлээ!</h2>
          <p className="text-[15px] text-[#8C8FA3]">Захиалга руу шилжиж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-ios-fade-in">
      {/* Header */}
      <div className="space-y-3">
        <button onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[13px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors active:scale-[0.97]">
          <ChevronLeft className="w-4 h-4" /> Захиалга
        </button>
        <PageHeader
          title="Шинэ захиалга"
          subtitle="Харилцагч сонгож, бараа сагслан захиалга үүсгэх"
          icon={ShoppingCart}
          actions={
            <div className="relative inline-flex items-center gap-2 h-10 px-4 rounded-xl bg-white border border-[#E8ECF0]/70 shadow-sm">
              <ShoppingCart className="w-[18px] h-[18px] text-[#1A1D26]" />
              <span className="text-[14px] font-bold text-[#1A1D26] tabular-nums">{cartCount}</span>
              {cartCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 rounded-full bg-[#FF3B30] text-white text-[10px] font-bold flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </div>
          }
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Product catalog (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer Selector */}
          <SectionCard title="Харилцагч">
            {selectedCustomer ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#007AFF]/[0.06] border border-[#007AFF]/20">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                     style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
                  {selectedCustomer.storeName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1D26] truncate">{selectedCustomer.storeName}</p>
                  <p className="text-[13px] text-[#8C8FA3] truncate">{selectedCustomer.contactName} {selectedCustomer.phone ? `· ${selectedCustomer.phone}` : ''}</p>
                </div>
                <button onClick={() => { setSelectedCustomer(null); setShowCustomerPicker(true); }}
                  className="p-2 rounded-lg hover:bg-[#007AFF]/10 transition-colors shrink-0">
                  <X className="w-4 h-4 text-[#007AFF]" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowCustomerPicker(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-[#E8ECF0] hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all">
                <User className="w-5 h-5 text-[#8C8FA3]" />
                <span className="text-[14px] text-[#8C8FA3]">Харилцагч сонгох...</span>
              </button>
            )}
          </SectionCard>

          {/* Product Search */}
          <SearchField
            value={productSearch}
            onChange={setProductSearch}
            placeholder="Бүтээгдэхүүн хайх..."
            className="w-full"
          />

          {/* Product Grid */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            {filteredProducts.map((product) => {
              const inCart = getCartQty(product.id);
              const outOfStock = product.stockAvailable <= 0;
              return (
                <button key={product.id}
                  onClick={() => !outOfStock && addToCart(product)}
                  disabled={outOfStock}
                  className={`relative bg-white rounded-2xl shadow-sm border p-3 text-left transition-all active:scale-[0.97] ${
                    inCart > 0 ? 'border-[#007AFF]/40 ring-2 ring-[#007AFF]/10' : 'border-[#E8ECF0]/70'
                  } ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}>
                  {/* Image */}
                  <div className="w-full aspect-square rounded-xl bg-[#F5F6FA] flex items-center justify-center mb-2.5 overflow-hidden">
                    {product.imageUrl ? (
                      <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${product.imageUrl}`} alt={product.name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-[#C7C7CC]" />
                    )}
                  </div>
                  <p className="text-[14px] font-semibold text-[#1A1D26] truncate">{product.name}</p>
                  <p className="text-[12px] text-[#8C8FA3] truncate">{product.category?.name ?? ''}</p>
                  <div className="flex items-center justify-between mt-1.5 gap-1">
                    <span className="text-[15px] font-bold text-[#007AFF] tabular-nums truncate">{formatMnt(product.sellingPrice)}</span>
                    <span className={`text-[11px] font-semibold shrink-0 ${outOfStock ? 'text-[#FF3B30]' : 'text-[#8C8FA3]'}`}>
                      {outOfStock ? 'Дууссан' : `${product.stockAvailable}ш`}
                    </span>
                  </div>
                  {/* Cart badge */}
                  {inCart > 0 && (
                    <div className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-[#007AFF] text-white text-[12px] font-bold flex items-center justify-center shadow-md">
                      {inCart}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Right: Cart (2 cols) */}
        <div className="lg:col-span-2">
          <div className="lg:sticky lg:top-20 space-y-4">
            {/* Cart Items */}
            <SectionCard title={`Сагс (${cartCount} бараа)`} noPadding>
              {cart.length === 0 ? (
                <EmptyState icon={ShoppingCart} title="Сагс хоосон" hint="Зүүн талаас бараа сонгож нэмнэ үү" />
              ) : (
                <div className="divide-y divide-[#F2F4F7] max-h-[400px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="px-4 py-3 flex items-center gap-3">
                      {/* Product image */}
                      <div className="w-10 h-10 rounded-lg bg-[#F5F6FA] flex items-center justify-center overflow-hidden shrink-0">
                        {item.product.imageUrl ? (
                          <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${item.product.imageUrl}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-[#C7C7CC]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#1A1D26] truncate">{item.product.name}</p>
                        <p className="text-[12px] text-[#8C8FA3] tabular-nums">{formatMnt(item.product.sellingPrice)}</p>
                      </div>
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-[#F2F4F7] flex items-center justify-center hover:bg-[#E8ECF0] transition-colors active:scale-90">
                          {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" /> : <Minus className="w-3.5 h-3.5 text-[#8C8FA3]" />}
                        </button>
                        <span className="w-8 text-center text-[14px] font-bold text-[#1A1D26] tabular-nums">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.stockAvailable}
                          className="w-7 h-7 rounded-lg bg-[#F2F4F7] flex items-center justify-center hover:bg-[#E8ECF0] transition-colors active:scale-90 disabled:opacity-30">
                          <Plus className="w-3.5 h-3.5 text-[#8C8FA3]" />
                        </button>
                      </div>
                      {/* Line total */}
                      <span className="text-[14px] font-semibold text-[#1A1D26] w-20 text-right shrink-0 tabular-nums">
                        {formatMnt(Number(item.product.sellingPrice) * item.quantity)}
                      </span>
                      {/* Remove */}
                      <button onClick={() => removeFromCart(item.product.id)}
                        className="p-1 rounded-lg hover:bg-[#FF3B30]/10 transition-colors shrink-0">
                        <X className="w-3.5 h-3.5 text-[#FF3B30]" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </SectionCard>

            {/* Notes */}
            <SectionCard title="Тэмдэглэл">
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Нэмэлт тэмдэглэл..."
                rows={2}
                className="w-full px-3.5 py-3 rounded-xl bg-[#F5F6FA] border border-transparent text-[14px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none transition-all focus:border-[#007AFF]/40 focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10 resize-none" />
            </SectionCard>

            {/* Total & Submit */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[14px] text-[#8C8FA3]">Нийт дүн</span>
                <span className="text-[22px] font-bold text-[#1A1D26] tabular-nums">{formatMnt(cartTotal)}</span>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FF3B30]/10">
                  <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0" />
                  <span className="text-[13px] font-medium text-[#FF3B30]">{error}</span>
                </div>
              )}

              <button onClick={handleSubmit}
                disabled={submitting || cart.length === 0 || !selectedCustomer}
                className="w-full py-3.5 rounded-xl text-[16px] font-semibold text-white shadow-sm shadow-[#34C759]/25 transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed hover:brightness-105"
                style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}>
                {submitting ? 'Үүсгэж байна...' : 'Захиалга үүсгэх'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Customer Picker Modal */}
      {showCustomerPicker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setShowCustomerPicker(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-ios-scale-in max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#F0F2F5]">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[18px] font-bold text-[#1A1D26]">Харилцагч сонгох</h3>
                <button onClick={() => setShowCustomerPicker(false)}
                  className="p-1.5 rounded-lg hover:bg-[#F2F4F7] transition-colors">
                  <X className="w-5 h-5 text-[#8C8FA3]" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8C8FA3]" />
                <input type="text" placeholder="Хайх..." value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F5F6FA] border border-transparent text-[15px] text-[#1A1D26] placeholder-[#8C8FA3] outline-none transition-all focus:border-[#007AFF]/40 focus:bg-white focus:ring-[3px] focus:ring-[#007AFF]/10" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#F2F4F7]">
              {filteredCustomers.length === 0 ? (
                <div className="py-12 text-center text-[14px] text-[#8C8FA3]">Олдсонгүй</div>
              ) : (
                filteredCustomers.map(customer => (
                  <button key={customer.id}
                    onClick={() => { setSelectedCustomer(customer); setShowCustomerPicker(false); setCustomerSearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F7F9FC] transition-colors text-left">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                         style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}>
                      {customer.storeName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[#1A1D26] truncate">{customer.storeName}</p>
                      <p className="text-[13px] text-[#8C8FA3] truncate">
                        {customer.contactName} {customer.phone ? `· ${customer.phone}` : ''}
                        {customer.pricingTier ? ` · ${customer.pricingTier}` : ''}
                      </p>
                    </div>
                    <ChevronLeft className="w-4 h-4 text-[#C7C7CC] rotate-180 shrink-0" />
                  </button>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
