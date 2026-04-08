'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { CreditCard, Plus, ChevronLeft, ChevronRight } from 'lucide-react';

const methodLabels: Record<string, string> = {
  CASH: 'Бэлэн', BANK_TRANSFER: 'Шилжүүлэг', MOBILE_MONEY: 'Мобайл', CHECK: 'Чек', CREDIT: 'Зээл',
};

export default function PaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/payments?page=${page}&limit=10`).then(res => {
      setPayments(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    }).catch((err) => {
      alert('Төлбөрийн мэдээлэл ачааллахад алдаа гарлаа');
      console.error(err);
    }).finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Төлбөр</h1>
        <Link href="/payments/new"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
          style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
          <Plus className="w-4 h-4" /> Бүртгэх
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#E5E5EA]/50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-[#F2F2F7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#F2F2F7] rounded-lg" />
                  <div className="h-3 w-24 bg-[#F2F2F7] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <div className="py-16 text-center">
            <CreditCard className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-[#1C1C1E]">Төлбөр олдсонгүй</p>
          </div>
        ) : (
          <div className="divide-y divide-[#E5E5EA]/50">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-[#34C759]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">{p.customer?.storeName ?? '—'}</p>
                  <p className="text-[13px] text-[#8E8E93]">
                    {p.createdAt ? format(new Date(p.createdAt), 'yyyy/MM/dd HH:mm') : '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-bold text-[#34C759]">+₮{Number(p.amount ?? 0).toLocaleString()}</p>
                  <span className="text-[11px] font-medium text-[#8E8E93]">{methodLabels[p.method] ?? p.method}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA]/50 flex items-center justify-center text-[#8E8E93] disabled:opacity-30 transition-all active:scale-95">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium text-[#8E8E93] px-3">{page} / {meta.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
            className="w-10 h-10 rounded-xl bg-white border border-[#E5E5EA]/50 flex items-center justify-center text-[#8E8E93] disabled:opacity-30 transition-all active:scale-95">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
