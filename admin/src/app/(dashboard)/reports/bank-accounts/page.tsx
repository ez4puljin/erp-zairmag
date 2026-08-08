'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Wallet, TrendingUp, TrendingDown, DollarSign, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, DateField, ActionButton } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

interface ReportItem {
  account: {
    id: string;
    bankName: string;
    accountNumber: string;
    holderName: string;
    currency: string;
    currentBalance: number;
  };
  inflow: { count: number; amount: number };
  outflow: { count: number; amount: number };
  net: number;
}

interface Report {
  accounts: ReportItem[];
  grandTotal: { inflow: number; outflow: number; net: number };
}

export default function BankAccountReportPage() {
  const today = new Date().toISOString().split('T')[0];
  const firstDay = new Date();
  firstDay.setDate(1);
  const [from, setFrom] = useState(firstDay.toISOString().split('T')[0]);
  const [to, setTo] = useState(today);
  const [report, setReport] = useState<Report | null>(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detailData, setDetailData] = useState<Record<string, any>>({});

  const fetchReport = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/bank-accounts/report', { params: { from, to } });
      setReport(res.data);
    } catch (err: any) {
      alert('Алдаа: ' + (err?.response?.data?.message || 'тайлан авч чадсангүй'));
    } finally {
      setLoading(false);
    }
  }, [from, to]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  async function toggleExpand(accountId: string) {
    if (expanded === accountId) {
      setExpanded(null);
      return;
    }
    setExpanded(accountId);
    if (!detailData[accountId]) {
      try {
        const res = await api.get(`/api/bank-accounts/${accountId}/transactions`, { params: { from, to } });
        setDetailData((p) => ({ ...p, [accountId]: res.data }));
      } catch (err) {
        console.error(err);
      }
    }
  }

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Дансны орлого/зарлага тайлан"
        subtitle="Данс тус бүрийн орлого, зарлага, цэвэр үлдэгдэл"
        icon={Wallet}
      />

      {/* Date range */}
      <FilterBar>
        <DateField label="Эхлэх огноо" value={from} onChange={setFrom} />
        <DateField label="Төгсөх огноо" value={to} onChange={setTo} />
        <ActionButton onClick={fetchReport} disabled={loading}>
          {loading ? 'Уншиж байна...' : 'Тайлан авах'}
        </ActionButton>
      </FilterBar>

      {/* Grand totals */}
      {report && (
        <StatGrid cols={3}>
          <StatCard
            label="Нийт орлого"
            value={formatMnt(report.grandTotal.inflow)}
            icon={ArrowDownRight}
            gradient="green"
            index={0}
          />
          <StatCard
            label="Нийт зарлага"
            value={formatMnt(report.grandTotal.outflow)}
            icon={ArrowUpRight}
            gradient="red"
            index={1}
          />
          <StatCard
            label="Цэвэр үлдэгдэл"
            value={`${report.grandTotal.net >= 0 ? '+' : ''}${formatMnt(report.grandTotal.net)}`}
            icon={DollarSign}
            gradient={report.grandTotal.net >= 0 ? 'blue' : 'orange'}
            index={2}
          />
        </StatGrid>
      )}

      {/* Per-account breakdown */}
      {report && report.accounts.length === 0 && (
        <SectionCard noPadding>
          <EmptyState icon={Wallet} title="Данс бүртгэгдээгүй байна" hint="Сонгосон хугацаанд данс олдсонгүй" />
        </SectionCard>
      )}

      {report && report.accounts.map((item) => (
        <div key={item.account.id} className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 overflow-hidden">
          <button
            onClick={() => toggleExpand(item.account.id)}
            className="w-full p-4 lg:p-5 flex items-center gap-4 hover:bg-[#F9FAFB] transition-all"
          >
            <div className="w-12 h-12 rounded-2xl bg-[#007AFF]/12 flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-[#007AFF]" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <h3 className="text-[16px] font-bold text-[#1A1D26] truncate">{item.account.bankName}</h3>
              <p className="text-[12px] text-[#8C8FA3] font-mono truncate">{item.account.accountNumber} · {item.account.holderName}</p>
            </div>
            <div className="text-right hidden sm:block shrink-0">
              <p className="text-[10px] text-[#8C8FA3] uppercase font-semibold tracking-wide">Одоогийн үлдэгдэл</p>
              <p className="text-[16px] font-bold text-[#1A1D26] tabular-nums">{formatMnt(item.account.currentBalance)}</p>
            </div>
            {expanded === item.account.id ? <ChevronUp className="w-5 h-5 text-[#8C8FA3] shrink-0" /> : <ChevronDown className="w-5 h-5 text-[#8C8FA3] shrink-0" />}
          </button>

          <div className="px-4 lg:px-5 pb-5 grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-[#34C759]/6 rounded-xl p-3 border border-[#34C759]/12">
              <p className="text-[10px] text-[#34C759] uppercase font-semibold tracking-wide">Орлого ({item.inflow.count})</p>
              <p className="text-[16px] font-bold text-[#34C759] mt-0.5 tabular-nums">{formatMnt(item.inflow.amount)}</p>
            </div>
            <div className="bg-[#FF3B30]/6 rounded-xl p-3 border border-[#FF3B30]/12">
              <p className="text-[10px] text-[#FF3B30] uppercase font-semibold tracking-wide">Зарлага ({item.outflow.count})</p>
              <p className="text-[16px] font-bold text-[#FF3B30] mt-0.5 tabular-nums">{formatMnt(item.outflow.amount)}</p>
            </div>
            <div className={`rounded-xl p-3 border ${item.net >= 0 ? 'bg-[#007AFF]/6 border-[#007AFF]/12' : 'bg-[#FF9500]/6 border-[#FF9500]/12'}`}>
              <p className={`text-[10px] uppercase font-semibold tracking-wide ${item.net >= 0 ? 'text-[#007AFF]' : 'text-[#FF9500]'}`}>Цэвэр</p>
              <p className={`text-[16px] font-bold mt-0.5 tabular-nums ${item.net >= 0 ? 'text-[#007AFF]' : 'text-[#FF9500]'}`}>
                {item.net >= 0 ? '+' : ''}{formatMnt(item.net)}
              </p>
            </div>
          </div>

          {/* Expanded transactions */}
          {expanded === item.account.id && detailData[item.account.id] && (
            <div className="border-t border-[#F0F2F5] bg-[#F9FAFB] p-4 lg:p-5 space-y-4">
              {/* Incoming payments */}
              {detailData[item.account.id].payments?.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#34C759] uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Харилцагчаас ирсэн төлбөр
                  </h4>
                  <div className="space-y-1.5">
                    {detailData[item.account.id].payments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-[#E8ECF0]/70 px-3 py-2 text-[12px]">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1A1D26] truncate">{p.customer?.storeName || '-'}</p>
                          <p className="text-[10px] text-[#8C8FA3]">{new Date(p.createdAt).toLocaleString('mn-MN')}</p>
                        </div>
                        <span className="font-bold text-[#34C759] tabular-nums shrink-0">+{formatMnt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing supplier payments */}
              {detailData[item.account.id].supplierPayments?.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#FF3B30] uppercase tracking-wide mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Нийлүүлэгчрүү төлсөн
                  </h4>
                  <div className="space-y-1.5">
                    {detailData[item.account.id].supplierPayments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-xl border border-[#E8ECF0]/70 px-3 py-2 text-[12px]">
                        <div className="min-w-0">
                          <p className="font-semibold text-[#1A1D26] truncate">{p.supplier?.name || '-'}</p>
                          <p className="text-[10px] text-[#8C8FA3]">{new Date(p.date).toLocaleDateString('mn-MN')} · {p.description || ''}</p>
                        </div>
                        <span className="font-bold text-[#FF3B30] tabular-nums shrink-0">-{formatMnt(p.amount)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailData[item.account.id].payments?.length === 0 && detailData[item.account.id].supplierPayments?.length === 0 && (
                <p className="text-center text-[12px] text-[#8C8FA3] py-4">Энэ хугацаанд гүйлгээ байхгүй</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
