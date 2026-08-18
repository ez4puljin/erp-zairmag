'use client';

import { useState, useEffect, useRef, Fragment } from 'react';
import api from '@/lib/api';
import { Search, Printer, ChevronDown, ChevronRight, Wallet } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, DateField, SelectField, ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';

const fmt = (n: number) => n.toLocaleString('mn-MN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

interface Tx {
  id: string;
  date: string;
  kind: 'PAYMENT' | 'PAYOUT' | 'SUPPLIER' | 'EXPENSE';
  description: string;
  inflow: number;
  outflow: number;
  running: number;
}

interface AccountRow {
  account: { id: string; bankName: string; accountNumber: string; holderName: string };
  openingBalance: number;
  inflow: { count: number; amount: number };
  outflow: { count: number; amount: number };
  closingBalance: number;
  transactions: Tx[];
}

interface Report {
  accounts: AccountRow[];
  totals: { opening: number; inflow: number; outflow: number; closing: number };
}

export default function BankAccountReportPage() {
  const today = new Date();
  const firstDay = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];

  const [dateFrom, setDateFrom] = useState(firstDay);
  const [dateTo, setDateTo] = useState(todayStr);
  const [accountId, setAccountId] = useState('');
  const [accounts, setAccounts] = useState<any[]>([]);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set());
  const printRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    api.get('/api/bank-accounts')
      .then((r) => setAccounts(r.data?.data || r.data || []))
      .catch((err) => console.error('Данс ачаалахад алдаа', err));
  }, []);

  useEffect(() => {
    void handleSearch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleSearch() {
    if (!dateFrom || !dateTo) return;
    setLoading(true);
    setExpandedRows(new Set());
    try {
      const res = await api.get('/api/bank-accounts/report', {
        params: { from: dateFrom, to: dateTo, ...(accountId ? { accountId } : {}) },
      });
      setReport(res.data);
    } catch (err: any) {
      alert('Алдаа: ' + (err.response?.data?.message || err.message));
    }
    setLoading(false);
  }

  function toggleExpand(id: string) {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function handlePrint() {
    if (!printRef.current) return;
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`<html><head><title>Дансны тайлан</title>
      <style>
        body { font-family: 'Segoe UI', Arial, sans-serif; padding: 20px; color: #1C1C1E; font-size: 11px; }
        h2 { text-align: center; margin-bottom: 4px; font-size: 16px; }
        table { width: 100%; border-collapse: collapse; margin-bottom: 16px; }
        th, td { border: 1px solid #999; padding: 3px 6px; }
        th { background: #eee; font-weight: 600; font-size: 10px; }
        td { font-size: 10px; }
        @media print { body { padding: 10px; } }
      </style></head><body>`);
    win.document.write(printRef.current.innerHTML);
    win.document.write('</body></html>');
    win.document.close();
    win.print();
  }

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Дансны тайлан"
        subtitle="Эхний/эцсийн үлдэгдэл, орлого/зарлага"
        icon={Wallet}
        actions={
          report ? (
            <ActionButton variant="ghost" onClick={handlePrint}>
              <Printer className="w-4 h-4" /> Хэвлэх
            </ActionButton>
          ) : undefined
        }
      />

      <FilterBar>
        <DateField label="Эхний огноо *" value={dateFrom} onChange={setDateFrom} />
        <DateField label="Эцсийн огноо *" value={dateTo} onChange={setDateTo} />
        <SelectField
          label="Данс"
          value={accountId}
          onChange={setAccountId}
          options={accounts.map((a: any) => ({
            value: a.id,
            label: `${a.bankName} - ${a.accountNumber}`,
          }))}
          placeholder="Бүгд (Бүх данс)"
        />
        <ActionButton onClick={handleSearch} disabled={loading}>
          <Search className="w-4 h-4" />
          {loading ? 'Хайж байна...' : 'Тайлан харах'}
        </ActionButton>
      </FilterBar>

      {report && (
        <div ref={printRef}>
          <div className="hidden print:block text-center mb-4">
            <h2 className="text-[18px] font-bold">Дансны тайлан</h2>
            <p className="text-[13px] text-[#8C8FA3]">{dateFrom} ~ {dateTo}</p>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-[12px]">
                <thead>
                  <tr className="bg-[#F9FAFB] text-[#8C8FA3] text-[11px] uppercase tracking-wide">
                    <th className="px-2 py-2 text-left font-semibold w-8"></th>
                    <th className="px-2 py-2 text-left font-semibold">Данс</th>
                    <th className="px-2 py-2 text-left font-semibold">Эзэмшигч</th>
                    <th className="px-2 py-2 text-right font-semibold border-l border-[#E8ECF0]">Эхний үлдэгдэл</th>
                    <th className="px-2 py-2 text-right font-semibold border-l border-[#E8ECF0]">Орлого</th>
                    <th className="px-2 py-2 text-right font-semibold border-l border-[#E8ECF0]">Зарлага</th>
                    <th className="px-2 py-2 text-right font-semibold border-l border-[#E8ECF0]">Эцсийн үлдэгдэл</th>
                  </tr>
                </thead>
                <tbody>
                  {report.accounts.map((item) => {
                    const isExpanded = expandedRows.has(item.account.id);
                    const hasTx = item.transactions.length > 0;
                    return (
                      <Fragment key={item.account.id}>
                        <tr
                          className={`border-b border-[#F2F4F7] hover:bg-[#F7F9FC] cursor-pointer transition-colors ${isExpanded ? 'bg-[#007AFF]/5' : ''}`}
                          onClick={() => hasTx && toggleExpand(item.account.id)}
                        >
                          <td className="px-2 py-2 text-center">
                            {hasTx && (isExpanded
                              ? <ChevronDown className="w-3.5 h-3.5 text-[#007AFF] inline" />
                              : <ChevronRight className="w-3.5 h-3.5 text-[#8C8FA3] inline" />)}
                          </td>
                          <td className="px-2 py-2 font-medium text-[#1A1D26]">
                            {item.account.bankName}
                            <span className="ml-1.5 font-mono text-[11px] text-[#007AFF]">{item.account.accountNumber}</span>
                          </td>
                          <td className="px-2 py-2 text-[#8C8FA3]">{item.account.holderName}</td>
                          <td className="px-2 py-2 text-right border-l border-[#F0F2F5] font-semibold tabular-nums">{fmt(item.openingBalance)}</td>
                          <td className="px-2 py-2 text-right border-l border-[#F0F2F5] font-semibold text-[#34C759] tabular-nums">{fmt(item.inflow.amount)}</td>
                          <td className="px-2 py-2 text-right border-l border-[#F0F2F5] font-semibold text-[#FF3B30] tabular-nums">{fmt(item.outflow.amount)}</td>
                          <td className={`px-2 py-2 text-right border-l border-[#F0F2F5] font-bold tabular-nums ${item.closingBalance < 0 ? 'text-[#FF3B30]' : 'text-[#1A1D26]'}`}>
                            {fmt(item.closingBalance)}
                          </td>
                        </tr>

                        {isExpanded && item.transactions.map((tx) => (
                          <tr key={tx.id} className="border-b border-[#F2F4F7] bg-[#F9FAFB]">
                            <td className="px-2 py-1.5"></td>
                            <td className="px-2 py-1.5 text-[11px] text-[#8C8FA3] whitespace-nowrap">
                              {new Date(tx.date).toLocaleDateString('mn-MN')}
                            </td>
                            <td className="px-2 py-1.5 text-[11px] text-[#4A4D5C] italic">{tx.description}</td>
                            <td className="px-2 py-1.5 border-l border-[#F0F2F5]"></td>
                            <td className="px-2 py-1.5 text-right border-l border-[#F0F2F5] text-[11px] text-[#34C759] tabular-nums">
                              {tx.inflow > 0 ? fmt(tx.inflow) : ''}
                            </td>
                            <td className="px-2 py-1.5 text-right border-l border-[#F0F2F5] text-[11px] text-[#FF3B30] tabular-nums">
                              {tx.outflow > 0 ? fmt(tx.outflow) : ''}
                            </td>
                            <td className="px-2 py-1.5 text-right border-l border-[#F0F2F5] text-[11px] font-semibold tabular-nums">
                              {fmt(tx.running)}
                            </td>
                          </tr>
                        ))}
                      </Fragment>
                    );
                  })}
                  {report.accounts.length === 0 && (
                    <tr>
                      <td colSpan={7}>
                        <EmptyState icon={Wallet} title="Данс олдсонгүй" hint="Шүүлтээ өөрчилнө үү" />
                      </td>
                    </tr>
                  )}
                </tbody>
                {report.accounts.length > 0 && (
                  <tfoot>
                    <tr className="bg-[#F9FAFB] border-t-2 border-[#E8ECF0] font-bold text-[12px]">
                      <td className="px-2 py-2.5 text-right" colSpan={3}>Нийт дүн</td>
                      <td className="px-2 py-2.5 text-right border-l border-[#E8ECF0] tabular-nums">{fmt(report.totals.opening)}</td>
                      <td className="px-2 py-2.5 text-right border-l border-[#E8ECF0] text-[#34C759] tabular-nums">{fmt(report.totals.inflow)}</td>
                      <td className="px-2 py-2.5 text-right border-l border-[#E8ECF0] text-[#FF3B30] tabular-nums">{fmt(report.totals.outflow)}</td>
                      <td className={`px-2 py-2.5 text-right border-l border-[#E8ECF0] tabular-nums ${report.totals.closing < 0 ? 'text-[#FF3B30]' : ''}`}>
                        {fmt(report.totals.closing)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>
          </div>

          <div className="hidden print:block mt-8">
            <div className="flex justify-between text-[12px]">
              <p>Тайлан гаргасан: ..................................../ _____________ /</p>
              <p>Хянасан нягтлан бодогч: ..................................../ _____________ /</p>
            </div>
          </div>

          <div className="mt-6 bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 p-5 print:hidden">
            <div className="grid grid-cols-2 gap-8 text-[13px] text-[#8C8FA3]">
              <p>Тайлан гаргасан: ..................................../ _____________ /</p>
              <p>Хянасан нягтлан бодогч: ..................................../ _____________ /</p>
            </div>
          </div>
        </div>
      )}

      {!report && !loading && (
        <SectionCard noPadding>
          <EmptyState icon={Wallet} title="Дансны тайлан" hint='Огноо сонгоод "Тайлан харах" товч дарна уу' />
        </SectionCard>
      )}
    </div>
  );
}
