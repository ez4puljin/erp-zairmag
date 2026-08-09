import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export interface SummaryStat {
  label: string;
  value: string | number;
  color?: string;
}

/**
 * Жагсаалтын дээд талын нягт хураангуй зурвас.
 *
 * StatCard нь том, өнгөт тул 2-3 үзүүлэлтэд тохирдог. Харин жагсаалтын
 * толгойд зөвхөн тоо баримт хэрэгтэй байдаг — энэ нь бага зай эзэлж,
 * дэлгэц хоосон харагдахаас сэргийлнэ.
 */
export function ListSummary({ stats }: { stats: (SummaryStat | null | false | undefined)[] }) {
  const items = stats.filter(Boolean) as SummaryStat[];
  if (items.length === 0) return null;

  return (
    <View style={s.bar}>
      {items.map((stat, i) => (
        <React.Fragment key={stat.label}>
          {i > 0 ? <View style={s.divider} /> : null}
          <View style={s.cell}>
            <Text style={[s.value, stat.color ? { color: stat.color } : null]} numberOfLines={1}>
              {stat.value}
            </Text>
            <Text style={s.label} numberOfLines={1}>{stat.label}</Text>
          </View>
        </React.Fragment>
      ))}
    </View>
  );
}

const s = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    paddingVertical: 12,
    marginBottom: 10,
  },
  cell: { flex: 1, alignItems: 'center', paddingHorizontal: 6 },
  divider: { width: StyleSheet.hairlineWidth, alignSelf: 'stretch', backgroundColor: '#E8ECF0', marginVertical: 4 },
  value: { fontSize: 19, fontWeight: '800', color: '#1C1C1E', fontVariant: ['tabular-nums'] },
  label: { fontSize: 11, fontWeight: '600', color: '#8E8E93', marginTop: 2, letterSpacing: 0.2 },
});
