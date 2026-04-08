import { Stack } from 'expo-router';

export default function FeaturesLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        contentStyle: { backgroundColor: '#F5F6FA' },
      }}
    >
      {/* Default: push presentation */}
      {/* Modal screens - create/edit forms */}
      <Stack.Screen name="customers/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="customers/edit/[id]" options={{ presentation: 'modal' }} />

      <Stack.Screen name="suppliers/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="suppliers/edit/[id]" options={{ presentation: 'modal' }} />

      <Stack.Screen name="products/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="products/edit/[id]" options={{ presentation: 'modal' }} />

      <Stack.Screen name="inventory/adjust/[productId]" options={{ presentation: 'modal' }} />
      <Stack.Screen name="inventory/restock" options={{ presentation: 'modal' }} />

      <Stack.Screen name="inventory-counts/new" options={{ presentation: 'modal' }} />

      <Stack.Screen name="purchase-receipts/new" options={{ presentation: 'modal' }} />

      <Stack.Screen name="payments/new" options={{ presentation: 'modal' }} />

      <Stack.Screen name="expenses/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="expenses/edit/[id]" options={{ presentation: 'modal' }} />

      <Stack.Screen name="supplier-payables/new" options={{ presentation: 'modal' }} />

      <Stack.Screen name="cash-closings/new" options={{ presentation: 'modal' }} />

      <Stack.Screen name="categories/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="categories/edit/[id]" options={{ presentation: 'modal' }} />

      <Stack.Screen name="customer-categories/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="customer-categories/edit/[id]" options={{ presentation: 'modal' }} />

      <Stack.Screen name="expense-categories/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="expense-categories/edit/[id]" options={{ presentation: 'modal' }} />

      <Stack.Screen name="drivers/new" options={{ presentation: 'modal' }} />
      <Stack.Screen name="drivers/edit/[id]" options={{ presentation: 'modal' }} />
    </Stack>
  );
}
