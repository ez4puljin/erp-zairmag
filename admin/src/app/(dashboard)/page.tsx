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
  AlertTriangle,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

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

  const stats = [
    {
      label: 'Өнөөдрийн борлуулалт',
      value: `₮${todayRevenue.toLocaleString()}`,
      icon: DollarSign,
      color: '#007AFF',
      bg: '#EFF6FF',
      gradient: 'from-[#007AFF] to-[#5AC8FA]',
    },
    {
      label: 'Нийт захиалга',
      value: totalOrders.toString(),
      icon: ShoppingCart,
      color: '#FF9500',
      bg: '#FFF7ED',
      gradient: 'from-[#FF9500] to-[#FFCC00]',
    },
    {
      label: 'Бүтээгдэхүүн',
      value: totalProducts.toString(),
      icon: Package,
      color: '#34C759',
      bg: '#ECFDF5',
      gradient: 'from-[#34C759] to-[#30D158]',
    },
    {
      label: 'Харилцагч',
      value: totalCustomers.toString(),
      icon: Users,
      color: '#AF52DE',
      bg: '#FAF5FF',
      gradient: 'from-[#AF52DE] to-[#BF5AF2]',
    },
  ];

  return (
    <div className="space-y-8 animate-ios-fade-in max-w-[1400px]">
      {/* Header */}
      <div>
        <h1 className="text-[26px] font-bold text-[#1A1D26]">
          Сайн байна уу, {user?.firstName ?? 'Админ'}!
        </h1>
        <p className="text-[14px] text-[#8C8FA3] mt-1">
          {format(new Date(), "yyyy 'оны' MM 'сарын' dd")} — Өнөөдрийн тойм
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <div
            key={stat.label}
            className={`relative overflow-hidden rounded-2xl p-5 text-white bg-gradient-to-br ${stat.gradient} shadow-lg animate-ios-slide-up stagger-${i + 1}`}
          >
            <div className="flex items-center justify-between mb-3">
              <span className="text-[12px] font-medium text-white/80">{stat.label}</span>
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                <stat.icon className="w-4.5 h-4.5" />
              </div>
            </div>
            <div className="text-[28px] font-bold tracking-tight">{stat.value}</div>
            {/* Decorative circle */}
            <div className="absolute -bottom-6 -right-6 w-24 h-24 rounded-full bg-white/10" />
          </div>
        ))}
      </div>

      {/* Quick Info Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Truck loads today */}
        <div className="bg-white rounded-2xl border border-[#E8ECF0] p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 rounded-xl bg-[#EEF2FF] flex items-center justify-center">
                <Truck className="w-4.5 h-4.5 text-[#5856D6]" />
              </div>
              <h3 className="text-[14px] font-bold text-[#1A1D26]">Өнөөдрийн ачилт</h3>
            </div>
            <Link href="/truck-loads" className="text-[12px] font-semibold text-[#007AFF] hover:text-[#0056D6] flex items-center gap-0.5">
              Харах <ChevronRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          {truckLoads ? (
            <div className="grid grid-cols-3 gap-3">
              <div className="text-center p-3 rounded-xl bg-[#F5F6FA]">
                <div className="text-[22px] font-bold text-[#1A1D26]">{truckLoads.total}</div>
                <div className="text-[11px] text-[#8C8FA3] font-medium">Нийт</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-[#FFF7ED]">
                <div className="text-[22px] font-bold text-[#FF9500]">{truckLoads.dispatched}</div>
                <div className="text-[11px] text-[#8C8FA3] font-medium">Идэвхтэй</div>
              </div>
              <div className="text-center p-3 rounded-xl bg-[#ECFDF5]">
                <div className="text-[22px] font-bold text-[#34C759]">{truckLoads.completed}</div>
                <div className="text-[11px] text-[#8C8FA3] font-medium">Дууссан</div>
              </div>
            </div>
          ) : (
            <div className="text-[13px] text-[#8C8FA3]">Ачааллаж байна...</div>
          )}
        </div>

        {/* Quick actions */}
        <div className="bg-white rounded-2xl border border-[#E8ECF0] p-5">
          <h3 className="text-[14px] font-bold text-[#1A1D26] mb-4">Шуурхай үйлдлүүд</h3>
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
                className="flex items-center gap-3 p-3 rounded-xl hover:bg-[#F9FAFB] border border-[#E8ECF0] transition-all group"
              >
                <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: action.bg }}>
                  <action.icon className="w-4 h-4" style={{ color: action.color }} />
                </div>
                <span className="text-[12px] font-semibold text-[#4A4D5C] group-hover:text-[#007AFF] transition-colors">
                  {action.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* Recent Orders */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[14px] font-bold text-[#1A1D26] uppercase tracking-wide">
            Сүүлийн захиалгууд
          </h2>
          <Link
            href="/orders"
            className="text-[13px] font-semibold text-[#007AFF] hover:text-[#0056D6] flex items-center gap-1"
          >
            Бүгдийг харах <ChevronRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="bg-white rounded-2xl border border-[#E8ECF0] overflow-hidden">
          {orders.length === 0 ? (
            <div className="py-16 text-center">
              <div className="w-14 h-14 rounded-2xl bg-[#F5F6FA] flex items-center justify-center mx-auto mb-3">
                <ShoppingCart className="w-6 h-6 text-[#C7C7CC]" />
              </div>
              <p className="text-[14px] text-[#8C8FA3] font-medium">Захиалга байхгүй</p>
            </div>
          ) : (
            <div className="divide-y divide-[#F2F4F7]">
              {orders.map((order: any) => {
                const status = statusConfig[order.status] ?? statusConfig.PENDING;
                return (
                  <Link
                    key={order.id}
                    href={`/orders/${order.id}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-[#F9FAFB] transition-colors group"
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
                    <p className="text-[15px] font-bold text-[#1A1D26] shrink-0">
                      ₮{Number(order.totalAmount ?? 0).toLocaleString()}
                    </p>
                    <ChevronRight className="w-4 h-4 text-[#D0D2DA] group-hover:text-[#8C8FA3] shrink-0" />
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
