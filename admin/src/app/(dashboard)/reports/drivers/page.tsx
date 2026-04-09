'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import api from '@/lib/api';
import {
  Truck, Users, TrendingUp, Package, ChevronDown, ChevronRight,
  Banknote, Building2, CreditCard, Smartphone, Receipt as ReceiptIcon,
  Clock, Layers, RefreshCw, Calendar,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell,
} from 'recharts';

const PAYMENT_LABELS: Record<string, { label: string; color: string; icon: any }> = {
  CASH:          { label: 'Бэлэн',     color: '#10B981', icon: Banknote },
  BANK_TRANSFER: { label: 'Шилжүүлэг', color: '#007AFF', icon: Building2 },
  MOBILE_MONEY:  { label: 'Мобайл',    color: '#EC4899', icon: Smartphone },
  CARD:          { label: 'Карт',      color: '#5856D6', icon: CreditCard },
  CHECK:         { label: 'Чек',       color: '#6B7280', icon: ReceiptIcon },
  CREDIT:        { label: 'Зээл',      color: '#F59E0B', icon: Clock },
  COMBINED:      { label: 'Хосолсон',  color: '#EF4444', icon: Layers },
};

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DISPATCHED: { label: 'Замд', color: '#5856D6' },
  COMPLETED:  { label: 'Дууссан', color: '#10B981' },
};

const fmt = (n: number) => `₮${Number(n ?? 0).toLocaleString('mn-MN')}`;

interface PaymentEntry { count: number; amount: number; }
interface Breakdown { [k: string]: PaymentEntry; }

interface LoadRow {
  loadId: string;
  loadNumber: number;
  loadDate: string;
  status: string;
  loaded: number;
  sold: number;
  returned: number;
  damaged: number;
  salesCount: number;
  salesRevenue: number;
  paymentBreakdown: Breakdown;
}

interface DriverRow {
  driverId: string;
  driverName: string;
  phone: string | null;
  loads: LoadRow[];
  summary: {
    totalLoads: number;
    loaded: number;
    sold: number;
    returned: number;
    damaged: number;
    totalRevenue: number;
    saleCount: number;
    paymentBreakdown: Breakdown;
  };
}

interface ReportData {
  summary: {
    totalLoads: number;
    totalLoadedQty: number;
    totalSoldQty: number;
    totalReturnedQty: number;
    totalDamagedQty: number;
    totalSalesRevenue: number;
    totalSaleCount: number;
    paymentBreakdown: Breakdown;
  };
  drivers: DriverRow[];
}

export default function DriverReportPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [from, setFrom] = useState(firstDay);
  const [to, setTo] = useState(todayStr);
  const [drivers, setDrivers] = useState<any[]>([]);
  const [driverId, setDriverId] = useState('');
  const [data, setData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [expandedSales, setExpandedSales] = useState<Set<string>>(new Set());

  useEffect(() => {
    api.get('/api/drivers').then(r => setDrivers(r.data ?? [])).catch(() => {});
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ from, to });
      if (driverId) params.set('driverId', driverId);
      const res = await api.get(`/api/reports/drivers?${params}`);
      setData(res.data);
    } catch (e: any) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchReport(); }, [from, to, driverId]);

  const toggle = (id: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSale = (id: string) => {
    setExpandedSales(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // Print receipt for a sale
  function printSaleReceipt(sale: any, driverName: string, loadNumber: number) {
    const items = sale.items ?? [];
    const pm: Record<string, string> = { CASH:'Бэлэн', BANK_TRANSFER:'Шилжүүлэг', CARD:'Карт', CREDIT:'Зээл', COMBINED:'Хосолсон', MOBILE_MONEY:'Мобайл' };
    const date = sale.createdAt ? new Date(sale.createdAt).toLocaleString('mn-MN') : '';
    let html = `<div style="font-family:sans-serif;max-width:400px;margin:auto;padding:20px">`;
    html += `<h2 style="text-align:center;margin:0">БОРЛУУЛАЛТЫН БАРИМТ</h2>`;
    html += `<p style="text-align:center;font-size:12px;color:#888">Баримт #${sale.saleNumber ?? '-'}</p>`;
    html += `<hr/>`;
    html += `<p><b>Огноо:</b> ${date}</p>`;
    html += `<p><b>Жолооч:</b> ${driverName} · Ачилт #${loadNumber}</p>`;
    html += `<p><b>Харилцагч:</b> ${sale.customer?.storeName ?? '-'}${sale.customer?.phone ? ' (' + sale.customer.phone + ')' : ''}</p>`;
    html += `<hr/>`;
    html += `<table style="width:100%;font-size:13px;border-collapse:collapse">`;
    html += `<tr style="border-bottom:1px solid #ddd"><th style="text-align:left">Бараа</th><th style="text-align:center">Тоо</th><th style="text-align:right">Үнэ</th><th style="text-align:right">Нийт</th></tr>`;
    items.forEach((it: any, i: number) => {
      html += `<tr style="border-bottom:1px solid #f0f0f0"><td>${i+1}. ${it.productName}</td><td style="text-align:center">${it.quantity}</td><td style="text-align:right">₮${Number(it.unitPrice).toLocaleString()}</td><td style="text-align:right">₮${Number(it.lineTotal).toLocaleString()}</td></tr>`;
    });
    html += `</table><hr/>`;
    html += `<p style="text-align:right;font-size:16px"><b>НИЙТ: ₮${Number(sale.totalAmount).toLocaleString()}</b></p>`;
    html += `<p><b>Төлбөр:</b> ${pm[sale.paymentMethod] ?? sale.paymentMethod}</p>`;
    html += `</div>`;
    const win = window.open('', '_blank', 'width=450,height=700');
    if (!win) { alert('Popup хаалттай'); return; }
    win.document.write(`<!DOCTYPE html><html><head><title>Баримт #${sale.saleNumber}</title></head><body>${html}<script>window.print();</script></body></html>`);
    win.document.close();
  }

  // Build chart data: stacked bar by driver, segments by payment method
  const chartData = useMemo(() => {
    if (!data) return [];
    return data.drivers.map(d => {
      const row: any = { name: d.driverName };
      for (const [method, val] of Object.entries(d.summary.paymentBreakdown)) {
        if (val.amount > 0) row[method] = val.amount;
      }
      return row;
    });
  }, [data]);

  const usedMethods = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const d of data.drivers) {
      for (const [m, v] of Object.entries(d.summary.paymentBreakdown)) {
        if (v.amount > 0) set.add(m);
      }
    }
    return Array.from(set);
  }, [data]);

  const inputClass = 'w-full px-3 py-2 rounded-xl bg-[#F2F2F7] text-[14px] text-[#1C1C1E] outline-none focus:ring-2 focus:ring-[#007AFF]/30 border border-transparent focus:border-[#007AFF]/20';

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-[1400px]">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-[24px] font-bold text-[#1C1C1E] tracking-tight">Жолоочийн тайлан</h1>
          <p className="text-[13px] text-[#8E8E93] mt-0.5">Ачилт болон борлуулалтын дэлгэрэнгүй тайлан</p>
        </div>
        <button
          onClick={fetchReport}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[13px] font-semibold text-[#4A4D5C] bg-white border border-[#E5E5EA]/60 hover:bg-[#F2F4F7] transition-all"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Сэргээх
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Эхний огноо
            </label>
            <input type="date" value={from} onChange={e => setFrom(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1.5 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Эцсийн огноо
            </label>
            <input type="date" value={to} onChange={e => setTo(e.target.value)} className={inputClass} />
          </div>
          <div>
            <label className="block text-[11px] font-bold text-[#8E8E93] uppercase mb-1.5 flex items-center gap-1">
              <Truck className="w-3 h-3" /> Жолооч
            </label>
            <select value={driverId} onChange={e => setDriverId(e.target.value)} className={inputClass}>
              <option value="">Бүх жолооч</option>
              {drivers.map((d: any) => (
                <option key={d.id} value={d.id}>{d.lastName} {d.firstName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      {data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="bg-white rounded-2xl p-4 border-l-4 border border-[#E5E5EA]/50" style={{ borderLeftColor: '#007AFF' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase">Нийт орлого</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#007AFF]/10">
                <TrendingUp className="w-4 h-4 text-[#007AFF]" />
              </div>
            </div>
            <div className="text-[20px] font-bold text-[#1C1C1E]">{fmt(data.summary.totalSalesRevenue)}</div>
            <p className="text-[11px] text-[#8E8E93] mt-1">{data.summary.totalSaleCount} борлуулалт</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border-l-4 border border-[#E5E5EA]/50" style={{ borderLeftColor: '#34C759' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase">Зарагдсан</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#34C759]/10">
                <Package className="w-4 h-4 text-[#34C759]" />
              </div>
            </div>
            <div className="text-[20px] font-bold text-[#1C1C1E]">{data.summary.totalSoldQty} ш</div>
            <p className="text-[11px] text-[#8E8E93] mt-1">{data.summary.totalLoadedQty} ачсанаас</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border-l-4 border border-[#E5E5EA]/50" style={{ borderLeftColor: '#FF9500' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase">Ачилт</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#FF9500]/10">
                <Truck className="w-4 h-4 text-[#FF9500]" />
              </div>
            </div>
            <div className="text-[20px] font-bold text-[#1C1C1E]">{data.summary.totalLoads}</div>
            <p className="text-[11px] text-[#8E8E93] mt-1">{data.summary.totalReturnedQty}/{data.summary.totalDamagedQty} буцаалт/гэмтэл</p>
          </div>
          <div className="bg-white rounded-2xl p-4 border-l-4 border border-[#E5E5EA]/50" style={{ borderLeftColor: '#AF52DE' }}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold text-[#8E8E93] uppercase">Жолооч</span>
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-[#AF52DE]/10">
                <Users className="w-4 h-4 text-[#AF52DE]" />
              </div>
            </div>
            <div className="text-[20px] font-bold text-[#1C1C1E]">{data.drivers.length}</div>
            <p className="text-[11px] text-[#8E8E93] mt-1">идэвхтэй жолооч</p>
          </div>
        </div>
      )}

      {/* Chart - only if 2+ drivers */}
      {data && data.drivers.length >= 2 && (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
          <h3 className="text-[14px] font-bold text-[#1C1C1E] mb-4">Жолоочийн борлуулалтын харьцуулалт</h3>
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8E8E93' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8E8E93' }} tickFormatter={(v) => `₮${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any, name: string) => [fmt(value), PAYMENT_LABELS[name]?.label || name]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E5E5EA' }}
                />
                <Legend formatter={(v) => PAYMENT_LABELS[v]?.label || v} />
                {usedMethods.map((m) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={PAYMENT_LABELS[m]?.color || '#8E8E93'} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Per-driver cards */}
      {loading ? (
        <div className="bg-white rounded-2xl py-16 text-center"><RefreshCw className="w-6 h-6 text-[#8E8E93] mx-auto animate-spin" /></div>
      ) : data && data.drivers.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 py-16 text-center">
          <Users className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
          <p className="text-[16px] font-semibold text-[#1C1C1E]">Өгөгдөл байхгүй</p>
          <p className="text-[13px] text-[#8E8E93] mt-1">Сонгосон огнооны хязгаарт ачилт байхгүй байна</p>
        </div>
      ) : data?.drivers.map((d) => {
        const isOpen = expanded.has(d.driverId);
        return (
          <div key={d.driverId} className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
            {/* Driver header */}
            <button
              onClick={() => toggle(d.driverId)}
              className="w-full flex items-center gap-4 p-5 hover:bg-[#F9FAFB] transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-white font-bold text-[15px]" style={{ background: 'linear-gradient(135deg, #5856D6, #AF52DE)' }}>
                {d.driverName.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-[#1C1C1E]">{d.driverName}</p>
                <p className="text-[12px] text-[#8E8E93]">
                  {d.summary.totalLoads} ачилт · {d.summary.saleCount} борлуулалт · {d.summary.sold}/{d.summary.loaded} ш
                </p>
              </div>
              <div className="text-right">
                <p className="text-[20px] font-bold text-[#34C759]">{fmt(d.summary.totalRevenue)}</p>
              </div>
              {isOpen ? <ChevronDown className="w-5 h-5 text-[#8E8E93]" /> : <ChevronRight className="w-5 h-5 text-[#8E8E93]" />}
            </button>

            {/* Payment chips */}
            <div className="px-5 pb-4 flex flex-wrap gap-2">
              {Object.entries(d.summary.paymentBreakdown).map(([method, v]) => {
                if (v.amount <= 0) return null;
                const label = PAYMENT_LABELS[method];
                return (
                  <div key={method} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: `${label?.color || '#8E8E93'}15`, color: label?.color || '#8E8E93' }}>
                    {label?.icon ? <label.icon className="w-3 h-3" /> : null}
                    <span>{label?.label || method}</span>
                    <span className="opacity-70">·</span>
                    <span>{fmt(v.amount)}</span>
                  </div>
                );
              })}
            </div>

            {/* Loads + Sales list (expanded) */}
            {isOpen && (
              <div className="border-t border-[#E5E5EA]/60 bg-[#F9FAFB]">
                {d.loads.map((load: any) => (
                  <div key={load.loadId} className="border-b border-[#E5E5EA]/60 last:border-b-0">
                    {/* Load header row */}
                    <div className="flex items-center gap-4 px-5 py-3 bg-[#F2F4F7]/50">
                      <span className="font-mono font-bold text-[13px] text-[#007AFF]">#{load.loadNumber}</span>
                      <span className="text-[12px] text-[#1C1C1E]">{load.loadDate}</span>
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${STATUS_LABELS[load.status]?.color || '#8E8E93'}15`, color: STATUS_LABELS[load.status]?.color || '#8E8E93' }}>
                        {STATUS_LABELS[load.status]?.label || load.status}
                      </span>
                      <span className="text-[12px] text-[#8E8E93] ml-auto">{load.sold}/{load.loaded} ш · {load.salesCount} борлуулалт</span>
                      <span className="text-[14px] font-bold text-[#34C759]">{fmt(load.salesRevenue)}</span>
                    </div>

                    {/* Sales within this load */}
                    {(load.sales ?? []).length > 0 && (
                      <div className="divide-y divide-[#F2F2F7]">
                        {load.sales.map((sale: any) => {
                          const saleExpanded = expandedSales.has(sale.id);
                          const pmInfo = PAYMENT_LABELS[sale.paymentMethod] ?? { label: sale.paymentMethod, color: '#8E8E93' };
                          return (
                            <div key={sale.id}>
                              <div
                                className="flex items-center gap-3 px-5 pl-10 py-2.5 hover:bg-[#F9FAFB] cursor-pointer transition-colors text-[12px]"
                                onClick={() => toggleSale(sale.id)}
                              >
                                <span className="font-mono text-[#007AFF] font-semibold w-14">#{sale.saleNumber}</span>
                                <span className="text-[#1C1C1E] flex-1 truncate">{sale.customer?.storeName ?? '—'}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${pmInfo.color}15`, color: pmInfo.color }}>
                                  {pmInfo.label}
                                </span>
                                <span className="text-[13px] font-bold text-[#1C1C1E] w-24 text-right">{fmt(sale.totalAmount)}</span>
                                <span className="text-[10px] text-[#8E8E93] w-14 text-right">
                                  {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); printSaleReceipt(sale, d.driverName, load.loadNumber); }}
                                  className="px-2 py-1 rounded-lg text-[10px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 transition-colors"
                                  title="Баримт хэвлэх"
                                >
                                  🖨️
                                </button>
                                {saleExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#8E8E93]" /> : <ChevronRight className="w-3.5 h-3.5 text-[#8E8E93]" />}
                              </div>

                              {/* Sale items expanded */}
                              {saleExpanded && sale.items?.length > 0 && (
                                <div className="bg-white mx-5 ml-10 mb-2 rounded-lg border border-[#E8ECF0] overflow-hidden">
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="bg-[#F9FAFB] text-[#8E8E93] text-[10px] uppercase">
                                        <th className="px-3 py-2 text-left font-semibold">#</th>
                                        <th className="px-3 py-2 text-left font-semibold">Бараа</th>
                                        <th className="px-3 py-2 text-center font-semibold">Тоо</th>
                                        <th className="px-3 py-2 text-right font-semibold">Үнэ</th>
                                        <th className="px-3 py-2 text-right font-semibold">Нийт</th>
                                      </tr>
                                    </thead>
                                    <tbody>
                                      {sale.items.map((it: any, idx: number) => (
                                        <tr key={idx} className="border-t border-[#F2F2F7]">
                                          <td className="px-3 py-1.5 text-[#8E8E93]">{idx + 1}</td>
                                          <td className="px-3 py-1.5 text-[#1C1C1E] font-medium">{it.productName}</td>
                                          <td className="px-3 py-1.5 text-center">{it.quantity}</td>
                                          <td className="px-3 py-1.5 text-right">{fmt(it.unitPrice)}</td>
                                          <td className="px-3 py-1.5 text-right font-semibold">{fmt(it.lineTotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
