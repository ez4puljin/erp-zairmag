'use client';

import { useState, useEffect, use } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Printer, FileText } from 'lucide-react';
import { EmptyState } from '@/components/shared/empty-state';

const fmt = (n: number) => n ? Number(n).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '0.00';

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/api/invoices/${id}`).then(res => {
      setInvoice(res.data);
    }).catch((err) => {
      alert('Нэхэмжлэл ачааллахад алдаа гарлаа');
      console.error(err);
    }).finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="space-y-5 animate-ios-fade-in mx-auto w-full max-w-4xl">
        <div className="h-8 w-48 bg-[#F2F4F7] rounded-lg animate-pulse" />
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-[#F2F4F7] rounded-lg animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-5 animate-ios-fade-in mx-auto w-full max-w-4xl">
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-[13px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors">
          <ArrowLeft className="w-4 h-4" /> Буцах
        </Link>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70">
          <EmptyState icon={FileText} title="Нэхэмжлэл олдсонгүй" hint="Энэ нэхэмжлэл устсан эсвэл байхгүй байна" />
        </div>
      </div>
    );
  }

  const items = invoice.items ?? invoice.orderItems ?? invoice.order?.items ?? [];
  const subtotal = items.reduce((s: number, it: any) => s + (Number(it.lineTotal ?? it.totalPrice ?? 0)), 0);
  const tax = Number(invoice.tax ?? 0);
  const total = Number(invoice.totalAmount ?? invoice.total ?? subtotal + tax);

  return (
    <>
      <style jsx global>{`
        @media print {
          body * { visibility: hidden; }
          #invoice-print, #invoice-print * { visibility: visible; }
          #invoice-print { position: absolute; left: 0; top: 0; width: 100%; padding: 40px; }
          .no-print { display: none !important; }
        }
      `}</style>

      <div className="space-y-5 animate-ios-fade-in mx-auto w-full max-w-4xl">
        <div className="flex items-center justify-between no-print">
          <Link href="/invoices" className="inline-flex items-center gap-1.5 text-[13px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors active:scale-[0.97]">
            <ArrowLeft className="w-4 h-4" /> Буцах
          </Link>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 h-9 px-4 rounded-xl text-[13px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] hover:brightness-105"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
            <Printer className="w-4 h-4" /> Хэвлэх
          </button>
        </div>

        <div id="invoice-print" className="bg-white rounded-2xl shadow-sm border border-[#E8ECF0]/70 p-6 lg:p-8">
          {/* Company Header */}
          <div className="text-center mb-8 pb-6 border-b border-[#F0F2F5]">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-3" style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}>
              <FileText className="w-6 h-6 text-white" />
            </div>
            <h1 className="text-[24px] font-bold text-[#1A1D26] tracking-tight">Зайрмаг ERP</h1>
            <p className="text-[12px] font-semibold text-[#8C8FA3] uppercase tracking-wide mt-1">Нэхэмжлэл</p>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 mb-8">
            <div className="space-y-1.5">
              <p className="text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide">Нэхэмжлэл №</p>
              <p className="text-[15px] font-bold text-[#1A1D26]">
                {invoice.invoiceNumber ?? invoice.id?.slice(0, 8)}
              </p>
              <p className="text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide pt-2">Огноо</p>
              <p className="text-[15px] text-[#1A1D26]">
                {invoice.issuedAt || invoice.createdAt
                  ? format(new Date(invoice.issuedAt ?? invoice.createdAt), 'yyyy/MM/dd')
                  : '—'}
              </p>
            </div>
            <div className="space-y-1.5 sm:text-right">
              <p className="text-[11px] font-semibold text-[#8C8FA3] uppercase tracking-wide">Харилцагч</p>
              <p className="text-[15px] font-bold text-[#1A1D26]">
                {invoice.customer?.storeName ?? invoice.order?.customer?.storeName ?? '—'}
              </p>
              <p className="text-[13px] text-[#8C8FA3]">
                {invoice.customer?.phone ?? invoice.order?.customer?.phone ?? ''}
              </p>
              <p className="text-[13px] text-[#8C8FA3]">
                {invoice.customer?.address ?? invoice.order?.customer?.address ?? ''}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6 rounded-xl border border-[#F0F2F5]">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="bg-[#F9FAFB] border-b border-[#F0F2F5] text-[11px] uppercase tracking-wide text-[#8C8FA3]">
                  <th className="px-3 py-2.5 text-left font-semibold">№</th>
                  <th className="px-3 py-2.5 text-left font-semibold">Бүтээгдэхүүн</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Тоо ширхэг</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Нэгж үнэ</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Дүн</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F2F4F7]">
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[#8C8FA3]">Мэдээлэл байхгүй</td>
                  </tr>
                ) : (
                  items.map((item: any, idx: number) => (
                    <tr key={item.id ?? idx}>
                      <td className="px-3 py-2.5 text-[#8C8FA3]">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-[#1A1D26]">
                        {item.product?.name ?? item.productName ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[#1A1D26] tabular-nums">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-[#1A1D26] tabular-nums">
                        ₮{Number(item.unitPrice ?? item.price ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[#1A1D26] tabular-nums">
                        ₮{fmt(Number(item.lineTotal ?? item.totalPrice ?? 0))}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-full sm:w-72 space-y-2">
              <div className="flex justify-between text-[14px] text-[#8C8FA3]">
                <span>Дүн</span>
                <span className="tabular-nums">₮{fmt(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-[14px] text-[#8C8FA3]">
                  <span>НӨАТ</span>
                  <span className="tabular-nums">₮{fmt(tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-[16px] font-bold text-[#1A1D26] pt-2.5 border-t-2 border-[#1A1D26]">
                <span>Нийт дүн</span>
                <span className="tabular-nums">₮{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 text-[13px] text-[#8C8FA3] space-y-3">
            <p>Нэхэмжлэл гаргасан: ......................................./                   /</p>
            <p>Хүлээн авсан: ......................................./                   /</p>
          </div>
        </div>
      </div>
    </>
  );
}
