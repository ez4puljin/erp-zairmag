import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';

interface Props { message?: string; }

export function LoadingState({ message = 'Ачааллаж байна...' }: Props) {
  return (
    <View style={s.wrap}>
      <ActivityIndicator size="large" color="#007AFF" />
      <Text style={s.text}>{message}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12 },
  text: { fontSize: 14, color: '#8E8E93' },
});
