import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Image } from 'expo-image';
import { Ionicons } from '@expo/vector-icons';

export interface Badge { text: string; color: string; }

export interface MetaItem {
  /** Жижиг тэмдэг, ж нь "12 борлуулалт". */
  label: string;
  icon?: keyof typeof Ionicons.glyphMap;
  color?: string;
}

interface Props {
  title: string;
  subtitle?: string | null;
  rightText?: string | null;
  rightSubtext?: string | null;
  badge?: Badge | null;
  /** Гарчгийн доор гарах жижиг тоон мэдээлэл. Жагсаалт хоосон харагдахаас сэргийлнэ. */
  meta?: (MetaItem | null | false | undefined)[];
  /** Зүүн ирмэг дэх өнгөт зурвас — төлөв ялгахад. */
  accentColor?: string | null;
  icon?: keyof typeof Ionicons.glyphMap;
  iconColor?: string;
  imageUrl?: string | null;
  onPress?: () => void;
  onLongPress?: () => void;
  chevron?: boolean;
  /** Идэвхгүй бичлэгийг бүдэг харуулна. */
  dimmed?: boolean;
}

export function ListCard({
  title, subtitle, rightText, rightSubtext, badge, meta, accentColor, icon, iconColor = '#007AFF',
  imageUrl, onPress, onLongPress, chevron = true, dimmed = false,
}: Props) {
  const metaItems = (meta ?? []).filter(Boolean) as MetaItem[];
  const Container: any = onPress || onLongPress ? TouchableOpacity : View;
  return (
    <Container
      onPress={onPress}
      onLongPress={onLongPress}
      activeOpacity={0.6}
      style={[s.card, dimmed && s.dimmed]}
    >
      {accentColor ? <View style={[s.accent, { backgroundColor: accentColor }]} /> : null}
      <View style={s.row}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={s.image} contentFit="cover" cachePolicy="disk" />
        ) : icon ? (
          <View style={[s.iconWrap, { backgroundColor: `${iconColor}15` }]}>
            <Ionicons name={icon} size={20} color={iconColor} />
          </View>
        ) : null}

        <View style={{ flex: 1, minWidth: 0 }}>
          <View style={s.titleRow}>
            <Text style={s.title} numberOfLines={1}>{title}</Text>
            {badge ? (
              <View style={[s.badge, { backgroundColor: `${badge.color}18` }]}>
                <Text style={[s.badgeText, { color: badge.color }]}>{badge.text}</Text>
              </View>
            ) : null}
          </View>
          {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
          {metaItems.length > 0 ? (
            <View style={s.metaRow}>
              {metaItems.map((m, i) => (
                <View key={i} style={s.metaChip}>
                  {m.icon ? <Ionicons name={m.icon} size={11} color={m.color ?? '#8E8E93'} /> : null}
                  <Text style={[s.metaText, m.color ? { color: m.color } : null]}>{m.label}</Text>
                </View>
              ))}
            </View>
          ) : null}
        </View>

        {rightText ? (
          <View style={{ alignItems: 'flex-end', marginLeft: 8 }}>
            <Text style={s.rightText}>{rightText}</Text>
            {rightSubtext ? <Text style={s.rightSubtext}>{rightSubtext}</Text> : null}
          </View>
        ) : null}

        {onPress && chevron ? (
          <Ionicons name="chevron-forward" size={18} color="#C7C7CC" style={{ marginLeft: 6 }} />
        ) : null}
      </View>
    </Container>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: '#fff', borderRadius: 14, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 8, borderWidth: 1, borderColor: '#E8ECF0', overflow: 'hidden' },
  dimmed: { opacity: 0.55 },
  accent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  metaRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 6 },
  metaChip: { flexDirection: 'row', alignItems: 'center', gap: 3, backgroundColor: '#F2F4F7', borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  metaText: { fontSize: 11, fontWeight: '600', color: '#6B7280' },
  image: { width: 44, height: 44, borderRadius: 10 },
  iconWrap: { width: 42, height: 42, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  title: { flex: 1, fontSize: 15, fontWeight: '600', color: '#1C1C1E' },
  subtitle: { fontSize: 12, color: '#8E8E93', marginTop: 2 },
  badge: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  badgeText: { fontSize: 10, fontWeight: '700' },
  rightText: { fontSize: 15, fontWeight: '700', color: '#1C1C1E' },
  rightSubtext: { fontSize: 11, color: '#8E8E93', marginTop: 1 },
});
