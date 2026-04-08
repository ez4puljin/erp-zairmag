'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { FileText, ChevronLeft, ChevronRight } from 'lucide-react';

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/api/invoices?page=${page}&limit=20`).then(res => {
      setInvoices(res.data?.data ?? []);
      setMeta(res.data?.meta ?? null);
    }).catch((err) => {
      alert('Нэхэмжлэлийн мэдээлэл ачааллахад алдаа гарлаа');
      console.error(err);
    }).finally(() => setLoading(false));
  }, [page]);

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <div className="flex items-center justify-between">
        <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">Нэхэмжлэл</h1>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden">
        {loading ? (
          <div className="divide-y divide-[#E5E5EA]/50">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-10 h-10 rounded-xl bg-[#F2F2F7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-40 bg-[#F2F2F7] rounded-lg" />
                  <div className="h-3 w-24 bg-[#F2F2F7] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : invoices.length === 0 ? (
          <div className="py-16 text-center">
            <FileText className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
            <p className="text-[17px] font-semibold text-[#1C1C1E]">Нэхэмжлэл олдсонгүй</p>
          </div>
        ) : (
          <table className="w-full text-[14px]">
            <thead>
              <tr className="bg-[#F2F2F7] text-[#8E8E93] text-[12px] uppercase tracking-wide">
                <th className="px-4 py-3 text-left font-semibold">Нэхэмжлэл №</th>
                <th className="px-3 py-3 text-left font-semibold">Захиалга №</th>
                <th className="px-3 py-3 text-left font-semibold">Харилцагч</th>
                <th className="px-3 py-3 text-right font-semibold">Нийт дүн</th>
                <th className="px-3 py-3 text-right font-semibold">Огноо</th>
                <th className="px-3 py-3 w-10"></th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv: any) => (
                <Link key={inv.id} href={`/invoices/${inv.id}`} legacyBehavior>
                  <tr className="border-b border-[#E5E5EA]/50 hover:bg-[#F2F2F7]/30 cursor-pointer transition-colors">
                    <td className="px-4 py-3 font-semibold text-[#007AFF]">
                      {inv.invoiceNumber ?? inv.id?.slice(0, 8)}
                    </td>
                    <td className="px-3 py-3 text-[#1C1C1E]">
                      {inv.order?.orderNumber ?? inv.orderId?.slice(0, 8) ?? '—'}
                    </td>
                    <td className="px-3 py-3 font-medium text-[#1C1C1E]">
                      {inv.customer?.storeName ?? inv.order?.customer?.storeName ?? '—'}
                    </td>
                    <td className="px-3 py-3 text-right font-bold text-[#1C1C1E]">
                      ₮{Number(inv.totalAmount ?? inv.total ?? 0).toLocaleString()}
                    </td>
                    <td className="px-3 py-3 text-right text-[#8E8E93]">
                      {inv.issuedAt || inv.createdAt
                        ? format(new Date(inv.issuedAt ?? inv.createdAt), 'yyyy/MM/dd')
                        : '—'}
                    </td>
                    <td className="px-2 py-3">
                      <ChevronRight className="w-4 h-4 text-[#C7C7CC]" />
                    </td>
                  </tr>
                </Link>
              ))}
            </tbody>
          </table>
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
