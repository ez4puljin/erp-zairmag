import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  icon?: keyof typeof Ionicons.glyphMap;
  title: string;
  message?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({ icon = 'cube-outline', title, message, actionLabel, onAction }: Props) {
  return (
    <View style={s.wrap}>
      <View style={s.iconWrap}>
        <Ionicons name={icon} size={36} color="#AEAEB2" />
      </View>
      <Text style={s.title}>{title}</Text>
      {message ? <Text style={s.message}>{message}</Text> : null}
      {actionLabel && onAction ? (
        <TouchableOpacity style={s.btn} onPress={onAction}>
          <Text style={s.btnText}>{actionLabel}</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', paddingVertical: 60, paddingHorizontal: 32 },
  iconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#F2F4F7', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: '#1C1C1E', marginBottom: 4, textAlign: 'center' },
  message: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 16 },
  btn: { backgroundColor: '#007AFF', borderRadius: 12, paddingHorizontal: 20, paddingVertical: 10, marginTop: 8 },
  btnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
