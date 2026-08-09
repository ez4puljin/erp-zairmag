import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard, ListSummary } from '@/src/components/admin';
import { formatPhone } from '@/src/lib/format';
import type { Driver } from '@/src/types';

interface DriverRow extends Driver {
  truckLoadCount?: number;
  salesCount?: number;
}

export default function DriversListScreen() {
  return (
    <AdminListScreen<DriverRow>
      title="Жолооч"
      endpoint="/api/drivers"
      searchable={false}
      paginated={false}
      createRoute="/(admin)/features/drivers/new"
      emptyIcon="car-sport-outline"
      emptyTitle="Жолооч байхгүй"
      headerSummary={(items) => (
        <ListSummary
          stats={[
            { label: 'Нийт', value: items.length },
            { label: 'Идэвхтэй', value: items.filter(d => d.isActive !== false).length, color: '#34C759' },
            { label: 'Идэвхгүй', value: items.filter(d => d.isActive === false).length, color: '#8E8E93' },
          ]}
        />
      )}
      renderItem={(d) => {
        const active = d.isActive !== false;
        return (
          <ListCard
            icon="car-sport-outline"
            iconColor={active ? '#F59E0B' : '#8E8E93'}
            accentColor={active ? '#34C759' : '#C7C7CC'}
            dimmed={!active}
            title={`${d.lastName} ${d.firstName}`}
            subtitle={[formatPhone(d.phone || ''), d.email].filter(Boolean).join(' · ')}
            badge={active ? null : { text: 'Идэвхгүй', color: '#8E8E93' }}
            meta={[
              (d.salesCount ?? 0) > 0 && {
                label: `${d.salesCount} борлуулалт`,
                icon: 'receipt-outline' as const,
              },
              (d.truckLoadCount ?? 0) > 0 && {
                label: `${d.truckLoadCount} ачилт`,
                icon: 'cube-outline' as const,
              },
            ]}
            onPress={() => router.push(`/(admin)/features/drivers/edit/${d.id}` as any)}
          />
        );
      }}
    />
  );
}
