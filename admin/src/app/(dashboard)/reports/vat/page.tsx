'use client';

import { useEffect, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { PercentCircle } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { PrintableReport } from '@/components/shared/printable-report';
import { FilterBar, DateField, ActionButton } from '@/components/shared/filter-bar';
import { formatMnt } from '@/components/shared/money';
import { downloadFile } from '@/lib/download';
import { reportsApi, type VatReport } from '@/lib/reports-api';

export default function VatReportPage() {
  const [f, setF] = useState({ from: format(startOfMonth(new Date()), 'yyyy-MM-dd'), to: format(new Date(), 'yyyy-MM-dd') });
  const [data, setData] = useState<VatReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  async function run() {
    setLoading(true);
    try {
      setData(await reportsApi.vat(f.from, f.to));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void run();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function doExport() {
    setExporting(true);
    try {
      await downloadFile(`/api/reports/vat/export?from=${f.from}&to=${f.to}`, `noat-${f.from}_${f.to}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  const rows = data
    ? [
        { label: 'Нийт борлуулалт', value: data.totalSales },
        { label: 'Захиалгын борлуулалт', value: data.orderSales },
        { label: 'Машины борлуулалт', value: data.truckSales },
        { label: 'НӨАТ-гүй суурь', value: data.taxableBase },
        { label: `Гарсан НӨАТ (${data.vatRate}%)`, value: data.outputVat, strong: true },
        { label: 'Захиалгад бүртгэсэн татвар', value: data.recordedOrderTax },
      ]
    : [];

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="no-print space-y-5">
        <PageHeader title="НӨАТ тайлан" subtitle="Гарсан НӨАТ, татварын суурь" icon={PercentCircle} iconColor="#34C759" />
        <FilterBar>
          <DateField label="Эхлэх" value={f.from} onChange={(v) => setF((s) => ({ ...s, from: v }))} />
          <DateField label="Дуусах" value={f.to} onChange={(v) => setF((s) => ({ ...s, to: v }))} />
          <ActionButton onClick={run} disabled={loading}>{loading ? 'Ачаалж…' : 'Тайлан гаргах'}</ActionButton>
        </FilterBar>
      </div>

      {data && (
        <>
          <div className="no-print">
            <StatGrid cols={4}>
              <StatCard label="Нийт борлуулалт" value={formatMnt(data.totalSales)} gradient="blue" index={0} />
              <StatCard label={`Гарсан НӨАТ (${data.vatRate}%)`} value={formatMnt(data.outputVat)} gradient="green" index={1} />
              <StatCard label="НӨАТ-гүй суурь" value={formatMnt(data.taxableBase)} gradient="orange" index={2} />
              <StatCard label="Гүйлгээ" value={data.salesCount} gradient="purple" index={3} />
            </StatGrid>
          </div>

          <PrintableReport title="НӨАТ-ын тайлан" rangeLabel={`${data.from} — ${data.to}`}
            metaLines={[`НӨАТ-ын хувь: ${data.vatRate}% (үнэд багтсан)`]} onExport={doExport} exporting={exporting}>
            <table className="w-full text-[13px]">
              <thead>
                <tr className="border-b border-[#F0F2F5] text-left text-[11px] uppercase tracking-wide text-[#8C8FA3]">
                  <th className="px-2 py-2 font-semibold">Үзүүлэлт</th>
                  <th className="px-2 py-2 font-semibold text-right">Дүн</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7]">
                {rows.map((r) => (
                  <tr key={r.label} className={r.strong ? 'font-bold bg-[#F9FAFB]' : ''}>
                    <td className="px-2 py-2.5">{r.label}</td>
                    <td className="px-2 py-2.5 text-right tabular-nums">{formatMnt(r.value, { symbol: false })}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </PrintableReport>
        </>
      )}
    </div>
  );
}
