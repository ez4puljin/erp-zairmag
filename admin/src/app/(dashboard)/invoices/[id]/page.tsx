'use client';

import { useState, useEffect, use } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowLeft, Printer } from 'lucide-react';

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
      <div className="space-y-5 animate-ios-fade-in">
        <div className="h-8 w-48 bg-[#F2F2F7] rounded-lg animate-pulse" />
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-6 space-y-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-4 bg-[#F2F2F7] rounded-lg animate-pulse" style={{ width: `${60 + Math.random() * 30}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (!invoice) {
    return (
      <div className="space-y-5 animate-ios-fade-in">
        <Link href="/invoices" className="inline-flex items-center gap-1.5 text-[15px] text-[#007AFF] font-medium">
          <ArrowLeft className="w-4 h-4" /> Буцах
        </Link>
        <div className="py-16 text-center">
          <p className="text-[17px] font-semibold text-[#1C1C1E]">Нэхэмжлэл олдсонгүй</p>
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

      <div className="space-y-5 animate-ios-fade-in">
        <div className="flex items-center justify-between no-print">
          <Link href="/invoices" className="inline-flex items-center gap-1.5 text-[15px] text-[#007AFF] font-medium">
            <ArrowLeft className="w-4 h-4" /> Буцах
          </Link>
          <button onClick={() => window.print()}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-[14px] font-semibold text-white transition-all active:scale-[0.97]"
            style={{ background: 'linear-gradient(135deg, #007AFF, #5856D6)' }}>
            <Printer className="w-4 h-4" /> Хэвлэх
          </button>
        </div>

        <div id="invoice-print" className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-8">
          {/* Company Header */}
          <div className="text-center mb-8">
            <h1 className="text-[24px] font-bold text-[#1C1C1E]">Зайрмаг ERP</h1>
            <p className="text-[13px] text-[#8E8E93] mt-1">Нэхэмжлэл</p>
          </div>

          {/* Invoice Meta */}
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold text-[#8E8E93] uppercase">Нэхэмжлэл №</p>
              <p className="text-[15px] font-bold text-[#1C1C1E]">
                {invoice.invoiceNumber ?? invoice.id?.slice(0, 8)}
              </p>
              <p className="text-[12px] font-semibold text-[#8E8E93] uppercase mt-3">Огноо</p>
              <p className="text-[15px] text-[#1C1C1E]">
                {invoice.issuedAt || invoice.createdAt
                  ? format(new Date(invoice.issuedAt ?? invoice.createdAt), 'yyyy/MM/dd')
                  : '—'}
              </p>
            </div>
            <div className="space-y-1.5">
              <p className="text-[12px] font-semibold text-[#8E8E93] uppercase">Харилцагч</p>
              <p className="text-[15px] font-bold text-[#1C1C1E]">
                {invoice.customer?.storeName ?? invoice.order?.customer?.storeName ?? '—'}
              </p>
              <p className="text-[13px] text-[#8E8E93]">
                {invoice.customer?.phone ?? invoice.order?.customer?.phone ?? ''}
              </p>
              <p className="text-[13px] text-[#8E8E93]">
                {invoice.customer?.address ?? invoice.order?.customer?.address ?? ''}
              </p>
            </div>
          </div>

          {/* Items Table */}
          <div className="overflow-x-auto mb-6">
            <table className="w-full text-[13px] border-collapse">
              <thead>
                <tr className="border-b-2 border-[#E5E5EA]">
                  <th className="px-3 py-2.5 text-left font-semibold text-[#8E8E93]">№</th>
                  <th className="px-3 py-2.5 text-left font-semibold text-[#8E8E93]">Бүтээгдэхүүн</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-[#8E8E93]">Тоо ширхэг</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-[#8E8E93]">Нэгж үнэ</th>
                  <th className="px-3 py-2.5 text-right font-semibold text-[#8E8E93]">Дүн</th>
                </tr>
              </thead>
              <tbody>
                {items.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="px-3 py-6 text-center text-[#8E8E93]">Мэдээлэл байхгүй</td>
                  </tr>
                ) : (
                  items.map((item: any, idx: number) => (
                    <tr key={item.id ?? idx} className="border-b border-[#E5E5EA]/50">
                      <td className="px-3 py-2.5 text-[#8E8E93]">{idx + 1}</td>
                      <td className="px-3 py-2.5 font-medium text-[#1C1C1E]">
                        {item.product?.name ?? item.productName ?? '—'}
                      </td>
                      <td className="px-3 py-2.5 text-right text-[#1C1C1E]">{item.quantity}</td>
                      <td className="px-3 py-2.5 text-right text-[#1C1C1E]">
                        ₮{Number(item.unitPrice ?? item.price ?? 0).toLocaleString()}
                      </td>
                      <td className="px-3 py-2.5 text-right font-semibold text-[#1C1C1E]">
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
            <div className="w-72 space-y-2">
              <div className="flex justify-between text-[14px] text-[#8E8E93]">
                <span>Дүн</span>
                <span>₮{fmt(subtotal)}</span>
              </div>
              {tax > 0 && (
                <div className="flex justify-between text-[14px] text-[#8E8E93]">
                  <span>НӨАТ</span>
                  <span>₮{fmt(tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-[16px] font-bold text-[#1C1C1E] pt-2 border-t-2 border-[#1C1C1E]">
                <span>Нийт дүн</span>
                <span>₮{fmt(total)}</span>
              </div>
            </div>
          </div>

          {/* Signatures */}
          <div className="mt-12 text-[13px] text-[#8E8E93] space-y-3">
            <p>Нэхэмжлэл гаргасан: ......................................./                   /</p>
            <p>Хүлээн авсан: ......................................./                   /</p>
          </div>
        </div>
      </div>
    </>
  );
}
