import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard } from '@/src/components/admin';
import { formatDate } from '@/src/lib/format';
import type { InventoryCount } from '@/src/types';

const STATUS_LABELS: Record<string, { label: string; color: string }> = {
  DRAFT: { label: 'Бэлдэж буй', color: '#FF9500' },
  FINALIZED: { label: 'Дууссан', color: '#34C759' },
  CANCELLED: { label: 'Цуцалсан', color: '#8E8E93' },
};

export default function InventoryCountsScreen() {
  return (
    <AdminListScreen<InventoryCount>
      title="Тооллого"
      endpoint="/api/inventory-counts"
      searchable={false}
      createRoute="/(admin)/features/inventory-counts/new"
      emptyIcon="clipboard-outline"
      emptyTitle="Тооллого байхгүй"
      renderItem={(c: any) => {
        const st = STATUS_LABELS[c.status] || STATUS_LABELS.DRAFT;
        return (
          <ListCard
            icon="clipboard-outline"
            iconColor="#5856D6"
            title={`#${c.countNumber}`}
            subtitle={formatDate(c.countDate)}
            badge={{ text: st.label, color: st.color }}
            onPress={() => router.push(`/(admin)/features/inventory-counts/${c.id}` as any)}
          />
        );
      }}
    />
  );
}
