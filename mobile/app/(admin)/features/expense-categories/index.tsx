import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard } from '@/src/components/admin';

export default function ExpenseCategoriesScreen() {
  return (
    <AdminListScreen<any>
      title="Зардлын ангилал"
      endpoint="/api/expense-categories"
      paginated={false}
      searchable={false}
      createRoute="/(admin)/features/expense-categories/new"
      emptyIcon="pricetags-outline"
      emptyTitle="Ангилал байхгүй"
      renderItem={(c) => (
        <ListCard
          icon="pricetags-outline"
          iconColor="#FF9500"
          title={c.name}
          subtitle={c.description}
          onPress={() => router.push(`/(admin)/features/expense-categories/edit/${c.id}` as any)}
        />
      )}
    />
  );
}
