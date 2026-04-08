'use client';

import { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';
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

interface Product {
  id: string;
  name: string;
  sku: string;
  sellingPrice: number;
  stockAvailable: number;
  imageUrl?: string;
  category?: { name: string };
  supplier?: { name: string };
}

interface Customer {
  id: string;
  storeName: string;
  contactPerson: string;
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
      p.name.toLowerCase().includes(q) ||
      p.sku.toLowerCase().includes(q) ||
      p.category?.name?.toLowerCase().includes(q)
    );
  }, [products, productSearch]);

  const filteredCustomers = useMemo(() => {
    if (!customerSearch) return customers;
    const q = customerSearch.toLowerCase();
    return customers.filter(c =>
      c.storeName.toLowerCase().includes(q) ||
      c.contactPerson.toLowerCase().includes(q)
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
          <h2 className="text-[22px] font-bold text-[#1C1C1E] mb-1">Захиалга үүсгэлээ!</h2>
          <p className="text-[15px] text-[#8E8E93]">Захиалга руу шилжиж байна...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-ios-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <button onClick={() => router.back()}
            className="inline-flex items-center gap-1 text-[15px] text-[#007AFF] font-medium hover:text-[#0066D6] transition-colors mb-2 active:scale-[0.97]">
            <ChevronLeft className="w-5 h-5" /> Захиалга
          </button>
          <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Шинэ захиалга</h1>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative">
            <ShoppingCart className="w-6 h-6 text-[#1C1C1E]" />
            {cartCount > 0 && (
              <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-[#FF3B30] text-white text-[11px] font-bold flex items-center justify-center">
                {cartCount}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Left: Product catalog (3 cols) */}
        <div className="lg:col-span-3 space-y-4">
          {/* Customer Selector */}
          <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-4">
            <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-2">
              Харилцагч
            </label>
            {selectedCustomer ? (
              <div className="flex items-center gap-3 p-3 rounded-xl bg-[#007AFF]/5 border border-[#007AFF]/20">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white"
                     style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
                  {selectedCustomer.storeName.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1C1C1E]">{selectedCustomer.storeName}</p>
                  <p className="text-[13px] text-[#8E8E93]">{selectedCustomer.contactPerson} {selectedCustomer.phone ? `· ${selectedCustomer.phone}` : ''}</p>
                </div>
                <button onClick={() => { setSelectedCustomer(null); setShowCustomerPicker(true); }}
                  className="p-2 rounded-lg hover:bg-[#007AFF]/10 transition-colors">
                  <X className="w-4 h-4 text-[#007AFF]" />
                </button>
              </div>
            ) : (
              <button onClick={() => setShowCustomerPicker(true)}
                className="w-full flex items-center gap-3 p-3 rounded-xl border-2 border-dashed border-[#E5E5EA] hover:border-[#007AFF]/40 hover:bg-[#007AFF]/5 transition-all">
                <User className="w-5 h-5 text-[#AEAEB2]" />
                <span className="text-[15px] text-[#8E8E93]">Харилцагч сонгох...</span>
              </button>
            )}
          </div>

          {/* Product Search */}
          <div className="relative">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
            <input type="text" placeholder="Бүтээгдэхүүн хайх..." value={productSearch}
              onChange={(e) => setProductSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-[#E5E5EA]/40 border-none text-[15px] text-[#1C1C1E] placeholder-[#8E8E93] outline-none transition-all focus:bg-white focus:ring-2 focus:ring-[#007AFF]/20" />
          </div>

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
                    inCart > 0 ? 'border-[#007AFF]/40 ring-2 ring-[#007AFF]/10' : 'border-[#E5E5EA]/50'
                  } ${outOfStock ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}>
                  {/* Image */}
                  <div className="w-full aspect-square rounded-xl bg-[#F2F2F7] flex items-center justify-center mb-2.5 overflow-hidden">
                    {product.imageUrl ? (
                      <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${product.imageUrl}`} alt={product.name}
                        className="w-full h-full object-cover" />
                    ) : (
                      <Package className="w-8 h-8 text-[#AEAEB2]" />
                    )}
                  </div>
                  <p className="text-[14px] font-semibold text-[#1C1C1E] truncate">{product.name}</p>
                  <p className="text-[12px] text-[#8E8E93] truncate">{product.category?.name ?? ''}</p>
                  <div className="flex items-center justify-between mt-1.5">
                    <span className="text-[15px] font-bold text-[#007AFF]">₮{Number(product.sellingPrice).toLocaleString()}</span>
                    <span className={`text-[11px] font-medium ${outOfStock ? 'text-[#FF3B30]' : 'text-[#8E8E93]'}`}>
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
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
              <div className="px-4 py-3 border-b border-[#E5E5EA]/50">
                <h3 className="text-[15px] font-bold text-[#1C1C1E]">
                  Сагс ({cartCount} бараа)
                </h3>
              </div>

              {cart.length === 0 ? (
                <div className="py-12 text-center">
                  <ShoppingCart className="w-10 h-10 text-[#AEAEB2] mx-auto mb-2" />
                  <p className="text-[14px] text-[#8E8E93]">Сагс хоосон</p>
                </div>
              ) : (
                <div className="divide-y divide-[#E5E5EA]/50 max-h-[400px] overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.product.id} className="px-4 py-3 flex items-center gap-3">
                      {/* Product image */}
                      <div className="w-10 h-10 rounded-lg bg-[#F2F2F7] flex items-center justify-center overflow-hidden shrink-0">
                        {item.product.imageUrl ? (
                          <img src={`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}${item.product.imageUrl}`} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-5 h-5 text-[#AEAEB2]" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#1C1C1E] truncate">{item.product.name}</p>
                        <p className="text-[12px] text-[#8E8E93]">₮{Number(item.product.sellingPrice).toLocaleString()}</p>
                      </div>
                      {/* Quantity controls */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => updateQuantity(item.product.id, -1)}
                          className="w-7 h-7 rounded-lg bg-[#F2F2F7] flex items-center justify-center hover:bg-[#E5E5EA] transition-colors active:scale-90">
                          {item.quantity === 1 ? <Trash2 className="w-3.5 h-3.5 text-[#FF3B30]" /> : <Minus className="w-3.5 h-3.5 text-[#8E8E93]" />}
                        </button>
                        <span className="w-8 text-center text-[14px] font-bold text-[#1C1C1E]">{item.quantity}</span>
                        <button onClick={() => updateQuantity(item.product.id, 1)}
                          disabled={item.quantity >= item.product.stockAvailable}
                          className="w-7 h-7 rounded-lg bg-[#F2F2F7] flex items-center justify-center hover:bg-[#E5E5EA] transition-colors active:scale-90 disabled:opacity-30">
                          <Plus className="w-3.5 h-3.5 text-[#8E8E93]" />
                        </button>
                      </div>
                      {/* Line total */}
                      <span className="text-[14px] font-semibold text-[#1C1C1E] w-20 text-right shrink-0">
                        ₮{(Number(item.product.sellingPrice) * item.quantity).toLocaleString()}
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
            </div>

            {/* Notes */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-4">
              <label className="block text-[13px] font-semibold text-[#8E8E93] uppercase tracking-wide mb-1.5">
                Тэмдэглэл
              </label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)}
                placeholder="Нэмэлт тэмдэглэл..."
                rows={2}
                className="w-full px-3 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[14px] text-[#1C1C1E] placeholder-[#AEAEB2] outline-none focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15 focus:bg-white resize-none" />
            </div>

            {/* Total & Submit */}
            <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[15px] text-[#8E8E93]">Нийт дүн</span>
                <span className="text-[22px] font-bold text-[#1C1C1E]">₮{cartTotal.toLocaleString()}</span>
              </div>

              {error && (
                <div className="flex items-center gap-2 p-3 rounded-xl bg-[#FF3B30]/10">
                  <AlertTriangle className="w-4 h-4 text-[#FF3B30] shrink-0" />
                  <span className="text-[13px] font-medium text-[#FF3B30]">{error}</span>
                </div>
              )}

              <button onClick={handleSubmit}
                disabled={submitting || cart.length === 0 || !selectedCustomer}
                className="w-full py-3.5 rounded-xl text-[16px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-50 disabled:cursor-not-allowed"
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
          <div className="absolute inset-0 bg-black/40" onClick={() => setShowCustomerPicker(false)} />
          <div className="relative w-full max-w-md rounded-2xl bg-white shadow-2xl animate-ios-scale-in max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#E5E5EA]/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-[18px] font-bold text-[#1C1C1E]">Харилцагч сонгох</h3>
                <button onClick={() => setShowCustomerPicker(false)}
                  className="p-1 rounded-lg hover:bg-[#F2F2F7]">
                  <X className="w-5 h-5 text-[#8E8E93]" />
                </button>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8E8E93]" />
                <input type="text" placeholder="Хайх..." value={customerSearch}
                  onChange={e => setCustomerSearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-[#F2F2F7] border-none text-[15px] text-[#1C1C1E] placeholder-[#8E8E93] outline-none focus:ring-2 focus:ring-[#007AFF]/20" />
              </div>
            </div>
            <div className="flex-1 overflow-y-auto divide-y divide-[#E5E5EA]/50">
              {filteredCustomers.length === 0 ? (
                <div className="py-12 text-center text-[14px] text-[#8E8E93]">Олдсонгүй</div>
              ) : (
                filteredCustomers.map(customer => (
                  <button key={customer.id}
                    onClick={() => { setSelectedCustomer(customer); setShowCustomerPicker(false); setCustomerSearch(''); }}
                    className="w-full flex items-center gap-3 px-4 py-3 hover:bg-[#F2F2F7]/50 transition-colors text-left">
                    <div className="w-10 h-10 rounded-full flex items-center justify-center text-[13px] font-bold text-white shrink-0"
                         style={{ background: 'linear-gradient(135deg, #FF9500, #FFCC00)' }}>
                      {customer.storeName.charAt(0)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">{customer.storeName}</p>
                      <p className="text-[13px] text-[#8E8E93] truncate">
                        {customer.contactPerson} {customer.phone ? `· ${customer.phone}` : ''}
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
