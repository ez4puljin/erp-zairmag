'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import {
  ScrollText, RefreshCw, DollarSign, CreditCard,
  Banknote, Building2, Clock, ChevronDown, ChevronUp,
  Package, User,
} from 'lucide-react';

const PAYMENT_LABELS: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  CASH: { label: 'Бэлэн', color: '#10B981', bg: '#ECFDF5', icon: Banknote },
  BANK_TRANSFER: { label: 'Шилжүүлэг', color: '#007AFF', bg: '#EFF6FF', icon: Building2 },
  CARD: { label: 'Карт', color: '#5856D6', bg: '#EEF2FF', icon: CreditCard },
  CREDIT: { label: 'Зээл', color: '#F59E0B', bg: '#FFFBEB', icon: Clock },
  COMBINED: { label: 'Хосолсон', color: '#EF4444', bg: '#FEF2F2', icon: DollarSign },
  MOBILE_MONEY: { label: 'Мобайл', color: '#EC4899', bg: '#FDF2F8', icon: DollarSign },
  CHECK: { label: 'Чек', color: '#6B7280', bg: '#F3F4F6', icon: DollarSign },
};

export default function DriverSalesHistoryPage() {
  const [load, setLoad] = useState<any>(null);
  const [sales, setSales] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const loadRes = await api.get('/api/truck-loads/driver/active');
      const truckLoad = loadRes.data;
      setLoad(truckLoad);
      if (truckLoad?.id) {
        const salesRes = await api.get(`/api/truck-sales/truck-load/${truckLoad.id}`);
        setSales(salesRes.data ?? []);
      }
    } catch {
      setLoad(null);
      setSales([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Payment method breakdown
  const paymentBreakdown = useMemo(() => {
    const breakdown: Record<string, number> = {};
    for (const sale of sales) {
      const method = sale.paymentMethod ?? 'CASH';
      breakdown[method] = (breakdown[method] ?? 0) + Number(sale.totalAmount ?? 0);
    }
    return breakdown;
  }, [sales]);

  const totalSales = sales.reduce((s, sale) => s + Number(sale.totalAmount ?? 0), 0);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <RefreshCw className="w-6 h-6 text-[#007AFF] animate-spin" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-[18px] font-bold text-[#1A1D26]">Борлуулалтын түүх</h2>
          <p className="text-[12px] text-[#8C8FA3]">{sales.length} борлуулалт · ₮{totalSales.toLocaleString()}</p>
        </div>
        <button onClick={fetchData} className="p-2 rounded-xl bg-white border border-[#E8ECF0]">
          <RefreshCw className="w-4 h-4 text-[#8C8FA3]" />
        </button>
      </div>

      {/* Total card */}
      <div className="bg-gradient-to-br from-[#5856D6] to-[#007AFF] rounded-2xl p-5 text-white">
        <p className="text-[12px] text-white/70 font-medium">Нийт борлуулалт</p>
        <p className="text-[28px] font-bold mt-1">₮{totalSales.toLocaleString()}</p>
        <p className="text-[11px] text-white/60 mt-1">{sales.length} борлуулалт · Ачилт #{load?.loadNumber ?? '-'}</p>
      </div>

      {/* Payment method breakdown */}
      {Object.keys(paymentBreakdown).length > 0 && (
        <div>
          <h3 className="text-[13px] font-bold text-[#1A1D26] mb-2">Төлбөрийн задаргаа</h3>
          <div className="grid grid-cols-2 gap-2">
            {Object.entries(paymentBreakdown).map(([method, amount]) => {
              const pm = PAYMENT_LABELS[method] ?? PAYMENT_LABELS.CASH;
              const Icon = pm.icon;
              return (
                <div key={method} className="bg-white rounded-xl border border-[#E8ECF0] p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: pm.bg }}>
                    <Icon className="w-4 h-4" style={{ color: pm.color }} />
                  </div>
                  <div>
                    <p className="text-[11px] text-[#8C8FA3]">{pm.label}</p>
                    <p className="text-[14px] font-bold text-[#1A1D26]">₮{amount.toLocaleString()}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Sales list */}
      <div>
        <h3 className="text-[13px] font-bold text-[#1A1D26] mb-2">Борлуулалтууд</h3>
        {sales.length === 0 ? (
          <div className="bg-white rounded-2xl border border-[#E8ECF0] py-12 text-center">
            <ScrollText className="w-10 h-10 text-[#D0D2DA] mx-auto mb-3" />
            <p className="text-[14px] text-[#8C8FA3]">Борлуулалт байхгүй</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sales.map((sale: any) => {
              const pm = PAYMENT_LABELS[sale.paymentMethod] ?? PAYMENT_LABELS.CASH;
              const isExpanded = expandedSaleId === sale.id;
              return (
                <div key={sale.id} className="bg-white rounded-xl border border-[#E8ECF0] overflow-hidden">
                  <button
                    onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                    className="w-full text-left p-4"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[#007AFF]">#{sale.saleNumber}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: pm.bg, color: pm.color }}>
                          {pm.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-[#1A1D26]">₮{Number(sale.totalAmount ?? 0).toLocaleString()}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8C8FA3]" /> : <ChevronDown className="w-4 h-4 text-[#8C8FA3]" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#8C8FA3]">
                      <span className="flex items-center gap-1"><User className="w-3 h-3" /> {sale.customer?.storeName ?? 'Харилцагч'}</span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </button>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="border-t border-[#F2F4F7] px-4 py-3 bg-[#F9FAFB]">
                      {(sale.items ?? []).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Package className="w-3 h-3 text-[#8C8FA3] shrink-0" />
                            <span className="text-[12px] text-[#4A4D5C] truncate">{item.product?.name ?? 'Бараа'}</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[11px] text-[#8C8FA3]">{item.quantity} × ₮{Number(item.unitPrice ?? 0).toLocaleString()}</span>
                            <span className="text-[12px] font-semibold text-[#1A1D26] ml-2">₮{Number(item.lineTotal ?? 0).toLocaleString()}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
