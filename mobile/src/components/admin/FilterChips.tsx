import React from 'react';
import { ScrollView, TouchableOpacity, Text, StyleSheet } from 'react-native';

export interface FilterOption {
  value: string;
  label: string;
  color?: string;
}

interface Props {
  options: FilterOption[];
  value: string;
  onChange: (value: string) => void;
}

export function FilterChips({ options, value, onChange }: Props) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.wrap}>
      {options.map(opt => {
        const active = opt.value === value;
        const color = opt.color || '#007AFF';
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[s.chip, active && { backgroundColor: color, borderColor: color }]}
          >
            <Text style={[s.text, active && { color: '#fff' }]}>{opt.label}</Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6, paddingHorizontal: 12, paddingVertical: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8ECF0' },
  text: { fontSize: 12, fontWeight: '600', color: '#4A4D5C' },
});
