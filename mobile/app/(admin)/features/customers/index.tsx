import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard, ListSummary } from '@/src/components/admin';
import { formatCurrency, formatPhone, PRICING_TIER_LABELS } from '@/src/lib/format';
import type { Customer } from '@/src/types';

export default function CustomersListScreen() {
  return (
    <AdminListScreen<Customer>
      title="Харилцагч"
      endpoint="/api/customers"
      searchable
      searchPlaceholder="Дэлгүүр, утас хайх..."
      createRoute="/(admin)/features/customers/new"
      emptyIcon="people-outline"
      emptyTitle="Харилцагч байхгүй"
      emptyMessage="Шинэ харилцагч нэмж эхлээрэй"
      headerSummary={(items) => {
        const debtors = items.filter(c => Number(c.outstandingDebt) > 0);
        const totalDebt = debtors.reduce((s, c) => s + Number(c.outstandingDebt ?? 0), 0);
        return (
          <ListSummary
            stats={[
              { label: 'Харилцагч', value: items.length },
              { label: 'Өртэй', value: debtors.length, color: debtors.length > 0 ? '#FF3B30' : undefined },
              { label: 'Нийт өр', value: formatCurrency(totalDebt), color: '#FF3B30' },
            ]}
          />
        );
      }}
      renderItem={(c) => {
        const debt = Number(c.outstandingDebt ?? 0);
        return (
          <ListCard
            icon="storefront-outline"
            iconColor="#EC4899"
            accentColor={debt > 0 ? '#FF3B30' : null}
            title={c.storeName}
            subtitle={`${c.contactName} · ${formatPhone(c.phone)}`}
            rightText={debt > 0 ? formatCurrency(debt) : undefined}
            rightSubtext={debt > 0 ? 'өр' : undefined}
            badge={c.pricingTier !== 'STANDARD' ? { text: PRICING_TIER_LABELS[c.pricingTier] || c.pricingTier, color: '#FF9500' } : null}
            meta={[
              c.address ? { label: c.address, icon: 'location-outline' as const } : null,
            ]}
            onPress={() => router.push(`/(admin)/features/customers/${c.id}` as any)}
          />
        );
      }}
    />
  );
}
