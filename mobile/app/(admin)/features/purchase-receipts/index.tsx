import React from 'react';
import { router } from 'expo-router';
import { AdminListScreen, ListCard } from '@/src/components/admin';
import { formatCurrency, formatDate } from '@/src/lib/format';
import type { PurchaseReceipt } from '@/src/types';

export default function PurchaseReceiptsScreen() {
  return (
    <AdminListScreen<PurchaseReceipt>
      title="Бараа орлого"
      endpoint="/api/purchase-receipts"
      createRoute="/(admin)/features/purchase-receipts/new"
      emptyIcon="cart-outline"
      emptyTitle="Орлого байхгүй"
      renderItem={(r: any) => (
        <ListCard
          icon="cart-outline"
          iconColor="#14B8A6"
          title={`#${r.receiptNumber} ${r.supplier?.name || ''}`}
          subtitle={formatDate(r.receivedAt)}
          rightText={formatCurrency(r.totalAmount)}
          onPress={() => router.push(`/(admin)/features/purchase-receipts/${r.id}` as any)}
        />
      )}
    />
  );
}
