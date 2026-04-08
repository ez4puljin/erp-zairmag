import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard } from '@/src/components/admin';
import { formatCurrency, formatDate } from '@/src/lib/format';
import type { Invoice } from '@/src/types';

export default function InvoicesListScreen() {
  return (
    <AdminListScreen<Invoice>
      title="Нэхэмжлэл"
      endpoint="/api/invoices"
      searchPlaceholder="Нэхэмжлэл хайх..."
      emptyIcon="receipt-outline"
      emptyTitle="Нэхэмжлэл байхгүй"
      renderItem={(inv: any) => (
        <ListCard
          icon="receipt-outline"
          iconColor="#AF52DE"
          title={`#${inv.invoiceNumber} ${inv.order?.customer?.storeName || ''}`}
          subtitle={`${formatDate(inv.issuedAt)} · Захиалга #${inv.order?.orderNumber || ''}`}
          rightText={formatCurrency(inv.totalAmount)}
          onPress={() => router.push(`/(admin)/features/invoices/${inv.id}` as any)}
        />
      )}
    />
  );
}
