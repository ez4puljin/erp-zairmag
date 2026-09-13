'use client';

import { useEffect, useMemo, useState, Fragment } from 'react';
import { useRouter } from 'next/navigation';
import { format, subDays } from 'date-fns';
import { ReceiptText, ChevronDown, ChevronRight, Package, Pencil, Trash2 } from 'lucide-react';
import api from '@/lib/api';
import { useAuth } from '@/hooks/use-auth';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { PrintableReport } from '@/components/shared/printable-report';
import { FilterBar, DateField, SelectField, ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';
import { downloadFile } from '@/lib/download';
import { reportsApi, PAYMENT_METHOD_LABEL, PAYMENT_METHODS, type SalesRegister, type SalesRegisterRow } from '@/lib/reports-api';

interface Opt { value: string; label: string }

export default function SalesRegisterPage() {
  const router = useRouter();
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const [customers, setCustomers] = useState<Opt[]>([]);
  const [products, setProducts] = useState<Opt[]>([]);
  const [f, setF] = useState({
    from: format(subDays(new Date(), 30), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
    customerId: '',
    productId: '',
    paymentMethod: '',
    channel: 'ALL' as 'ALL' | 'ORDER' | 'TRUCK',
  });
  const [report, setReport] = useState<SalesRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      api.get('/api/customers', { params: { limit: 1000 } }).then((r) => r.data?.data ?? []).catch(() => []),
      api.get('/api/products', { params: { limit: 1000 } }).then((r) => r.data?.data ?? []).catch(() => []),
    ]).then(([cs, ps]) => {
      setCustomers(cs.map((c: any) => ({ value: c.id, label: c.storeName })));
      setProducts(ps.map((p: any) => ({ value: p.id, label: p.name })));
    });
  }, []);

  async function run() {
    setLoading(true);
    try {
      const r = await reportsApi.salesRegister({
        from: f.from,
        to: f.to,
        customerId: f.customerId || undefined,
        productId: f.productId || undefined,
        paymentMethod: f.paymentMethod || undefined,
        channel: f.channel,
      });
      setReport(r);
      setExpanded(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const rangeLabel = useMemo(() => (report ? `${report.from} — ${report.to}` : ''), [report]);

  const [deletingId, setDeletingId] = useState<string | null>(null);

  /**
   * Борлуулалт устгах (цуцлах). Ачилт хаагдсан бол сервер баталгаажуулалт
   * шаардана — тэр үед агуулах руу буцаахыг асууж дахин илгээнэ.
   */
  async function deleteSale(r: SalesRegisterRow, allowWarehouseReturn = false) {
    if (!allowWarehouseReturn) {
      if (!confirm(`${r.number} борлуулалтыг устгах уу?
Бараа буцаагдаж, харилцагчийн өр, төлбөр буцаана.`)) return;
    }
    setDeletingId(r.id);
    try {
      await api.delete(`/api/truck-sales/${r.id}/void`, {
        params: allowWarehouseReturn ? { allowWarehouseReturn: 'true' } : {},
      });
      await run();
    } catch (err: any) {
      const data = err.response?.data;
      if (data?.code === 'WAREHOUSE_RETURN_CONFIRM' && !allowWarehouseReturn) {
        setDeletingId(null);
        if (confirm(`${data.message}

Агуулах руу үлдэгдэл буцаахад итгэлтэй байна уу?`)) {
          await deleteSale(r, true);
        }
        return;
      }
      const msg = Array.isArray(data?.message) ? data.message.join(', ') : data?.message || err.message;
      alert('Борлуулалт устгахад алдаа гарлаа: ' + msg);
    } finally {
      setDeletingId(null);
    }
  }

  async function doExport() {
    setExporting(true);
    try {
      const sp = new URLSearchParams({ from: f.from, to: f.to, channel: f.channel });
      if (f.customerId) sp.set('customerId', f.customerId);
      if (f.productId) sp.set('productId', f.productId);
      if (f.paymentMethod) sp.set('paymentMethod', f.paymentMethod);
      await downloadFile(`/api/reports/sales-register/export?${sp.toString()}`, `borluulalt-${f.from}_${f.to}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="no-print space-y-5">
        <PageHeader title="Борлуулалтын бүртгэл" subtitle="Гүйлгээ бүрээр, харилцагч/бараа/төлбөрөөр" icon={ReceiptText} />

        <FilterBar>
          <DateField label="Эхлэх" value={f.from} onChange={(v) => setF((s) => ({ ...s, from: v }))} />
          <DateField label="Дуусах" value={f.to} onChange={(v) => setF((s) => ({ ...s, to: v }))} />
          {/* "Бүгд" нь placeholder мөр болж ордог тул оролтод бичвэр болж суухгүй.
              API нь заавал ALL/ORDER/TRUCK хүлээдэг тул хоосныг ALL руу хөрвүүлнэ. */}
          <SelectField label="Суваг" value={f.channel === 'ALL' ? '' : f.channel}
            onChange={(v) => setF((s) => ({ ...s, channel: (v || 'ALL') as any }))}
            options={[{ value: 'ORDER', label: 'Захиалга' }, { value: 'TRUCK', label: 'Машин' }]} placeholder="Бүгд" />
          <SelectField label="Харилцагч" value={f.customerId} onChange={(v) => setF((s) => ({ ...s, customerId: v }))} options={customers} placeholder="Бүгд" />
          <SelectField label="Бүтээгдэхүүн" value={f.productId} onChange={(v) => setF((s) => ({ ...s, productId: v }))} options={products} placeholder="Бүгд" />
          <SelectField label="Төлбөр" value={f.paymentMethod} onChange={(v) => setF((s) => ({ ...s, paymentMethod: v }))}
            options={PAYMENT_METHODS.map((m) => ({ value: m, label: PAYMENT_METHOD_LABEL[m] }))} placeholder="Бүгд" />
          <ActionButton onClick={run} disabled={loading}>{loading ? 'Ачаалж…' : 'Тайлан гаргах'}</ActionButton>
        </FilterBar>
      </div>

      {report && (
        <>
          <div className="no-print">
            <StatGrid cols={4}>
              <StatCard label="Нийт гүйлгээ" value={report.totals.count} gradient="blue" index={0} />
              <StatCard label="Нийт орлого" value={formatMnt(report.totals.revenue)} gradient="green" index={1} />
              <StatCard label="Тоо ширхэг" value={`${report.totals.itemCount} ш`} gradient="orange" index={2} />
              <StatCard label="Дундаж" value={formatMnt(report.totals.count ? report.totals.revenue / report.totals.count : 0)} gradient="purple" index={3} />
            </StatGrid>
          </div>

          <div className="no-print grid grid-cols-1 lg:grid-cols-2 gap-4">
            <SectionCard title="Төлбөрийн хэлбэрээр">
              <div className="space-y-2">
                {Object.entries(report.totals.byMethod).map(([m, v]) => (
                  <div key={m} className="flex items-center justify-between text-[13px]">
                    <span className="text-[#4A4D5C]">{PAYMENT_METHOD_LABEL[m] ?? m} <span className="text-[#8C8FA3]">({v.count})</span></span>
                    <span className="font-semibold text-[#1A1D26] tabular-nums">{formatMnt(v.amount)}</span>
                  </div>
                ))}
              </div>
            </SectionCard>
            <SectionCard title="Бүтээгдэхүүнээр (шилдэг)">
              <div className="space-y-2">
                {report.byProduct.slice(0, 6).map((p) => (
                  <div key={p.productId} className="flex items-center justify-between text-[13px]">
                    <span className="text-[#4A4D5C] truncate">{p.name} <span className="text-[#8C8FA3]">· {p.qty}ш</span></span>
                    <span className="font-semibold text-[#1A1D26] tabular-nums">{formatMnt(p.revenue)}</span>
                  </div>
                ))}
                {report.byProduct.length === 0 && <p className="text-[13px] text-[#8C8FA3]">—</p>}
              </div>
            </SectionCard>
          </div>

          <PrintableReport title="Борлуулалтын бүртгэл" rangeLabel={rangeLabel}
            metaLines={[`Нийт гүйлгээ: ${report.totals.count}${report.truncated ? ' (эхний 2000)' : ''}  ·  Нийт орлого: ${formatMnt(report.totals.revenue)}`]}
            onExport={doExport} exporting={exporting}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#F0F2F5] text-left text-[11px] uppercase tracking-wide text-[#8C8FA3]">
                  <th className="px-2 py-2 font-semibold">Огноо</th>
                  <th className="px-2 py-2 font-semibold">Дугаар</th>
                  <th className="px-2 py-2 font-semibold">Харилцагч</th>
                  <th className="px-2 py-2 font-semibold">Худалдагч</th>
                  <th className="px-2 py-2 font-semibold">Төлбөр</th>
                  <th className="px-2 py-2 font-semibold text-right">Дүн</th>
                  {isAdmin && <th className="no-print px-2 py-2 font-semibold text-right">Үйлдэл</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7]">
                {report.items.map((r) => (
                  <Fragment key={`${r.channel}-${r.id}`}>
                    <tr className="cursor-pointer hover:bg-[#F7F9FC]" onClick={() => setExpanded(expanded === r.id ? null : r.id)}>
                      <td className="px-2 py-2 whitespace-nowrap text-[#8C8FA3]">
                        <span className="inline-flex items-center gap-1">
                          {expanded === r.id ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                          {format(new Date(r.date), 'MM/dd HH:mm')}
                        </span>
                      </td>
                      <td className="px-2 py-2">
                        {r.number}
                        <span className={`ml-1.5 text-[10px] px-1.5 py-0.5 rounded-full ${r.channel === 'ORDER' ? 'bg-[#FF9500]/12 text-[#FF9500]' : 'bg-[#5856D6]/12 text-[#5856D6]'}`}>
                          {r.channel === 'ORDER' ? 'Захиалга' : 'Машин'}
                        </span>
                      </td>
                      <td className="px-2 py-2 truncate max-w-[180px]">{r.customerName}</td>
                      <td className="px-2 py-2 text-[#8C8FA3]">{r.sellerName}</td>
                      <td className="px-2 py-2 text-[#8C8FA3]">{r.paymentMethod ? (PAYMENT_METHOD_LABEL[r.paymentMethod] ?? r.paymentMethod) : '—'}</td>
                      <td className="px-2 py-2 text-right font-semibold tabular-nums">{formatMnt(r.total, { symbol: false })}</td>
                      {isAdmin && (
                        <td className="no-print px-2 py-2 text-right">
                          {/* Засвар нь ачилтын хуудсан дээр хийгддэг тул тэр борлуулалтыг
                              шууд нээлттэйгээр очно. Захиалгын сувагт засвар байхгүй. */}
                          {r.channel === 'TRUCK' && r.truckLoadId && (
                            <span className="inline-flex items-center gap-1.5">
                              <button
                                onClick={(e) => { e.stopPropagation(); router.push(`/truck-loads/${r.truckLoadId}?sale=${r.id}`); }}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#007AFF] bg-[#007AFF]/10 hover:bg-[#007AFF]/20 transition-colors"
                              >
                                <Pencil className="w-3 h-3" /> Засах
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); void deleteSale(r); }}
                                disabled={deletingId === r.id}
                                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/20 transition-colors disabled:opacity-50"
                              >
                                <Trash2 className="w-3 h-3" /> {deletingId === r.id ? '...' : 'Устгах'}
                              </button>
                            </span>
                          )}
                        </td>
                      )}
                    </tr>
                    {expanded === r.id && (
                      <tr className="bg-[#F9FAFB]">
                        <td colSpan={isAdmin ? 7 : 6} className="px-6 py-2">
                          <div className="space-y-1">
                            {r.lines.map((l, i) => (
                              <div key={i} className="flex items-center justify-between text-[12px] text-[#4A4D5C]">
                                <span className="flex items-center gap-1.5"><Package className="w-3 h-3 text-[#8C8FA3]" /> {l.productName} <span className="text-[#8C8FA3]">× {l.quantity} @ {formatMnt(l.unitPrice, { symbol: false })}</span></span>
                                <span className="font-medium tabular-nums">{formatMnt(l.lineTotal, { symbol: false })}</span>
                              </div>
                            ))}
                          </div>
                        </td>
                      </tr>
                    )}
                  </Fragment>
                ))}
                {report.items.length === 0 && (
                  <tr><td colSpan={isAdmin ? 7 : 6}><EmptyState icon={ReceiptText} title="Борлуулалт олдсонгүй" hint="Хугацаа эсвэл шүүлтээ өөрчилнө үү" /></td></tr>
                )}
              </tbody>
              {report.items.length > 0 && (
                <tfoot>
                  <tr className="border-t-2 border-[#E8ECF0] font-bold">
                    <td className="px-2 py-2.5" colSpan={5}>НИЙТ</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatMnt(report.totals.revenue, { symbol: false })}</td>
                    {isAdmin && <td className="no-print" />}
                  </tr>
                </tfoot>
              )}
            </table>
          </PrintableReport>
        </>
      )}
    </div>
  );
}
