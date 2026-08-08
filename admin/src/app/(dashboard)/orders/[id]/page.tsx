'use client';

import { useParams, useRouter } from 'next/navigation';
import { useOrder, useUpdateOrderStatus, useCancelOrder } from '@/hooks/use-orders';
import { format } from 'date-fns';
import {
  ChevronLeft,
  MapPin,
  Phone,
  User,
  Package,
  CheckCircle,
  Truck,
  XCircle,
  Layers,
  Boxes,
  Wallet,
} from 'lucide-react';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { DataTable } from '@/components/shared/data-table';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

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
      <div className="space-y-4 animate-pulse max-w-3xl">
        <div className="h-8 w-48 bg-[#E5E5EA] rounded-xl" />
        <div className="h-40 bg-white rounded-2xl" />
        <div className="h-60 bg-white rounded-2xl" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="max-w-3xl">
        <SectionCard>
          <EmptyState icon={Package} title="Захиалга олдсонгүй" hint="Энэ захиалга устгагдсан эсвэл байхгүй байна" />
        </SectionCard>
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

  const items: any[] = order.items ?? [];
  const totalQty = items.reduce((s: number, i: any) => s + Number(i.quantity ?? 0), 0);

  return (
    <div className="space-y-5 animate-ios-fade-in max-w-3xl">
      {/* Back */}
      <button
        onClick={() => router.back()}
        className="inline-flex items-center gap-1 text-[13px] text-[#007AFF] font-semibold hover:text-[#0066D6] transition-colors active:scale-[0.97]"
      >
        <ChevronLeft className="w-4 h-4" />
        Захиалга
      </button>

      {/* Header */}
      <PageHeader
        title={`#${order.orderNumber}`}
        subtitle={order.createdAt ? format(new Date(order.createdAt), 'yyyy/MM/dd HH:mm') : undefined}
        icon={Package}
        iconColor={sc.color}
        actions={
          <span
            className="inline-flex px-3 py-1.5 rounded-full text-[13px] font-bold"
            style={{ backgroundColor: `${sc.color}15`, color: sc.color }}
          >
            {sc.label}
          </span>
        }
      />

      {/* KPI stats */}
      <StatGrid cols={3}>
        <StatCard label="Барааны төрөл" value={`${items.length} төрөл`} icon={Layers} gradient="purple" index={0} />
        <StatCard label="Нийт тоо ширхэг" value={`${totalQty} ш`} icon={Boxes} gradient="orange" index={1} />
        <StatCard label="Нийт дүн" value={formatMnt(order.totalAmount ?? 0)} icon={Wallet} gradient="green" index={2} />
      </StatGrid>

      {/* Customer Info */}
      <SectionCard title="Харилцагч">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#AF52DE]/10 flex items-center justify-center shrink-0">
              <User className="w-4 h-4 text-[#AF52DE]" />
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[#1A1D26] truncate">{order.customer?.storeName ?? '—'}</p>
              <p className="text-[13px] text-[#8C8FA3] truncate">{order.customer?.contactName ?? ''}</p>
            </div>
          </div>
          {order.customer?.address && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#007AFF]/10 flex items-center justify-center shrink-0">
                <MapPin className="w-4 h-4 text-[#007AFF]" />
              </div>
              <p className="text-[14px] text-[#1A1D26]">{order.customer.address}</p>
            </div>
          )}
          {order.customer?.phone && (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#34C759]/10 flex items-center justify-center shrink-0">
                <Phone className="w-4 h-4 text-[#34C759]" />
              </div>
              <p className="text-[14px] text-[#1A1D26]">{order.customer.phone}</p>
            </div>
          )}
        </div>
      </SectionCard>

      {/* Action Buttons */}
      {order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
        <div className="flex flex-wrap gap-2">
          {order.status === 'PENDING' && (
            <button
              onClick={() => handleStatusUpdate('APPROVED')}
              disabled={updateStatus.isPending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[15px] font-semibold text-white shadow-sm shadow-[#007AFF]/25 transition-all active:scale-[0.97] disabled:opacity-60 hover:brightness-105"
              style={{ background: 'linear-gradient(135deg, #007AFF, #5AC8FA)' }}
            >
              <CheckCircle className="w-4 h-4" /> Зөвшөөрөх
            </button>
          )}
          {order.status === 'APPROVED' && (
            <button
              onClick={() => handleStatusUpdate('SHIPPING')}
              disabled={updateStatus.isPending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[15px] font-semibold text-white shadow-sm shadow-[#AF52DE]/25 transition-all active:scale-[0.97] disabled:opacity-60 hover:brightness-105"
              style={{ background: 'linear-gradient(135deg, #AF52DE, #BF5AF2)' }}
            >
              <Truck className="w-4 h-4" /> Хүргэлтэнд гаргах
            </button>
          )}
          {order.status === 'SHIPPING' && (
            <button
              onClick={() => handleStatusUpdate('DELIVERED')}
              disabled={updateStatus.isPending}
              className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[15px] font-semibold text-white shadow-sm shadow-[#34C759]/25 transition-all active:scale-[0.97] disabled:opacity-60 hover:brightness-105"
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
            className="inline-flex items-center gap-2 h-11 px-5 rounded-xl text-[15px] font-semibold text-[#FF3B30] bg-[#FF3B30]/10 hover:bg-[#FF3B30]/15 transition-all active:scale-[0.97] disabled:opacity-60"
          >
            <XCircle className="w-4 h-4" /> Цуцлах
          </button>
        </div>
      )}

      {/* Order Items */}
      <SectionCard title={`Бараа (${items.length})`} noPadding>
        <DataTable
          columns={[
            {
              key: 'product',
              header: 'Бараа',
              render: (row: any) => (
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#34C759]/10 flex items-center justify-center shrink-0">
                    <Package className="w-4 h-4 text-[#34C759]" />
                  </div>
                  <span className="text-[14px] font-semibold text-[#1A1D26]">{row.product?.name ?? 'Бараа'}</span>
                </div>
              ),
            },
            {
              key: 'qty',
              header: 'Тоо × Үнэ',
              align: 'right',
              render: (row: any) => (
                <span className="text-[13px] text-[#8C8FA3] tabular-nums whitespace-nowrap">
                  {row.quantity} × {formatMnt(row.unitPrice ?? 0)}
                </span>
              ),
            },
            {
              key: 'lineTotal',
              header: 'Дүн',
              align: 'right',
              render: (row: any) => (
                <span className="text-[14px] font-semibold text-[#1A1D26] tabular-nums whitespace-nowrap">
                  {formatMnt(row.lineTotal ?? 0)}
                </span>
              ),
            },
          ]}
          rows={items}
          keyField={(row: any) => row.id}
          empty={<EmptyState icon={Package} title="Бараа байхгүй" />}
          footer={
            <tr className="border-t-2 border-[#E8ECF0] bg-[#F9FAFB]">
              <td className="px-3 py-3 text-[15px] font-semibold text-[#1A1D26]" colSpan={2}>
                Нийт дүн
              </td>
              <td className="px-3 py-3 text-right text-[18px] font-bold text-[#007AFF] tabular-nums whitespace-nowrap">
                {formatMnt(order.totalAmount ?? 0)}
              </td>
            </tr>
          }
        />
      </SectionCard>
    </div>
  );
}
