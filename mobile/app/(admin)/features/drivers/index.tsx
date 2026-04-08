import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard } from '@/src/components/admin';
import { formatPhone } from '@/src/lib/format';
import type { Driver } from '@/src/types';

export default function DriversListScreen() {
  return (
    <AdminListScreen<Driver>
      title="Жолооч"
      endpoint="/api/drivers"
      searchable={false}
      paginated={false}
      createRoute="/(admin)/features/drivers/new"
      emptyIcon="car-sport-outline"
      emptyTitle="Жолооч байхгүй"
      renderItem={(d) => (
        <ListCard
          icon="car-sport-outline"
          iconColor="#F59E0B"
          title={`${d.lastName} ${d.firstName}`}
          subtitle={[formatPhone(d.phone || ''), d.email].filter(Boolean).join(' · ')}
          badge={d.isActive ? null : { text: 'Идэвхгүй', color: '#8E8E93' }}
          onPress={() => router.push(`/(admin)/features/drivers/edit/${d.id}` as any)}
        />
      )}
    />
  );
}
