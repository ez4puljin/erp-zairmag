import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
  label: string;
  value: string | number;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
  gradient?: [string, string];
  subtitle?: string;
}

export function StatCard({ label, value, icon, color = '#007AFF', subtitle }: Props) {
  return (
    <View style={[s.card, { backgroundColor: `${color}10`, borderLeftColor: color }]}>
      <View style={s.row}>
        <View style={{ flex: 1 }}>
          <Text style={s.label}>{label}</Text>
          <Text style={[s.value, { color }]}>{value}</Text>
          {subtitle ? <Text style={s.subtitle}>{subtitle}</Text> : null}
        </View>
        {icon ? (
          <View style={[s.iconWrap, { backgroundColor: `${color}20` }]}>
            <Ionicons name={icon} size={20} color={color} />
          </View>
        ) : null}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  card: { borderRadius: 14, padding: 14, borderLeftWidth: 4 },
  row: { flexDirection: 'row', alignItems: 'center' },
  label: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3, textTransform: 'uppercase' },
  value: { fontSize: 20, fontWeight: '800', marginTop: 4 },
  subtitle: { fontSize: 11, color: '#8E8E93', marginTop: 2 },
  iconWrap: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
});
