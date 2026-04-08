import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  message: string;
  onRetry?: () => void;
}

export function ErrorState({ message, onRetry }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.iconWrap}>
        <Ionicons name="alert-circle" size={36} color="#FF3B30" />
      </View>
      <Text style={s.title}>Алдаа гарлаа</Text>
      <Text style={s.message}>{message}</Text>
      {onRetry ? (
        <TouchableOpacity style={s.btn} onPress={onRetry}>
          <Ionicons name="refresh" size={16} color="#007AFF" />
          <Text style={s.btnText}>Дахин оролдох</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#FF3B3012', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 4, textAlign: 'center' },
  message: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 16 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#007AFF15', borderRadius: 12, paddingHorizontal: 18, paddingVertical: 10 },
  btnText: { fontSize: 14, fontWeight: '600', color: '#007AFF' },
});
