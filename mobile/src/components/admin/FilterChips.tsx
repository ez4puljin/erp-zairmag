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
  // Filter out options with empty labels
  const validOptions = options.filter(o => o.label && o.label.trim());

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={s.wrap}
    >
      {validOptions.map(opt => {
        const active = opt.value === value;
        const color = opt.color || '#007AFF';
        return (
          <TouchableOpacity
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[s.chip, active && { backgroundColor: color, borderColor: color }]}
            activeOpacity={0.7}
          >
            <Text style={[s.text, active && { color: '#fff' }]} numberOfLines={1}>
              {opt.label}
            </Text>
          </TouchableOpacity>
        );
      })}
    </ScrollView>
  );
}

const s = StyleSheet.create({
  wrap: { gap: 6, paddingHorizontal: 12, paddingVertical: 8, alignItems: 'center' },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F2F4F7',
    borderWidth: 1.5,
    borderColor: '#E8ECF0',
    height: 36,
    justifyContent: 'center',
  },
  text: { fontSize: 13, fontWeight: '600', color: '#4A4D5C' },
});
