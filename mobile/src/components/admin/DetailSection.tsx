import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface SectionProps {
  title?: string;
  children: React.ReactNode;
  style?: any;
}

export function DetailSection({ title, children, style }: SectionProps) {
  return (
    <View style={[s.section, style]}>
      {title ? <Text style={s.sectionTitle}>{title}</Text> : null}
      <View style={s.card}>{children}</View>
    </View>
  );
}

interface RowProps {
  label: string;
  value?: string | number | null;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  onPress?: () => void;
  valueColor?: string;
  bold?: boolean;
  last?: boolean;
}

export function DetailRow({ label, value, icon, iconColor = '#8E8E93', onPress, valueColor, bold, last }: RowProps) {
  const Container: any = onPress ? TouchableOpacity : View;
  return (
    <Container onPress={onPress} activeOpacity={0.7} style={[s.row, !last && s.rowBorder]}>
      {icon ? (
        <View style={[s.iconWrap, { backgroundColor: `${iconColor}15` }]}>
          <Ionicons name={icon} size={16} color={iconColor} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <Text style={s.label}>{label}</Text>
      </View>
      {value !== undefined && value !== null ? (
        <Text style={[s.value, bold && s.bold, valueColor && { color: valueColor }]} numberOfLines={2}>
          {value}
        </Text>
      ) : null}
      {onPress ? <Ionicons name="chevron-forward" size={16} color="#C7C7CC" style={{ marginLeft: 6 }} /> : null}
    </Container>
  );
}

const s = StyleSheet.create({
  section: { marginTop: 16, marginHorizontal: 12 },
  sectionTitle: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 8, marginLeft: 4, textTransform: 'uppercase' },
  card: { backgroundColor: '#fff', borderRadius: 14, borderWidth: 1, borderColor: '#E8ECF0', overflow: 'hidden' },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 13, gap: 10 },
  rowBorder: { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  iconWrap: { width: 28, height: 28, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  label: { fontSize: 14, color: '#8E8E93' },
  value: { fontSize: 14, color: '#1C1C1E', maxWidth: '55%', textAlign: 'right' },
  bold: { fontWeight: '700' },
});
