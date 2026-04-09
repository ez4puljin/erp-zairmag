'use client';

import { useState, useEffect, useCallback } from 'react';
import api from '@/lib/api';
import { Wallet, TrendingUp, TrendingDown, DollarSign, Calendar, ChevronDown, ChevronUp, ArrowUpRight, ArrowDownRight } from 'lucide-react';

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

  const inputClass = 'px-4 py-2.5 rounded-xl bg-[#F2F2F7] border border-[#E5E5EA] text-[14px] text-[#1C1C1E] outline-none focus:border-[#007AFF] focus:ring-[2px] focus:ring-[#007AFF]/15';

  return (
    <div className="space-y-6 animate-ios-fade-in">
      <div>
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Дансны орлого/зарлага тайлан</h1>
        <p className="text-[13px] text-[#8E8E93] mt-1">Данс тус бүрийн орлого, зарлага, цэвэр үлдэгдэл</p>
      </div>

      {/* Date range */}
      <div className="bg-white rounded-2xl border border-[#E5E5EA]/50 p-4 flex flex-wrap items-end gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Эхлэх огноо</label>
          <input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className="block text-[11px] font-semibold text-[#8E8E93] uppercase mb-1">Төгсөх огноо</label>
          <input type="date" value={to} onChange={(e) => setTo(e.target.value)} className={inputClass} />
        </div>
        <button
          onClick={fetchReport}
          disabled={loading}
          className="px-5 py-2.5 rounded-xl bg-[#007AFF] text-white text-[14px] font-semibold hover:bg-[#0051D5] disabled:opacity-50"
        >
          {loading ? 'Уншиж байна...' : 'Тайлан авах'}
        </button>
      </div>

      {/* Grand totals */}
      {report && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-gradient-to-br from-[#34C759]/10 to-[#34C759]/5 border border-[#34C759]/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowDownRight className="w-5 h-5 text-[#34C759]" />
              <span className="text-[12px] font-semibold text-[#34C759] uppercase">Нийт орлого</span>
            </div>
            <p className="text-[28px] font-bold text-[#34C759]">₮{report.grandTotal.inflow.toLocaleString('mn-MN')}</p>
          </div>
          <div className="bg-gradient-to-br from-[#FF3B30]/10 to-[#FF3B30]/5 border border-[#FF3B30]/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <ArrowUpRight className="w-5 h-5 text-[#FF3B30]" />
              <span className="text-[12px] font-semibold text-[#FF3B30] uppercase">Нийт зарлага</span>
            </div>
            <p className="text-[28px] font-bold text-[#FF3B30]">₮{report.grandTotal.outflow.toLocaleString('mn-MN')}</p>
          </div>
          <div className={`bg-gradient-to-br ${report.grandTotal.net >= 0 ? 'from-[#007AFF]/10 to-[#007AFF]/5 border-[#007AFF]/20' : 'from-[#FF9500]/10 to-[#FF9500]/5 border-[#FF9500]/20'} border rounded-2xl p-5`}>
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className={`w-5 h-5 ${report.grandTotal.net >= 0 ? 'text-[#007AFF]' : 'text-[#FF9500]'}`} />
              <span className={`text-[12px] font-semibold uppercase ${report.grandTotal.net >= 0 ? 'text-[#007AFF]' : 'text-[#FF9500]'}`}>Цэвэр үлдэгдэл</span>
            </div>
            <p className={`text-[28px] font-bold ${report.grandTotal.net >= 0 ? 'text-[#007AFF]' : 'text-[#FF9500]'}`}>
              {report.grandTotal.net >= 0 ? '+' : ''}₮{report.grandTotal.net.toLocaleString('mn-MN')}
            </p>
          </div>
        </div>
      )}

      {/* Per-account breakdown */}
      {report && report.accounts.length === 0 && (
        <div className="text-center py-16 bg-[#F2F2F7] rounded-2xl">
          <Wallet className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
          <p className="text-[#8E8E93]">Данс бүртгэгдээгүй байна</p>
        </div>
      )}

      {report && report.accounts.map((item) => (
        <div key={item.account.id} className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
          <button
            onClick={() => toggleExpand(item.account.id)}
            className="w-full p-5 flex items-center gap-4 hover:bg-[#F2F2F7]/50 transition-all"
          >
            <div className="w-12 h-12 rounded-xl bg-[#007AFF15] flex items-center justify-center shrink-0">
              <Wallet className="w-6 h-6 text-[#007AFF]" />
            </div>
            <div className="flex-1 text-left">
              <h3 className="text-[16px] font-bold text-[#1C1C1E]">{item.account.bankName}</h3>
              <p className="text-[12px] text-[#8E8E93] font-mono">{item.account.accountNumber} · {item.account.holderName}</p>
            </div>
            <div className="text-right hidden sm:block">
              <p className="text-[10px] text-[#8E8E93] uppercase font-semibold">Одоогийн үлдэгдэл</p>
              <p className="text-[16px] font-bold text-[#1C1C1E]">₮{Number(item.account.currentBalance).toLocaleString('mn-MN')}</p>
            </div>
            {expanded === item.account.id ? <ChevronUp className="w-5 h-5 text-[#8E8E93]" /> : <ChevronDown className="w-5 h-5 text-[#8E8E93]" />}
          </button>

          <div className="px-5 pb-5 grid grid-cols-3 gap-3">
            <div className="bg-[#34C759]/5 rounded-xl p-3 border border-[#34C759]/10">
              <p className="text-[10px] text-[#34C759] uppercase font-semibold">Орлого ({item.inflow.count})</p>
              <p className="text-[16px] font-bold text-[#34C759]">₮{item.inflow.amount.toLocaleString('mn-MN')}</p>
            </div>
            <div className="bg-[#FF3B30]/5 rounded-xl p-3 border border-[#FF3B30]/10">
              <p className="text-[10px] text-[#FF3B30] uppercase font-semibold">Зарлага ({item.outflow.count})</p>
              <p className="text-[16px] font-bold text-[#FF3B30]">₮{item.outflow.amount.toLocaleString('mn-MN')}</p>
            </div>
            <div className={`rounded-xl p-3 border ${item.net >= 0 ? 'bg-[#007AFF]/5 border-[#007AFF]/10' : 'bg-[#FF9500]/5 border-[#FF9500]/10'}`}>
              <p className={`text-[10px] uppercase font-semibold ${item.net >= 0 ? 'text-[#007AFF]' : 'text-[#FF9500]'}`}>Цэвэр</p>
              <p className={`text-[16px] font-bold ${item.net >= 0 ? 'text-[#007AFF]' : 'text-[#FF9500]'}`}>
                {item.net >= 0 ? '+' : ''}₮{item.net.toLocaleString('mn-MN')}
              </p>
            </div>
          </div>

          {/* Expanded transactions */}
          {expanded === item.account.id && detailData[item.account.id] && (
            <div className="border-t border-[#E5E5EA] bg-[#F9FAFB] p-5 space-y-4">
              {/* Incoming payments */}
              {detailData[item.account.id].payments?.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#34C759] uppercase mb-2 flex items-center gap-1">
                    <TrendingDown className="w-3.5 h-3.5" /> Харилцагчаас ирсэн төлбөр
                  </h4>
                  <div className="space-y-1">
                    {detailData[item.account.id].payments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-[12px]">
                        <div>
                          <p className="font-semibold text-[#1C1C1E]">{p.customer?.storeName || '-'}</p>
                          <p className="text-[10px] text-[#8E8E93]">{new Date(p.createdAt).toLocaleString('mn-MN')}</p>
                        </div>
                        <span className="font-bold text-[#34C759]">+₮{Number(p.amount).toLocaleString('mn-MN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Outgoing supplier payments */}
              {detailData[item.account.id].supplierPayments?.length > 0 && (
                <div>
                  <h4 className="text-[11px] font-bold text-[#FF3B30] uppercase mb-2 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5" /> Нийлүүлэгчрүү төлсөн
                  </h4>
                  <div className="space-y-1">
                    {detailData[item.account.id].supplierPayments.map((p: any) => (
                      <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 text-[12px]">
                        <div>
                          <p className="font-semibold text-[#1C1C1E]">{p.supplier?.name || '-'}</p>
                          <p className="text-[10px] text-[#8E8E93]">{new Date(p.date).toLocaleDateString('mn-MN')} · {p.description || ''}</p>
                        </div>
                        <span className="font-bold text-[#FF3B30]">-₮{Number(p.amount).toLocaleString('mn-MN')}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {detailData[item.account.id].payments?.length === 0 && detailData[item.account.id].supplierPayments?.length === 0 && (
                <p className="text-center text-[12px] text-[#8E8E93] py-4">Энэ хугацаанд гүйлгээ байхгүй</p>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
