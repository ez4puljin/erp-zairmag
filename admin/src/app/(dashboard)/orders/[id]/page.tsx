'use client';

import { useParams, useRouter } from 'next/navigation';
import { useOrder, useUpdateOrderStatus, useCancelOrder } from '@/hooks/use-orders';
import { format } from 'date-fns';
import { ChevronLeft, MapPin, Phone, User, Package, Clock, CheckCircle, Truck, XCircle } from 'lucide-react';

const statusConfig: Record<string, { label: string; color: string; gradient: string }> = {
  PENDING: { label: 'Хүлээгдэж буй', color: '#FF9500', gradient: 'linear-gradient(135deg, #FF9500, #FFCC00)' },
  APPROVED: { label: 'Зөвшөөрсөн', color: '#007AFF', gradient: 'linear-gradient(135deg, #007AFF, #5AC8FA)' },
  SHIPPING: { label: 'Хүргэлтэнд', color: '#AF52DE', gradient: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' },
  DELIVERED: { label: 'Хүргэсэн', color: '#34C759', gradient: 'linear-gradient(135deg, #34C759, #30D158)' },
  CANCELLATION_REQUESTED: { label: 'Цуцлах хүсэлттэй', color: '#E5A100', gradient: 'linear-gradient(135deg, #E5A100, #FFB800)' },
  CANCELLED: { label: 'Цуцалсан', color: '#FF3B30', gradient: 'linear-gradient(135deg, #FF3B30, #FF6961)' },
};

export default function OrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: order, isLoading } = useOrder(id);
  const updateStatus = useUpdateOrderStatus();
  const cancelOrder = useCancelOrder();

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-[#E5E5EA] rounded-xl" />
        <div className="h-40 bg-white rounded-2xl" />
        <div className="h-60 bg-white rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="text-center py-20">
        <Package className="w-12 h-12 text-[#AEAEB2] mx-auto mb-3" />
        <p className="text-[17px] font-semibold text-[#1C1C1E]">Захиалга олдсонгүй</p>
      </div>
    );
  }

  const sc = statusConfig[order.status] ?? statusConfig.PENDING;

  const statusConfirmMessages: Record<string, string> = {
    APPROVED: 'Захиалга батлах уу? Нөөцөөс бараа хасагдана.',
    SHIPPING: 'Хүргэлтэнд илгээх үү?',
    DELIVERED: 'Хүргэгдсэн гэж тэмдэглэх үү? Харилцагчийн өр нэмэгдэнэ.',
  };

  const handleStatusUpdate = (newStatus: string) => {
    const message = statusConfirmMessages[newStatus];
    if (message && !confirm(message)) return;
    updateStatus.mutate({ id, status: newStatus });
  };

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-3xl">
      {/* Back + Title */}
      <div>
        <button
          onClick={() => router.back()}
          className="inline-flex items-center gap-1 text-[15px] text-[#007AFF] font-medium hover:text-[#0066D6] transition-colors mb-3 active:scale-[0.97]"
        >
          <ChevronLeft className="w-5 h-5" />
          Захиалга
        </button>
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-[28px] font-bold text-[#1C1C1E] tracking-tight">
            #{order.orderNumber}
          </h1>
          <span
            className="inline-flex px-3 py-1 rounded-full text-[13px] font-bold"
            style={{ backgroundColor: `${sc.color}15`, color: sc.color }}
          >
            {sc.label}
          </span>
        </div>
        <p className="text-[13px] text-[#8E8E93] mt-1">
          {order.createdAt ? format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm') : ''}
        </p>
      </div>

      {/* Customer Info Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
        <h3 className="text-[13px] font-semibold uppercase text-[#8E8E93] tracking-wide mb-3">Харилцагч</h3>
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#AF52DE]/10 flex items-center justify-center">
              <User className="w-4 h-4 text-[#AF52DE]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#1C1C1E]">{order.customer?.storeName ?? '—'}</p>
              <p className="text-[13px] text-[#8E8E93]">{order.customer?.contactName ?? ''}</p>
            </div>
          </div>
          {order.customer?.address && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#007AFF]/10 flex items-center justify-center">
                <MapPin className="w-4 h-4 text-[#007AFF]" />
              </div>
              <p className="text-[14px] text-[#1C1C1E]">{order.customer.address}</p>
            </div>
          )}
          {order.customer?.phone && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#34C759]/10 flex items-center justify-center">
                <Phone className="w-4 h-4 text-[#34C759]" />
              </div>
              <p className="text-[14px] text-[#1C1C1E]">{order.customer.phone}</p>
            </div>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
        <div className="flex flex-wrap gap-2">
          {order.status === 'PENDING' && (
            <button
              onClick={() => handleStatusUpdate('APPROVED')}
              disabled={updateStatus.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
            >
              <CheckCircle className="w-4 h-4" /> Зөвшөөрөх
            </button>
          )}
          {order.status === 'APPROVED' && (
            <button
              onClick={() => handleStatusUpdate('SHIPPING')}
              disabled={updateStatus.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' }}
            >
              <Truck className="w-4 h-4" /> Хүргэлтэнд гаргах
            </button>
          )}
          {order.status === 'SHIPPING' && (
            <button
              onClick={() => handleStatusUpdate('DELIVERED')}
              disabled={updateStatus.isPending}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[15px] font-semibold text-white transition-all active:scale-[0.97] disabled:opacity-60"
              style={{ background: 'linear-gradient(135deg, #34C759, #30D158)' }}
            >
              <CheckCircle className="w-4 h-4" /> Хүргэсэн
            </button>
          )}
          <button
            onClick={() => {
              if (!confirm('Захиалга цуцлах уу? Нөөцлөгдсөн бараа буцаагдана.')) return;
              cancelOrder.mutate({ id });
            }}
            disabled={cancelOrder.isPending}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-[15px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 transition-all active:scale-[0.97] disabled:opacity-60"
          >
            <XCircle className="w-4 h-4" /> Цуцлах
          </button>
        </div>
      )}

      {/* Order Items */}
      <div>
        <h3 className="text-[13px] font-semibold uppercase text-[#8E8E93] tracking-wide mb-3 px-1">
          Бараа ({order.items?.length ?? 0})
        </h3>
        <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 overflow-hidden divide-y divide-[#E5E5EA]/50">
          {(order.items ?? []).map((item: any) => (
            <div key={item.id} className="flex items-center gap-3 px-4 py-3.5">
              <div className="w-10 h-10 rounded-xl bg-[#34C759]/10 flex items-center justify-center shrink-0">
                <Package className="w-5 h-5 text-[#34C759]" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[15px] font-semibold text-[#1C1C1E] truncate">
                  {item.product?.name ?? 'Бараа'}
                </p>
                <p className="text-[13px] text-[#8E8E93]">
                  {item.quantity} x ₮{Number(item.unitPrice ?? 0).toLocaleString()}
                </p>
              </div>
              <span className="text-[15px] font-semibold text-[#1C1C1E] shrink-0">
                ₮{Number(item.lineTotal ?? 0).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Total */}
      <div className="bg-white rounded-2xl shadow-sm border border-[#E5E5EA]/50 p-5">
        <div className="flex items-center justify-between">
          <span className="text-[17px] font-semibold text-[#1C1C1E]">Нийт дүн</span>
          <span className="text-[22px] font-bold text-[#007AFF]">
            ₮{Number(order.totalAmount ?? 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
}
