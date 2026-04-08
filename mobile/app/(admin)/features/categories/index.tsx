import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard } from '@/src/components/admin';

export default function CategoriesScreen() {
  return (
    <AdminListScreen<any>
      title="Барааны ангилал"
      endpoint="/api/categories"
      paginated={false}
      searchable={false}
      createRoute="/(admin)/features/categories/new"
      emptyIcon="folder-outline"
      emptyTitle="Ангилал байхгүй"
      renderItem={(c) => (
        <ListCard
          icon="folder-outline"
          iconColor="#EAB308"
          title={c.name}
          onPress={() => router.push(`/(admin)/features/categories/edit/${c.id}` as any)}
        />
      )}
    />
  );
}
