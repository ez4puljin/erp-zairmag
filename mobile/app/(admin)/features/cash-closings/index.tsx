import React from 'react';
import { AdminListScreen, ListCard } from '@/src/components/admin';
import { formatCurrency, formatDate } from '@/src/lib/format';
import type { CashClosing } from '@/src/types';

export default function CashClosingsScreen() {
  return (
    <AdminListScreen<CashClosing>
      title="Мөнгөн хаалт"
      endpoint="/api/cash-closings"
      searchable={false}
      createRoute="/(admin)/features/cash-closings/new"
      emptyIcon="cash-outline"
      emptyTitle="Хаалт байхгүй"
      renderItem={(c: any) => (
        <ListCard
          icon="cash-outline"
          iconColor="#A855F7"
          title={formatDate(c.closingDate)}
          subtitle={`Орлого: ${formatCurrency(c.totalCashIn)} · Зарлага: ${formatCurrency(c.totalCashOut)}`}
          rightText={formatCurrency(c.closingBalance)}
          chevron={false}
        />
      )}
    />
  );
}
