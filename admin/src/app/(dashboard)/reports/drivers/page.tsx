'use client';

import { useState, useEffect, useMemo, Fragment } from 'react';
import api from '@/lib/api';
import {
  Truck, Users, TrendingUp, Package, ChevronDown, ChevronRight,
  Banknote, Building2, CreditCard, Smartphone, Receipt as ReceiptIcon,
  Clock, Layers, RefreshCw, Printer,
} from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, DateField, SelectField, ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

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

const fmt = (n: number) => formatMnt(n);

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

  const driverOptions = useMemo(
    () => drivers.map((d: any) => ({ value: d.id, label: `${d.lastName} ${d.firstName}` })),
    [drivers],
  );

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Жолоочийн тайлан"
        subtitle="Ачилт болон борлуулалтын дэлгэрэнгүй тайлан"
        icon={Truck}
        actions={
          <ActionButton variant="ghost" onClick={fetchReport}>
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} /> Сэргээх
          </ActionButton>
        }
      />

      {/* Filters */}
      <FilterBar>
        <DateField label="Эхний огноо" value={from} onChange={setFrom} />
        <DateField label="Эцсийн огноо" value={to} onChange={setTo} />
        <SelectField label="Жолооч" value={driverId} onChange={setDriverId} options={driverOptions} placeholder="Бүх жолооч" />
      </FilterBar>

      {/* Stat cards */}
      {data && (
        <StatGrid cols={4}>
          <StatCard label="Нийт орлого" value={fmt(data.summary.totalSalesRevenue)} hint={`${data.summary.totalSaleCount} борлуулалт`} icon={TrendingUp} gradient="blue" index={0} />
          <StatCard label="Зарагдсан" value={`${data.summary.totalSoldQty} ш`} hint={`${data.summary.totalLoadedQty} ачсанаас`} icon={Package} gradient="green" index={1} />
          <StatCard label="Ачилт" value={data.summary.totalLoads} hint={`${data.summary.totalReturnedQty}/${data.summary.totalDamagedQty} буцаалт/гэмтэл`} icon={Truck} gradient="orange" index={2} />
          <StatCard label="Жолооч" value={data.drivers.length} hint="идэвхтэй жолооч" icon={Users} gradient="purple" index={3} />
        </StatGrid>
      )}

      {/* Chart - only if 2+ drivers */}
      {data && data.drivers.length >= 2 && (
        <SectionCard title="Жолоочийн борлуулалтын харьцуулалт">
          <div style={{ width: '100%', height: 320 }}>
            <ResponsiveContainer>
              <BarChart data={chartData} margin={{ top: 10, right: 20, bottom: 5, left: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F2F2F7" />
                <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#8C8FA3' }} />
                <YAxis tick={{ fontSize: 11, fill: '#8C8FA3' }} tickFormatter={(v) => `₮${(v / 1000).toFixed(0)}k`} />
                <Tooltip
                  formatter={(value: any, name: any) => [fmt(value), PAYMENT_LABELS[String(name)]?.label || String(name)]}
                  contentStyle={{ borderRadius: 12, border: '1px solid #E8ECF0' }}
                />
                <Legend formatter={(v) => PAYMENT_LABELS[v]?.label || v} />
                {usedMethods.map((m) => (
                  <Bar key={m} dataKey={m} stackId="a" fill={PAYMENT_LABELS[m]?.color || '#8C8FA3'} radius={[6, 6, 0, 0]} />
                ))}
              </BarChart>
            </ResponsiveContainer>
          </div>
        </SectionCard>
      )}

      {/* Per-driver cards */}
      {loading ? (
        <div className="bg-white rounded-2xl border border-[#E8ECF0]/70 shadow-sm py-16 text-center">
          <RefreshCw className="w-6 h-6 text-[#8C8FA3] mx-auto animate-spin" />
        </div>
      ) : data && data.drivers.length === 0 ? (
        <SectionCard noPadding>
          <EmptyState icon={Users} title="Өгөгдөл байхгүй" hint="Сонгосон огнооны хязгаарт ачилт байхгүй байна" />
        </SectionCard>
      ) : data?.drivers.map((d) => {
        const isOpen = expanded.has(d.driverId);
        return (
          <div key={d.driverId} className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden">
            {/* Driver header */}
            <button
              onClick={() => toggle(d.driverId)}
              className="w-full flex items-center gap-4 p-4 lg:p-5 hover:bg-[#F9FAFB] transition-colors text-left"
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-white font-bold text-[15px] shrink-0" style={{ background: 'linear-gradient(135deg, #5856D6, #AF52DE)' }}>
                {d.driverName.split(' ').map(n => n.charAt(0)).join('').slice(0, 2).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[16px] font-bold text-[#1A1D26] truncate">{d.driverName}</p>
                <p className="text-[12px] text-[#8C8FA3] mt-0.5">
                  {d.summary.totalLoads} ачилт · {d.summary.saleCount} борлуулалт · {d.summary.sold}/{d.summary.loaded} ш
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-[20px] font-bold text-[#34C759] tabular-nums">{fmt(d.summary.totalRevenue)}</p>
              </div>
              {isOpen ? <ChevronDown className="w-5 h-5 text-[#8C8FA3] shrink-0" /> : <ChevronRight className="w-5 h-5 text-[#8C8FA3] shrink-0" />}
            </button>

            {/* Payment chips */}
            <div className="px-4 lg:px-5 pb-4 flex flex-wrap gap-2">
              {Object.entries(d.summary.paymentBreakdown).map(([method, v]) => {
                if (v.amount <= 0) return null;
                const label = PAYMENT_LABELS[method];
                return (
                  <div key={method} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ backgroundColor: `${label?.color || '#8C8FA3'}15`, color: label?.color || '#8C8FA3' }}>
                    {label?.icon ? <label.icon className="w-3 h-3" /> : null}
                    <span>{label?.label || method}</span>
                    <span className="opacity-70">·</span>
                    <span className="tabular-nums">{fmt(v.amount)}</span>
                  </div>
                );
              })}
            </div>

            {/* Loads + Sales list (expanded) */}
            {isOpen && (
              <div className="border-t border-[#F0F2F5] bg-[#F9FAFB]">
                {d.loads.map((load: any) => (
                  <div key={load.loadId} className="border-b border-[#F0F2F5] last:border-b-0">
                    {/* Load header row */}
                    <div className="flex items-center flex-wrap gap-x-4 gap-y-1 px-4 lg:px-5 py-3 bg-[#F2F4F7]/60">
                      <span className="font-mono font-bold text-[13px] text-[#007AFF]">#{load.loadNumber}</span>
                      <span className="text-[12px] text-[#1A1D26]">{load.loadDate}</span>
                      <span className="inline-flex px-2 py-0.5 rounded-md text-[10px] font-bold" style={{ backgroundColor: `${STATUS_LABELS[load.status]?.color || '#8C8FA3'}15`, color: STATUS_LABELS[load.status]?.color || '#8C8FA3' }}>
                        {STATUS_LABELS[load.status]?.label || load.status}
                      </span>
                      <span className="text-[12px] text-[#8C8FA3] ml-auto">{load.sold}/{load.loaded} ш · {load.salesCount} борлуулалт</span>
                      <span className="text-[14px] font-bold text-[#34C759] tabular-nums">{fmt(load.salesRevenue)}</span>
                    </div>

                    {/* Sales within this load */}
                    {(load.sales ?? []).length > 0 && (
                      <div className="divide-y divide-[#F2F4F7]">
                        {load.sales.map((sale: any) => {
                          const saleExpanded = expandedSales.has(sale.id);
                          const pmInfo = PAYMENT_LABELS[sale.paymentMethod] ?? { label: sale.paymentMethod, color: '#8C8FA3' };
                          return (
                            <Fragment key={sale.id}>
                              <div
                                className="flex items-center gap-3 px-4 lg:px-5 pl-10 py-2.5 hover:bg-white cursor-pointer transition-colors text-[12px]"
                                onClick={() => toggleSale(sale.id)}
                              >
                                <span className="font-mono text-[#007AFF] font-semibold w-14 shrink-0">#{sale.saleNumber}</span>
                                <span className="text-[#1A1D26] flex-1 truncate">{sale.customer?.storeName ?? '—'}</span>
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0" style={{ backgroundColor: `${pmInfo.color}15`, color: pmInfo.color }}>
                                  {pmInfo.label}
                                </span>
                                <span className="text-[13px] font-bold text-[#1A1D26] w-24 text-right tabular-nums shrink-0">{fmt(sale.totalAmount)}</span>
                                <span className="text-[10px] text-[#8C8FA3] w-14 text-right shrink-0">
                                  {sale.createdAt ? new Date(sale.createdAt).toLocaleTimeString('mn-MN', { hour: '2-digit', minute: '2-digit' }) : ''}
                                </span>
                                <button
                                  onClick={(e) => { e.stopPropagation(); printSaleReceipt(sale, d.driverName, load.loadNumber); }}
                                  className="p-1.5 rounded-lg text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 transition-colors shrink-0"
                                  title="Баримт хэвлэх"
                                >
                                  <Printer className="w-3.5 h-3.5" />
                                </button>
                                {saleExpanded ? <ChevronDown className="w-3.5 h-3.5 text-[#8C8FA3] shrink-0" /> : <ChevronRight className="w-3.5 h-3.5 text-[#8C8FA3] shrink-0" />}
                              </div>

                              {/* Sale items expanded */}
                              {saleExpanded && sale.items?.length > 0 && (
                                <div className="bg-white mx-4 lg:mx-5 ml-10 mb-2 rounded-xl border border-[#E8ECF0]/70 overflow-hidden">
                                  <table className="w-full text-[11px]">
                                    <thead>
                                      <tr className="bg-[#F9FAFB] text-[#8C8FA3] text-[10px] uppercase tracking-wide">
                                        <th className="px-3 py-2 text-left font-semibold">#</th>
                                        <th className="px-3 py-2 text-left font-semibold">Бараа</th>
                                        <th className="px-3 py-2 text-center font-semibold">Тоо</th>
                                        <th className="px-3 py-2 text-right font-semibold">Үнэ</th>
                                        <th className="px-3 py-2 text-right font-semibold">Нийт</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-[#F2F4F7]">
                                      {sale.items.map((it: any, idx: number) => (
                                        <tr key={idx}>
                                          <td className="px-3 py-1.5 text-[#8C8FA3]">{idx + 1}</td>
                                          <td className="px-3 py-1.5 text-[#1A1D26] font-medium">{it.productName}</td>
                                          <td className="px-3 py-1.5 text-center tabular-nums">{it.quantity}</td>
                                          <td className="px-3 py-1.5 text-right tabular-nums">{fmt(it.unitPrice)}</td>
                                          <td className="px-3 py-1.5 text-right font-semibold tabular-nums">{fmt(it.lineTotal)}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                              )}
                            </Fragment>
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
