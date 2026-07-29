'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format, subDays } from 'date-fns';
import { TrendingUp, RefreshCw, FileSpreadsheet } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { DateField } from '@/components/shared/filter-bar';
import { formatMnt } from '@/components/shared/money';
import { downloadFile } from '@/lib/download';

const tabs = [
  { id: 'sales', label: 'Борлуулалт' },
  { id: 'profit', label: 'Ашиг' },
  { id: 'debt', label: 'Тооцоо' },
];

export default function AnalyticsPage() {
  const [activeTab, setActiveTab] = useState('sales');
  const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
  const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
  const [salesData, setSalesData] = useState<any>(null);
  const [profitData, setProfitData] = useState<any>(null);
  const [debtData, setDebtData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    const params = `startDate=${startDate}&endDate=${endDate}`;
    Promise.all([
      api.get(`/api/reports/daily-sales?${params}`).then((res) => setSalesData(res.data)).catch(() => {}),
      api.get(`/api/reports/profit?${params}`).then((res) => setProfitData(res.data)).catch(() => {}),
      api.get('/api/reports/customer-debt').then((res) => {
        const d = res.data;
        setDebtData(d?.customers ?? d?.data ?? (Array.isArray(d) ? d : []));
      }).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, [startDate, endDate]);

  const summary = salesData?.summary ?? {};
  const dailyData = salesData?.daily ?? [];

  function exportCurrent() {
    const params = `startDate=${startDate}&endDate=${endDate}`;
    if (activeTab === 'sales') return downloadFile(`/api/reports/daily-sales/export?${params}`, `odriin-borluulalt-${startDate}_${endDate}.xlsx`);
    if (activeTab === 'profit') return downloadFile(`/api/reports/profit/export?${params}`, `ashig-${startDate}_${endDate}.xlsx`);
  }

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Борлуулалтын анализ"
        subtitle="Өдрийн борлуулалт, ашиг, тооцоо"
        icon={TrendingUp}
        actions={
          activeTab !== 'debt' && (
            <button
              onClick={() => void exportCurrent()}
              className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl bg-white border border-[#E5E5EA] text-[13px] font-semibold text-[#1A1D26] hover:bg-[#F2F4F7] transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-[#34C759]" /> Excel
            </button>
          )
        }
      />

      <div className="flex flex-wrap items-center gap-3">
        <DateField label="Эхлэх" value={startDate} onChange={setStartDate} />
        <DateField label="Дуусах" value={endDate} onChange={setEndDate} />
        <div className="inline-flex bg-[#E5E5EA]/60 rounded-xl p-1 gap-0.5 self-end">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
                activeTab === t.id ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-[#8E8E93]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="py-16 text-center"><RefreshCw className="w-6 h-6 text-[#8E8E93] mx-auto animate-spin" /></div>
      ) : (
        <>
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <StatGrid>
                <StatCard label="Нийт орлого" value={formatMnt(summary.totalRevenue)} gradient="blue" index={0} />
                <StatCard label="Захиалга" value={summary.totalOrders ?? 0} gradient="orange" index={1} />
                <StatCard label="Борлуулсан" value={`${summary.totalItemsSold ?? 0} ш`} gradient="green" index={2} />
                <StatCard label="Дундаж" value={formatMnt(summary.averageOrderValue)} gradient="purple" index={3} />
              </StatGrid>

              {dailyData.length > 0 && (
                <SectionCard title="Өдрийн борлуулалт">
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} tickFormatter={(v) => format(new Date(v), 'MM/dd')} />
                        <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} tickFormatter={(v) => `₮${(v / 1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: any) => [formatMnt(value), 'Дүн']} labelFormatter={(l) => format(new Date(l), 'yyyy/MM/dd')} />
                        <Line type="monotone" dataKey="revenue" stroke="#007AFF" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {activeTab === 'profit' && profitData && (
            <div className="space-y-4">
              <StatGrid>
                <StatCard label="Нийт орлого" value={formatMnt(profitData.totalRevenue)} gradient="blue" index={0} />
                <StatCard label="Нийт зардал" value={formatMnt(profitData.totalCost)} gradient="orange" index={1} />
                <StatCard label="Цэвэр ашиг" value={formatMnt(profitData.grossProfit)} gradient="green" index={2} />
                <StatCard label="Ашгийн хувь" value={`${Number(profitData.margin ?? 0).toFixed(1)}%`} gradient="purple" index={3} />
              </StatGrid>

              {profitData.byProduct?.length > 0 && (
                <SectionCard title="Бүтээгдэхүүн тус бүр" noPadding>
                  <div className="divide-y divide-[#F2F4F7]">
                    {profitData.byProduct.map((p: any) => (
                      <div key={p.productId ?? p.productName} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#1A1D26] truncate">{p.productName ?? p.name}</p>
                          <p className="text-[12px] text-[#8C8FA3]">{p.unitsSold ?? p.totalQuantity ?? 0} ширхэг</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[14px] font-bold text-[#34C759]">{formatMnt(p.profit)}</p>
                          <p className="text-[11px] text-[#8C8FA3]">орлого: {formatMnt(p.revenue)}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </SectionCard>
              )}
            </div>
          )}

          {activeTab === 'debt' && (
            <div className="space-y-4">
              <StatCard
                label="Нийт тооцоо"
                value={formatMnt(debtData.reduce((s: number, c: any) => s + Number(c.outstandingDebt ?? 0), 0))}
                gradient="red"
                index={0}
              />
              <SectionCard noPadding>
                {debtData.length === 0 ? (
                  <div className="py-12 text-center"><p className="text-[15px] text-[#8C8FA3]">Тооцоотой харилцагч байхгүй</p></div>
                ) : (
                  <div className="divide-y divide-[#F2F4F7]">
                    {debtData.map((c: any) => {
                      const debt = Number(c.outstandingDebt ?? 0);
                      const limit = Number(c.creditLimit ?? 1);
                      const pct = Math.min((debt / limit) * 100, 100);
                      return (
                        <div key={c.id} className="px-4 py-3.5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[15px] font-semibold text-[#1A1D26]">{c.storeName}</p>
                            <p className="text-[15px] font-bold text-[#FF3B30]">{formatMnt(debt)}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[#F2F4F7] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500" style={{ width: `${pct}%`, background: pct > 80 ? '#FF3B30' : pct > 50 ? '#FF9500' : '#34C759' }} />
                            </div>
                            <span className="text-[12px] font-medium text-[#8C8FA3] w-12 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </SectionCard>
            </div>
          )}
        </>
      )}
    </div>
  );
}
