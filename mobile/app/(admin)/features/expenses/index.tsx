import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard } from '@/src/components/admin';
import { formatCurrency, formatDate, paymentLabel } from '@/src/lib/format';
import type { Expense } from '@/src/types';

export default function ExpensesListScreen() {
  return (
    <AdminListScreen<Expense>
      title="Зардал"
      endpoint="/api/expenses"
      searchPlaceholder="Зардал хайх..."
      createRoute="/(admin)/features/expenses/new"
      emptyIcon="wallet-outline"
      emptyTitle="Зардал бүртгэгдээгүй"
      renderItem={(ex: any) => (
        <ListCard
          icon="wallet-outline"
          iconColor="#FF3B30"
          title={ex.description}
          subtitle={`${formatDate(ex.date)} · ${ex.category?.name || ''} ${ex.paymentMethod ? '· ' + paymentLabel(ex.paymentMethod) : ''}`}
          rightText={formatCurrency(ex.amount)}
          onPress={() => router.push(`/(admin)/features/expenses/edit/${ex.id}` as any)}
        />
      )}
    />
  );
}
