'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import { format, subDays } from 'date-fns';
import { BarChart3, TrendingUp, Users, DollarSign, RefreshCw } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

const tabs = [
  { id: 'sales', label: 'Борлуулалт' },
  { id: 'profit', label: 'Ашиг' },
  { id: 'debt', label: 'Тооцоо' },
];

export default function ReportsPage() {
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
      api.get(`/api/reports/daily-sales?${params}`).then(res => setSalesData(res.data)).catch((err) => { console.error(err); }),
      api.get(`/api/reports/profit?${params}`).then(res => setProfitData(res.data)).catch((err) => { console.error(err); }),
      api.get('/api/reports/customer-debt').then(res => {
        const d = res.data;
        setDebtData(d?.customers ?? d?.data ?? (Array.isArray(d) ? d : []));
      }).catch((err) => { console.error(err); }),
    ]).finally(() => setLoading(false));
  }, [startDate, endDate]);

  const summary = salesData?.summary ?? {};
  const dailyData = salesData?.daily ?? [];

  const inputClass = "px-3 py-2 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[14px] text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-[3px] focus:ring-[#007AFF]/15";

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Тайлан</h1>

      {/* Date range */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-medium text-[#8E8E93]">Эхлэх</label>
          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={inputClass} />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-[13px] font-medium text-[#8E8E93]">Дуусах</label>
          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={inputClass} />
        </div>
      </div>

      {/* Tabs */}
      <div className="inline-flex bg-[#E5E5EA]/60 rounded-xl p-1 gap-0.5">
        {tabs.map(t => (
          <button key={t.id} onClick={() => setActiveTab(t.id)}
            className={`px-5 py-2 rounded-lg text-[13px] font-semibold transition-all ${
              activeTab === t.id ? 'bg-white text-[#1C1C1E] shadow-sm' : 'text-[#8E8E93]'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="py-16 text-center"><RefreshCw className="w-6 h-6 text-[#8E8E93] mx-auto animate-spin" /></div>
      ) : (
        <>
          {/* Sales Tab */}
          {activeTab === 'sales' && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Нийт орлого', value: `₮${Number(summary.totalRevenue ?? 0).toLocaleString()}`, gradient: 'linear-gradient(135deg, #007AFF, #5AC8FA)' },
                  { label: 'Захиалга', value: summary.totalOrders ?? 0, gradient: 'linear-gradient(135deg, #FF9500, #FFCC00)' },
                  { label: 'Борлуулсан', value: `${summary.totalItemsSold ?? 0} ш`, gradient: 'linear-gradient(135deg, #34C759, #30D158)' },
                  { label: 'Дундаж', value: `₮${Number(summary.averageOrderValue ?? 0).toLocaleString()}`, gradient: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' },
                ].map((s, i) => (
                  <div key={s.label} className={`rounded-2xl p-4 text-white animate-ios-slide-up stagger-${i + 1}`} style={{ background: s.gradient }}>
                    <span className="text-[12px] font-medium text-white/70">{s.label}</span>
                    <div className="text-[20px] font-bold mt-1">{s.value}</div>
                  </div>
                ))}
              </div>

              {dailyData.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
                  <h3 className="text-[13px] font-semibold uppercase text-[#8E8E93] tracking-wide mb-4">Өдрийн борлуулалт</h3>
                  <div className="h-[280px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={dailyData}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#E5E5EA" />
                        <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#8E8E93' }} tickFormatter={(v) => format(new Date(v), 'MM/dd')} />
                        <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} tickFormatter={(v) => `₮${(v/1000).toFixed(0)}k`} />
                        <Tooltip formatter={(value: any) => [`₮${Number(value).toLocaleString()}`, 'Дүн']} labelFormatter={(l) => format(new Date(l), 'yyyy/MM/dd')} />
                        <Line type="monotone" dataKey="revenue" stroke="#007AFF" strokeWidth={2.5} dot={false} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Profit Tab */}
          {activeTab === 'profit' && profitData && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[
                  { label: 'Нийт орлого', value: `₮${Number(profitData.totalRevenue ?? 0).toLocaleString()}`, gradient: 'linear-gradient(135deg, #007AFF, #5AC8FA)' },
                  { label: 'Нийт зардал', value: `₮${Number(profitData.totalCost ?? 0).toLocaleString()}`, gradient: 'linear-gradient(135deg, #FF9500, #FFCC00)' },
                  { label: 'Цэвэр ашиг', value: `₮${Number(profitData.grossProfit ?? 0).toLocaleString()}`, gradient: 'linear-gradient(135deg, #34C759, #30D158)' },
                  { label: 'Ашгийн хувь', value: `${Number(profitData.margin ?? 0).toFixed(1)}%`, gradient: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' },
                ].map((s, i) => (
                  <div key={s.label} className={`rounded-2xl p-4 text-white animate-ios-slide-up stagger-${i + 1}`} style={{ background: s.gradient }}>
                    <span className="text-[12px] font-medium text-white/70">{s.label}</span>
                    <div className="text-[20px] font-bold mt-1">{s.value}</div>
                  </div>
                ))}
              </div>

              {profitData.byProduct?.length > 0 && (
                <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
                  <div className="px-4 py-3 border-b border-[#E5E5EA]/50">
                    <h3 className="text-[13px] font-semibold uppercase text-[#8E8E93] tracking-wide">Бүтээгдэхүүн тус бүр</h3>
                  </div>
                  <div className="divide-y divide-[#E5E5EA]/50">
                    {profitData.byProduct.map((p: any) => (
                      <div key={p.productId ?? p.name} className="flex items-center gap-3 px-4 py-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-[14px] font-semibold text-[#1C1C1E] truncate">{p.name ?? p.productName}</p>
                          <p className="text-[12px] text-[#8E8E93]">{p.totalQuantity ?? 0} ширхэг</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[14px] font-bold text-[#34C759]">₮{Number(p.profit ?? 0).toLocaleString()}</p>
                          <p className="text-[11px] text-[#8E8E93]">орлого: ₮{Number(p.revenue ?? 0).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debt Tab */}
          {activeTab === 'debt' && (
            <div className="space-y-4">
              <div className="rounded-2xl p-5 text-white" style={{ background: 'linear-gradient(135deg, #FF3B30, #FF6961)' }}>
                <span className="text-[12px] font-medium text-white/70">Нийт тооцоо</span>
                <div className="text-[28px] font-bold mt-1">
                  ₮{debtData.reduce((s: number, c: any) => s + Number(c.outstandingDebt ?? 0), 0).toLocaleString()}
                </div>
              </div>

              <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
                {debtData.length === 0 ? (
                  <div className="py-12 text-center">
                    <p className="text-[15px] text-[#8E8E93]">Тооцоотой харилцагч байхгүй</p>
                  </div>
                ) : (
                  <div className="divide-y divide-[#E5E5EA]/50">
                    {debtData.map((c: any) => {
                      const debt = Number(c.outstandingDebt ?? 0);
                      const limit = Number(c.creditLimit ?? 1);
                      const pct = Math.min((debt / limit) * 100, 100);
                      return (
                        <div key={c.id} className="px-4 py-3.5">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-[15px] font-semibold text-[#1C1C1E]">{c.storeName}</p>
                            <p className="text-[15px] font-bold text-[#FF3B30]">₮{debt.toLocaleString()}</p>
                          </div>
                          <div className="flex items-center gap-3">
                            <div className="flex-1 h-2 bg-[#F2F2F7] rounded-full overflow-hidden">
                              <div className="h-full rounded-full transition-all duration-500"
                                   style={{ width: `${pct}%`, background: pct > 80 ? '#FF3B30' : pct > 50 ? '#FF9500' : '#34C759' }} />
                            </div>
                            <span className="text-[12px] font-medium text-[#8E8E93] w-12 text-right">{pct.toFixed(0)}%</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
