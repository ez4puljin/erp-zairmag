import React from 'react';
import { AdminListScreen, ListCard } from '@/src/components/admin';
import { formatCurrency, formatDateTime, paymentLabel, PAYMENT_COLORS } from '@/src/lib/format';
import type { Payment } from '@/src/types';

export default function PaymentsListScreen() {
  return (
    <AdminListScreen<Payment>
      title="Төлбөр"
      endpoint="/api/payments"
      searchPlaceholder="Харилцагч, дүн..."
      createRoute="/(admin)/features/payments/new"
      emptyIcon="card-outline"
      emptyTitle="Төлбөр байхгүй"
      renderItem={(p: any) => (
        <ListCard
          icon="card-outline"
          iconColor={PAYMENT_COLORS[p.method] || '#007AFF'}
          title={p.customer?.storeName || 'Харилцагч'}
          subtitle={`${formatDateTime(p.createdAt)} · ${paymentLabel(p.method)}`}
          rightText={formatCurrency(p.amount)}
          rightSubtext={p.status === 'COMPLETED' ? '✓' : p.status}
          chevron={false}
        />
      )}
    />
  );
}
