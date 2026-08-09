import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard, ListSummary } from '@/src/components/admin';
import { formatPhone } from '@/src/lib/format';
import type { Supplier } from '@/src/types';

export default function SuppliersListScreen() {
  return (
    <AdminListScreen<Supplier>
      title="Нийлүүлэгч"
      endpoint="/api/suppliers"
      searchPlaceholder="Нийлүүлэгч хайх..."
      createRoute="/(admin)/features/suppliers/new"
      emptyIcon="business-outline"
      emptyTitle="Нийлүүлэгч байхгүй"
      headerSummary={(items) => (
        <ListSummary stats={[{ label: 'Нийлүүлэгч', value: items.length }]} />
      )}
      renderItem={(sup) => (
        <ListCard
          icon="business-outline"
          iconColor="#A855F7"
          title={sup.name}
          subtitle={[sup.contactName, formatPhone(sup.phone || '')].filter(Boolean).join(' · ')}
          meta={[
            (sup as any).email ? { label: (sup as any).email, icon: 'mail-outline' as const } : null,
          ]}
          onPress={() => router.push(`/(admin)/features/suppliers/edit/${sup.id}` as any)}
        />
      )}
    />
  );
}
