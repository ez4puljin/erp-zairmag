import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';

interface Props {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  hideBack?: boolean;
  rightIcon?: keyof typeof Ionicons.glyphMap;
  rightLabel?: string;
  onRightPress?: () => void;
  rightDisabled?: boolean;
}

export function ScreenHeader({ title, subtitle, onBack, hideBack, rightIcon, rightLabel, onRightPress, rightDisabled }: Props) {
  const insets = useSafeAreaInsets();
  const handleBack = () => {
    if (onBack) return onBack();
    if (router.canGoBack()) router.back();
  };

  return (
    <View style={[s.header, { paddingTop: insets.top + 8 }]}>
      <View style={s.row}>
        {!hideBack ? (
          <TouchableOpacity onPress={handleBack} style={s.backBtn} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
            <Ionicons name="chevron-back" size={26} color="#007AFF" />
          </TouchableOpacity>
        ) : <View style={s.backBtn} />}

        <View style={s.titleWrap}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>

        {(rightIcon || rightLabel) ? (
          <TouchableOpacity
            onPress={onRightPress}
            disabled={rightDisabled}
            style={[s.rightBtn, rightDisabled && { opacity: 0.4 }]}
            hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          >
            {rightIcon ? <Ionicons name={rightIcon} size={22} color="#007AFF" /> : null}
            {rightLabel ? <Text style={s.rightLabel}>{rightLabel}</Text> : null}
          </TouchableOpacity>
        ) : <View style={s.rightBtn} />}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  header: { backgroundColor: '#fff', borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0', paddingBottom: 12 },
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 8 },
  backBtn: { width: 44, height: 38, justifyContent: 'center', alignItems: 'center' },
  titleWrap: { flex: 1, alignItems: 'center' },
  title: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 12, color: '#8E8E93', marginTop: 1 },
  rightBtn: { minWidth: 44, height: 38, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 8, flexDirection: 'row', gap: 4 },
  rightLabel: { fontSize: 15, color: '#007AFF', fontWeight: '600' },
});
