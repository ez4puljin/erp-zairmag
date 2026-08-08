'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { CreditCard, Plus, ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

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
      <PageHeader
        title="Төлбөр"
        subtitle="Харилцагчаас хүлээн авсан төлбөрийн бүртгэл"
        icon={CreditCard}
        iconColor="#34C759"
        actions={
          <Link
            href="/payments/new"
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
          >
            <Plus className="w-4 h-4" /> Бүртгэх
          </Link>
        }
      />

      <SectionCard title="Төлбөрийн жагсаалт" noPadding>
        {loading ? (
          <div className="divide-y divide-[#F2F4F7]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 lg:px-5 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-[#F2F4F7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#F2F4F7] rounded-lg" />
                  <div className="h-3 w-24 bg-[#F2F4F7] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : payments.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="Төлбөр олдсонгүй"
            hint="Шинэ төлбөр бүртгэхийн тулд дээрх 'Бүртгэх' товч дарна уу"
          />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {payments.map((p: any) => (
              <div key={p.id} className="flex items-center gap-3 px-4 lg:px-5 py-3.5 hover:bg-[#F7F9FC] transition-colors">
                <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center shrink-0">
                  <CreditCard className="w-5 h-5 text-[#34C759]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold text-[#1A1D26] truncate">{p.customer?.storeName ?? '—'}</p>
                  <p className="text-[13px] text-[#8C8FA3]">
                    {p.createdAt ? format(new Date(p.createdAt), 'yyyy/MM/dd HH:mm') : '—'}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-[15px] font-bold text-[#34C759] tabular-nums">+{formatMnt(p.amount ?? 0)}</p>
                  <span className="text-[11px] font-medium text-[#8C8FA3]">{methodLabels[p.method] ?? p.method}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1}
            className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF0]/70 shadow-sm flex items-center justify-center text-[#8C8FA3] disabled:opacity-30 transition-all active:scale-95 hover:bg-[#F7F9FC]">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium text-[#8C8FA3] px-3">{page} / {meta.totalPages}</span>
          <button onClick={() => setPage(p => Math.min(meta.totalPages, p + 1))} disabled={page >= meta.totalPages}
            className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF0]/70 shadow-sm flex items-center justify-center text-[#8C8FA3] disabled:opacity-30 transition-all active:scale-95 hover:bg-[#F7F9FC]">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
