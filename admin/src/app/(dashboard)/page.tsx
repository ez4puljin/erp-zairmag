'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { useOrders } from '@/hooks/use-orders';
import { useProducts } from '@/hooks/use-products';
import { useCustomers } from '@/hooks/use-customers';
import api from '@/lib/api';
import {
  DollarSign,
  ShoppingCart,
  Package,
  Users,
  ChevronRight,
  TrendingUp,
  Truck,
  LayoutDashboard,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { PageHeader } from '@/components/shared/page-header';
import { StatCard, StatGrid, type StatGradient } from '@/components/shared/stat-card';
import { SectionCard } from '@/components/shared/section-card';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

const statusConfig: Record<string, { label: string; text: string }> = {
  PENDING: { label: 'Хүлээгдэж буй', text: '#FF9500' },
  APPROVED: { label: 'Зөвшөөрсөн', text: '#007AFF' },
  SHIPPING: { label: 'Хүргэлтэнд', text: '#AF52DE' },
  DELIVERED: { label: 'Хүргэсэн', text: '#34C759' },
  CANCELLATION_REQUESTED: { label: 'Цуцлах хүсэлттэй', text: '#E5A100' },
  CANCELLED: { label: 'Цуцалсан', text: '#FF3B30' },
};

export default function DashboardPage() {
  const { user } = useAuth();
  const { data: ordersData } = useOrders({ limit: 5 });
  const { data: productsData } = useProducts({ limit: 1 });
  const { data: customersData } = useCustomers({ limit: 1 });
  const [todayRevenue, setTodayRevenue] = useState(0);
  const [truckLoads, setTruckLoads] = useState<any>(null);

  const orders = ordersData?.data ?? [];
  const totalOrders = ordersData?.meta?.total ?? 0;
  const totalProducts = productsData?.meta?.total ?? 0;
  const totalCustomers = customersData?.meta?.total ?? 0;

  useEffect(() => {
    const today = new Date().toISOString().split('T')[0];
    api
      .get('/api/orders', { params: { status: 'DELIVERED', dateFrom: today, limit: 100 } })
      .then((res) => {
        const allTodayOrders = res.data?.data ?? res.data ?? [];
        setTodayRevenue(allTodayOrders.reduce((sum: number, o: any) => sum + Number(o.totalAmount ?? 0), 0));
      })
      .catch(() => {});

    // Fetch today's truck loads
    api
      .get('/api/truck-loads', { params: { dateFrom: today, dateTo: today } })
      .then((res) => {
        const loads = res.data?.data ?? res.data ?? [];
        setTruckLoads({
          total: loads.length,
          dispatched: loads.filter((l: any) => l.status === 'DISPATCHED').length,
          completed: loads.filter((l: any) => l.status === 'COMPLETED').length,
        });
      })
      .catch(() => {});
  }, [ordersData]);

  const stats: { label: string; value: string; icon: typeof DollarSign; gradient: StatGradient }[] = [
    { label: 'Өнөөдрийн борлуулалт', value: formatMnt(todayRevenue), icon: DollarSign, gradient: 'blue' },
    { label: 'Нийт захиалга', value: totalOrders.toString(), icon: ShoppingCart, gradient: 'orange' },
    { label: 'Бүтээгдэхүүн', value: totalProducts.toString(), icon: Package, gradient: 'green' },
    { label: 'Харилцагч', value: totalCustomers.toString(), icon: Users, gradient: 'purple' },
  ];

  return (
    <div className="space-y-5 animate-ios-fade-in">
      {/* Header */}
      <PageHeader
        title={`Сайн байна уу, ${user?.firstName ?? 'Админ'}!`}
        subtitle={`${format(new Date(), "yyyy 'оны' MM 'сарын' dd")} — Өнөөдрийн тойм`}
        icon={LayoutDashboard}
      />

      {/* Stats Grid */}
      <StatGrid cols={4}>
        {stats.map((stat, i) => (
          <StatCard key={stat.label} label={stat.label} value={stat.value} icon={stat.icon} gradient={stat.gradient} index={i} />
        ))}
      </StatGrid>

      {/* Quick Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Truck loads today */}
        <SectionCard
          title="Өнөөдрийн ачилт"
          action={
            <Link href="/truck-loads" className="text-[12px] font-semibold text-[#007AFF] hover:text-[#0056D6] flex items-center gap-0.5">
              Харах <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          }
        >
          {truckLoads ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-[#F5F6FA]">
                <div className="text-[22px] font-bold text-[#1A1D26] tabular-nums">{truckLoads.total}</div>
                <div className="text-[11px] text-[#8C8FA3] font-medium">Нийт</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-[#FFF7ED]">
                <div className="text-[22px] font-bold text-[#FF9500] tabular-nums">{truckLoads.dispatched}</div>
                <div className="text-[11px] text-[#8C8FA3] font-medium">Идэвхтэй</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-[#ECFDF5]">
                <div className="text-[22px] font-bold text-[#34C759] tabular-nums">{truckLoads.completed}</div>
                <div className="text-[11px] text-[#8C8FA3] font-medium">Дууссан</div>
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-[#8C8FA3]">Ачааллаж байна...</div>
          )}
        </SectionCard>

        {/* Quick actions */}
        <SectionCard title="Шуурхай үйлдлүүд">
          <div className="grid grid-cols-2 gap-2">
            {[
              { href: '/pos', label: 'Борлуулалт хийх', icon: DollarSign, color: '#34C759', bg: '#ECFDF5' },
              { href: '/truck-loads', label: 'Ачилт үүсгэх', icon: Truck, color: '#5856D6', bg: '#EEF2FF' },
              { href: '/payments/new', label: 'Төлбөр бүртгэх', icon: TrendingUp, color: '#007AFF', bg: '#EFF6FF' },
              { href: '/orders/new', label: 'Захиалга үүсгэх', icon: ShoppingCart, color: '#FF9500', bg: '#FFF7ED' },
            ].map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F9FAFB] border border-[#E8ECF0]/70 transition-all group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ background: action.bg }}>
                  <action.icon className="w-4 h-4" style={{ color: action.color }} />
                </div>
                <span className="text-[12px] font-semibold text-[#4A4D5C] group-hover:text-[#007AFF] transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </SectionCard>
      </div>

      {/* Recent Orders */}
      <SectionCard
        title="Сүүлийн захиалгууд"
        noPadding
        action={
          <Link href="/orders" className="text-[12px] font-semibold text-[#007AFF] hover:text-[#0056D6] flex items-center gap-0.5">
            Бүгдийг харах <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {orders.length === 0 ? (
          <EmptyState icon={ShoppingCart} title="Захиалга байхгүй" />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {orders.map((order: any) => {
              const status = statusConfig[order.status] ?? statusConfig.PENDING;
              return (
                <Link
                  key={order.id}
                  href={`/orders/${order.id}`}
                  className="flex items-center gap-4 px-4 lg:px-5 py-4 hover:bg-[#F9FAFB] transition-colors group"
                >
                  <div className="w-10 h-10 rounded-xl bg-[#F5F6FA] flex items-center justify-center shrink-0">
                    <span className="text-[13px] font-bold text-[#4A4D5C]">#{order.orderNumber}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[14px] font-semibold text-[#1A1D26]">
                        {order.customer?.storeName ?? 'Харилцагч'}
                      </span>
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold"
                        style={{ backgroundColor: `${status.text}12`, color: status.text }}
                      >
                        {status.label}
                      </span>
                    </div>
                    <p className="text-[12px] text-[#8C8FA3] mt-0.5">
                      {order.createdAt ? format(new Date(order.createdAt), 'yyyy.MM.dd HH:mm') : ''}
                    </p>
                  </div>
                  <p className="text-[15px] font-bold text-[#1A1D26] shrink-0 tabular-nums">
                    {formatMnt(order.totalAmount ?? 0)}
                  </p>
                  <ChevronRight className="w-4 h-4 text-[#D0D2DA] group-hover:text-[#8C8FA3] shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
