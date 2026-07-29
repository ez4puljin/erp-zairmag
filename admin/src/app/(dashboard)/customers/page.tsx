'use client';

import { useState, useEffect } from 'react';
import api from '@/lib/api';
import Link from 'next/link';
import { Users, ChevronRight, ChevronLeft, Plus } from 'lucide-react';
import { ErrorBanner } from '@/components/shared/error-banner';
import { PageHeader } from '@/components/shared/page-header';
import { SectionCard } from '@/components/shared/section-card';
import { FilterBar, SearchField } from '@/components/shared/filter-bar';
import { EmptyState } from '@/components/shared/empty-state';
import { formatMnt } from '@/components/shared/money';

const tierConfig: Record<string, { label: string; bg: string; text: string }> = {
  STANDARD: { label: 'Standard', bg: '#007AFF15', text: '#007AFF' },
  SILVER: { label: 'Silver', bg: '#8E8E9315', text: '#8E8E93' },
  GOLD: { label: 'Gold', bg: '#FF950015', text: '#FF9500' },
  PLATINUM: { label: 'Platinum', bg: '#AF52DE15', text: '#AF52DE' },
  VIP: { label: 'VIP', bg: '#FF2D5515', text: '#FF2D55' },
};

const avatarColors = ['#007AFF', '#34C759', '#FF9500', '#AF52DE', '#FF2D55', '#5AC8FA', '#5856D6'];

export default function CustomersPage() {
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [customers, setCustomers] = useState<any[]>([]);
  const [meta, setMeta] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = () => {
    setLoading(true);
    setError(null);
    const params: any = { page, limit: 10 };
    if (search.trim()) params.search = search.trim();
    api
      .get('/api/customers', { params })
      .then((res) => {
        setCustomers(res.data?.data ?? []);
        setMeta(res.data?.meta ?? null);
      })
      .catch((err) => {
        setError(err.response?.data?.message ?? 'Харилцагчдын жагсаалт ачааллахад алдаа гарлаа');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchCustomers();
  }, [page, search]);

  return (
    <div className="space-y-5 animate-ios-fade-in">
      <PageHeader
        title="Харилцагч"
        subtitle="Дэлгүүр, худалдан авагчдын жагсаалт"
        icon={Users}
        actions={
          <Link
            href="/customers/new"
            className="inline-flex items-center gap-1.5 h-9 px-4 rounded-xl text-[13px] font-semibold text-white bg-[#007AFF] shadow-sm shadow-[#007AFF]/25 hover:brightness-105 transition-all active:scale-[0.97]"
          >
            <Plus className="w-4 h-4" /> Бүртгэл нэмэх
          </Link>
        }
      />

      {/* Search */}
      <FilterBar>
        <SearchField
          value={search}
          onChange={(v) => {
            setSearch(v);
            setPage(1);
          }}
          placeholder="Дэлгүүр хайх..."
          className="flex-1 min-w-[220px]"
        />
      </FilterBar>

      <ErrorBanner message={error} onDismiss={() => setError(null)} />

      {/* Customer List */}
      <SectionCard noPadding>
        {loading ? (
          <div className="divide-y divide-[#F2F4F7]">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="px-4 py-4 flex items-center gap-3 animate-pulse">
                <div className="w-11 h-11 rounded-full bg-[#F2F4F7]" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 w-32 bg-[#F2F4F7] rounded-lg" />
                  <div className="h-3 w-48 bg-[#F2F4F7] rounded-lg" />
                </div>
              </div>
            ))}
          </div>
        ) : customers.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Харилцагч олдсонгүй"
            hint="Хайлтаа өөрчлөх эсвэл шинэ бүртгэл нэмнэ үү"
          />
        ) : (
          <div className="divide-y divide-[#F2F4F7]">
            {customers.map((customer: any, i: number) => {
              const tier = tierConfig[customer.pricingTier] ?? tierConfig.STANDARD;
              const color = avatarColors[i % avatarColors.length];
              const isActive = customer.isActive !== undefined ? customer.isActive : !customer.deletedAt;
              return (
                <Link
                  key={customer.id}
                  href={`/customers/${customer.id}`}
                  className="flex items-center gap-3 px-4 py-3.5 hover:bg-[#F7F9FC] transition-colors group"
                >
                  {/* Avatar */}
                  <div className="relative shrink-0">
                    <div
                      className="w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-bold text-white"
                      style={{ background: `linear-gradient(135deg, ${color}, ${color}cc)` }}
                    >
                      {customer.storeName?.charAt(0)?.toUpperCase() ?? '?'}
                    </div>
                    <div
                      className={`absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white ${
                        isActive ? 'bg-[#34C759]' : 'bg-[#8C8FA3]'
                      }`}
                    />
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-[15px] font-semibold text-[#1A1D26] truncate">
                        {customer.storeName}
                      </p>
                      <span
                        className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold shrink-0"
                        style={{ backgroundColor: tier.bg, color: tier.text }}
                      >
                        {tier.label}
                      </span>
                      {customer.customerCategory?.name && (
                        <span className="inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold bg-[#FF9500]/10 text-[#FF9500] shrink-0">
                          {customer.customerCategory.name}
                        </span>
                      )}
                    </div>
                    <p className="text-[13px] text-[#8C8FA3] truncate">
                      {customer.contactName} · {customer.phone}
                    </p>
                  </div>

                  {/* Debt */}
                  <div className="text-right shrink-0">
                    {Number(customer.outstandingDebt ?? 0) > 0 ? (
                      <p className="text-[14px] font-semibold text-[#FF3B30] tabular-nums">
                        {formatMnt(customer.outstandingDebt)}
                      </p>
                    ) : (
                      <p className="text-[14px] font-medium text-[#34C759] tabular-nums">{formatMnt(0)}</p>
                    )}
                  </div>
                  <ChevronRight className="w-4 h-4 text-[#C7C7CC] shrink-0" />
                </Link>
              );
            })}
          </div>
        )}
      </SectionCard>

      {/* Pagination */}
      {meta && meta.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF0] flex items-center justify-center text-[#8C8FA3] hover:bg-[#F2F4F7] disabled:opacity-30 transition-all active:scale-95"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-[13px] font-medium text-[#8C8FA3] px-3">
            {page} / {meta.totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(meta.totalPages, p + 1))}
            disabled={page >= meta.totalPages}
            className="w-10 h-10 rounded-xl bg-white border border-[#E8ECF0] flex items-center justify-center text-[#8C8FA3] hover:bg-[#F2F4F7] disabled:opacity-30 transition-all active:scale-95"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
