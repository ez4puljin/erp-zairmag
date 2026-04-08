import { Stack } from 'expo-router';
import React from 'react';

export default function OrdersLayout() {
  return (
    <Stack
      screenOptions={{
        headerStyle: {
          backgroundColor: '#ffffff',
        },
        headerTitleStyle: {
          fontSize: 18,
          fontWeight: '700',
          color: '#111827',
        },
        headerShadowVisible: false,
      }}
    >
      <Stack.Screen
        name="index"
        options={{ title: 'Захиалга' }}
      />
      <Stack.Screen
        name="[id]"
        options={{ title: 'Захиалгын дэлгэрэнгүй' }}
      />
    </Stack>
  );
}
