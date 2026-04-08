import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard } from '@/src/components/admin';
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
      renderItem={(c) => (
        <ListCard
          icon="storefront-outline"
          iconColor="#EC4899"
          title={c.storeName}
          subtitle={`${c.contactName} · ${formatPhone(c.phone)}`}
          rightText={Number(c.outstandingDebt) > 0 ? formatCurrency(c.outstandingDebt) : undefined}
          rightSubtext={Number(c.outstandingDebt) > 0 ? 'өр' : undefined}
          badge={c.pricingTier !== 'STANDARD' ? { text: PRICING_TIER_LABELS[c.pricingTier] || c.pricingTier, color: '#FF9500' } : null}
          onPress={() => router.push(`/(admin)/features/customers/${c.id}` as any)}
        />
      )}
    />
  );
}
