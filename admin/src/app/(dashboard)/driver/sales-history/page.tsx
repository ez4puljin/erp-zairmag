'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '@/lib/api';
import {
  ScrollText, RefreshCw, DollarSign, CreditCard,
  Banknote, Building2, Clock, ChevronDown, ChevronUp,
  Package, User,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

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
    <div className="p-4 space-y-5 animate-ios-fade-in">
      {/* Header */}
      <PageHeader
        title="Борлуулалтын түүх"
        subtitle={`${sales.length} борлуулалт · ${formatMnt(totalSales)}`}
        icon={ScrollText}
        iconColor="#5856D6"
        actions={
          <button onClick={fetchData} className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-white border border-[#E8ECF0]/70 shadow-sm hover:bg-[#F2F4F7] active:scale-95 transition-all">
            <RefreshCw className="w-4 h-4 text-[#8C8FA3]" />
          </button>
        }
      />

      {/* KPIs */}
      <StatGrid cols={2}>
        <StatCard
          label="Нийт борлуулалт"
          value={formatMnt(totalSales)}
          hint={`Ачилт #${load?.loadNumber ?? '-'}`}
          icon={DollarSign}
          gradient="indigo"
          index={0}
        />
        <StatCard
          label="Борлуулалтын тоо"
          value={sales.length}
          hint="Гүйлгээ"
          icon={ScrollText}
          gradient="blue"
          index={1}
        />
      </StatGrid>

      {/* Payment method breakdown */}
      {Object.keys(paymentBreakdown).length > 0 && (
        <SectionCard title="Төлбөрийн задаргаа">
          <div className="grid grid-cols-2 gap-2.5">
            {Object.entries(paymentBreakdown).map(([method, amount]) => {
              const pm = PAYMENT_LABELS[method] ?? PAYMENT_LABELS.CASH;
              const Icon = pm.icon;
              return (
                <div key={method} className="bg-white rounded-xl border border-[#E8ECF0]/70 p-3 flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: pm.bg }}>
                    <Icon className="w-4 h-4" style={{ color: pm.color }} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[11px] text-[#8C8FA3]">{pm.label}</p>
                    <p className="text-[14px] font-bold text-[#1A1D26] tabular-nums truncate">{formatMnt(amount)}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      {/* Sales list */}
      <SectionCard title="Борлуулалтууд" noPadding>
        {sales.length === 0 ? (
          <EmptyState icon={ScrollText} title="Борлуулалт байхгүй" hint="Энэ ачилтад одоогоор борлуулалт бүртгэгдээгүй" />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {sales.map((sale: any) => {
              const pm = PAYMENT_LABELS[sale.paymentMethod] ?? PAYMENT_LABELS.CASH;
              const isExpanded = expandedSaleId === sale.id;
              return (
                <div key={sale.id} className="overflow-hidden">
                  <button
                    onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                    className="w-full text-left px-4 lg:px-5 py-3.5 hover:bg-[#F9FAFB] transition-colors"
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <div className="flex items-center gap-2">
                        <span className="text-[13px] font-bold text-[#007AFF]">#{sale.saleNumber}</span>
                        <span className="text-[9px] font-bold px-2 py-0.5 rounded-full" style={{ background: pm.bg, color: pm.color }}>
                          {pm.label}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[15px] font-bold text-[#1A1D26] tabular-nums">{formatMnt(sale.totalAmount)}</span>
                        {isExpanded ? <ChevronUp className="w-4 h-4 text-[#8C8FA3]" /> : <ChevronDown className="w-4 h-4 text-[#8C8FA3]" />}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 text-[11px] text-[#8C8FA3]">
                      <span className="flex items-center gap-1 min-w-0"><User className="w-3 h-3 shrink-0" /> <span className="truncate">{sale.customer?.storeName ?? 'Харилцагч'}</span></span>
                      <span className="flex items-center gap-1 shrink-0">
                        <Clock className="w-3 h-3" />
                        {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}
                      </span>
                    </div>
                  </button>

                  {/* Expanded items */}
                  {isExpanded && (
                    <div className="border-t border-[#F2F4F7] px-4 lg:px-5 py-3 bg-[#F9FAFB]">
                      {(sale.items ?? []).map((item: any, i: number) => (
                        <div key={i} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2 flex-1 min-w-0">
                            <Package className="w-3 h-3 text-[#8C8FA3] shrink-0" />
                            <span className="text-[12px] text-[#4A4D5C] truncate">{item.product?.name ?? 'Бараа'}</span>
                          </div>
                          <div className="text-right shrink-0 ml-2">
                            <span className="text-[11px] text-[#8C8FA3] tabular-nums">{item.quantity} × {formatMnt(item.unitPrice)}</span>
                            <span className="text-[12px] font-semibold text-[#1A1D26] ml-2 tabular-nums">{formatMnt(item.lineTotal)}</span>
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
      </SectionCard>
    </div>
  );
}
