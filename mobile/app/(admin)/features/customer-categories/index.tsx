import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard } from '@/src/components/admin';

export default function CustomerCategoriesScreen() {
  return (
    <AdminListScreen<any>
      title="Харилцагчийн бүс нутаг"
      endpoint="/api/customer-categories"
      paginated={false}
      searchable={false}
      createRoute="/(admin)/features/customer-categories/new"
      emptyIcon="map-outline"
      emptyTitle="Бүс нутаг байхгүй"
      renderItem={(c) => (
        <ListCard
          icon="map-outline"
          iconColor="#F97316"
          title={c.name}
          subtitle={c.type === 'KHOROO' ? 'Хороо' : 'Сум'}
          onPress={() => router.push(`/(admin)/features/customer-categories/edit/${c.id}` as any)}
        />
      )}
    />
  );
}
