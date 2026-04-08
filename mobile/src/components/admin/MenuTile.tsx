import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet, Dimensions } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

const { width } = Dimensions.get('window');
const TILE_SIZE = (width - 12 * 2 - 10 * 2) / 3; // 3 columns, 12px edge, 10px gap

interface Props {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color?: string;
  badge?: string | number;
  onPress: () => void;
}

export function MenuTile({ icon, label, color = '#007AFF', badge, onPress }: Props) {
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.7} style={[s.tile, { width: TILE_SIZE }]}>
      <View style={[s.iconWrap, { backgroundColor: `${color}15` }]}>
        <Ionicons name={icon} size={24} color={color} />
        {badge !== undefined && badge !== null && badge !== '' && Number(badge) > 0 ? (
          <View style={s.badge}>
            <Text style={s.badgeText}>{typeof badge === 'number' && badge > 99 ? '99+' : badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={s.label} numberOfLines={2}>{label}</Text>
    </TouchableOpacity>
  );
}

const s = StyleSheet.create({
  tile: { backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#E8ECF0', marginBottom: 10 },
  iconWrap: { width: 52, height: 52, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8, position: 'relative' },
  badge: { position: 'absolute', top: -4, right: -4, minWidth: 18, height: 18, borderRadius: 9, backgroundColor: '#FF3B30', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 5, borderWidth: 2, borderColor: '#fff' },
  badgeText: { fontSize: 9, fontWeight: '700', color: '#fff' },
  label: { fontSize: 11, fontWeight: '600', color: '#1C1C1E', textAlign: 'center', lineHeight: 14 },
});
