'use client';

import { useEffect, useState } from 'react';
import { format, startOfMonth } from 'date-fns';
import { BookOpen } from 'lucide-react';
import api from '@/lib/api';
import { PageHeader } from '@/components/shared/page-header';
import { PrintableReport } from '@/components/shared/printable-report';
import { FilterBar, DateField, SelectField, ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';
import { downloadFile } from '@/lib/download';
import { reportsApi, PAYMENT_METHOD_LABEL, type CustomerLedger } from '@/lib/reports-api';

interface Opt { value: string; label: string }

export default function LedgerReportPage() {
  const [customers, setCustomers] = useState<Opt[]>([]);
  const [companyName, setCompanyName] = useState<string>('ЗАЙРМАГ ТҮГЭЭЛТ');
  const [f, setF] = useState({
    customerId: '',
    from: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    to: format(new Date(), 'yyyy-MM-dd'),
  });
  const [ledger, setLedger] = useState<CustomerLedger | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    api.get('/api/customers', { params: { limit: 1000 } }).then((r) => {
      setCustomers((r.data?.data ?? []).map((c: any) => ({ value: c.id, label: c.storeName })));
    }).catch(() => {});
    api.get('/api/receipt-settings').then((r) => {
      if (r.data?.companyName) setCompanyName(r.data.companyName);
    }).catch(() => {});
  }, []);

  async function run() {
    if (!f.customerId) return;
    setLoading(true);
    try {
      setLedger(await reportsApi.customerLedger(f.customerId, f.from, f.to));
    } finally {
      setLoading(false);
    }
  }

  async function doExport() {
    if (!f.customerId) return;
    setExporting(true);
    try {
      await downloadFile(`/api/receivables/${f.customerId}/export?dateFrom=${f.from}&dateTo=${f.to}`, `avlaga-${f.from}_${f.to}.xlsx`);
    } finally {
      setExporting(false);
    }
  }

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="no-print space-y-5">
        <PageHeader title="Авлагын дэвтэр" subtitle="Харилцагчийн эхний/эцсийн үлдэгдэл, дебет/кредит" icon={BookOpen} iconColor="#F472B6" />
        <FilterBar>
          <SelectField label="Харилцагч" value={f.customerId} onChange={(v) => setF((s) => ({ ...s, customerId: v }))} options={customers} placeholder="Сонгох..." />
          <DateField label="Эхлэх" value={f.from} onChange={(v) => setF((s) => ({ ...s, from: v }))} />
          <DateField label="Дуусах" value={f.to} onChange={(v) => setF((s) => ({ ...s, to: v }))} />
          <ActionButton onClick={run} disabled={loading || !f.customerId}>{loading ? 'Ачаалж…' : 'Тайлан гаргах'}</ActionButton>
        </FilterBar>
      </div>

      {!f.customerId ? (
        <div className="bg-white rounded-2xl border border-[#E8ECF0]/70 shadow-sm">
          <EmptyState icon={BookOpen} title="Харилцагч сонгоно уу" hint="Авлагын дэвтэр харахын тулд харилцагч болон хугацаа сонгоно уу" />
        </div>
      ) : ledger ? (
        <PrintableReport
          title="Авлага өглөгийн тайлан"
          companyName={companyName}
          rangeLabel={`${f.from} — ${f.to}`}
          metaLines={[`Харилцагч: ${ledger.customer?.storeName ?? ''}${ledger.customer?.phone ? ` · ${ledger.customer.phone}` : ''}`]}
          onExport={doExport}
          exporting={exporting}
        >
          <table className="w-full text-[13px]">
            <thead>
              <tr className="border-b border-[#F0F2F5] text-left text-[11px] uppercase tracking-wide text-[#8C8FA3]">
                <th className="px-2 py-2 font-semibold">Огноо</th>
                <th className="px-2 py-2 font-semibold">Гүйлгээ</th>
                <th className="px-2 py-2 font-semibold">Төлбөр</th>
                <th className="px-2 py-2 font-semibold text-right">Дебет</th>
                <th className="px-2 py-2 font-semibold text-right">Кредит</th>
                <th className="px-2 py-2 font-semibold text-right">Үлдэгдэл</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2F4F7]">
              <tr className="bg-[#F9FAFB] font-medium">
                <td className="px-2 py-2" colSpan={3}>Эхний үлдэгдэл</td>
                <td className="px-2 py-2 text-right tabular-nums">{ledger.openingBalance > 0 ? formatMnt(ledger.openingBalance, { symbol: false }) : ''}</td>
                <td className="px-2 py-2 text-right tabular-nums">{ledger.openingBalance < 0 ? formatMnt(-ledger.openingBalance, { symbol: false }) : ''}</td>
                <td className="px-2 py-2 text-right tabular-nums">{formatMnt(ledger.openingBalance, { symbol: false })}</td>
              </tr>
              {ledger.entries.map((e) => (
                <tr key={e.id}>
                  <td className="px-2 py-2 whitespace-nowrap text-[#8C8FA3]">{format(new Date(e.date), 'yyyy/MM/dd HH:mm')}</td>
                  <td className="px-2 py-2">{e.description}</td>
                  <td className="px-2 py-2 text-[#8C8FA3]">{e.paymentMethod ? (PAYMENT_METHOD_LABEL[e.paymentMethod] ?? e.paymentMethod) : '—'}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{e.debit > 0 ? formatMnt(e.debit, { symbol: false }) : ''}</td>
                  <td className="px-2 py-2 text-right tabular-nums">{e.credit > 0 ? formatMnt(e.credit, { symbol: false }) : ''}</td>
                  <td className="px-2 py-2 text-right font-medium tabular-nums">{formatMnt(e.balance, { symbol: false })}</td>
                </tr>
              ))}
              {ledger.entries.length === 0 && (
                <tr><td colSpan={6} className="px-2 py-8 text-center text-[#8C8FA3]">Энэ хугацаанд гүйлгээ алга</td></tr>
              )}
            </tbody>
            <tfoot>
              <tr className="border-t-2 border-[#E8ECF0] font-bold">
                <td className="px-2 py-2.5" colSpan={3}>НИЙТ ДҮН</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatMnt(ledger.totalDebit, { symbol: false })}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatMnt(ledger.totalCredit, { symbol: false })}</td>
                <td className="px-2 py-2.5 text-right tabular-nums">{formatMnt(ledger.closingBalance, { symbol: false })}</td>
              </tr>
              <tr className="text-[#8C8FA3] font-medium">
                <td className="px-2 py-1" colSpan={5}>Эцсийн үлдэгдэл ({ledger.closingBalance >= 0 ? 'авлага' : 'урьдчилгаа'})</td>
                <td className="px-2 py-1 text-right tabular-nums">{formatMnt(ledger.closingBalance)}</td>
              </tr>
            </tfoot>
          </table>
        </PrintableReport>
      ) : (
        <div className="py-16 text-center text-[13px] text-[#8C8FA3]">Ачаалж байна…</div>
      )}
    </div>
  );
}
