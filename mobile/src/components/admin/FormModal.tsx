import React from 'react';
import { View, ScrollView, ActivityIndicator, StyleSheet, KeyboardAvoidingView, Platform, TouchableOpacity, Text } from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface Props {
  title: string;
  subtitle?: string;
  onCancel?: () => void;
  onSubmit: () => void | Promise<void>;
  submitting?: boolean;
  submitLabel?: string;
  submitDisabled?: boolean;
  children: React.ReactNode;
  errorMessage?: string | null;
}

export function FormModal({
  title, subtitle, onCancel, onSubmit, submitting, submitLabel = 'Хадгалах', submitDisabled, children, errorMessage,
}: Props) {
  const insets = useSafeAreaInsets();
  const handleCancel = () => { if (onCancel) return onCancel(); if (router.canGoBack()) router.back(); };

  return (
    <KeyboardAvoidingView
      style={s.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Header */}
      <View style={[s.header, { paddingTop: insets.top + 8 }]}>
        <TouchableOpacity onPress={handleCancel} hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}>
          <Text style={s.cancelText}>Цуцлах</Text>
        </TouchableOpacity>
        <View style={{ flex: 1, alignItems: 'center' }}>
          <Text style={s.title} numberOfLines={1}>{title}</Text>
          {subtitle ? <Text style={s.subtitle} numberOfLines={1}>{subtitle}</Text> : null}
        </View>
        <TouchableOpacity
          onPress={onSubmit}
          disabled={submitting || submitDisabled}
          hitSlop={{ top: 10, left: 10, bottom: 10, right: 10 }}
          style={(submitting || submitDisabled) && { opacity: 0.4 }}
        >
          {submitting ? <ActivityIndicator color="#007AFF" /> : <Text style={s.submitText}>{submitLabel}</Text>}
        </TouchableOpacity>
      </View>

      {/* Error banner */}
      {errorMessage ? (
        <View style={s.errorBanner}>
          <Ionicons name="alert-circle" size={16} color="#FF3B30" />
          <Text style={s.errorText}>{errorMessage}</Text>
        </View>
      ) : null}

      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingVertical: 12, paddingBottom: 40 }}
        keyboardShouldPersistTaps="handled"
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8ECF0',
  },
  title: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  subtitle: { fontSize: 11, color: '#8E8E93', marginTop: 1 },
  cancelText: { fontSize: 15, color: '#8E8E93' },
  submitText: { fontSize: 15, fontWeight: '700', color: '#007AFF' },
  errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#FF3B3012', padding: 12, marginHorizontal: 12, marginTop: 12, borderRadius: 10, borderWidth: 1, borderColor: '#FF3B3030' },
  errorText: { flex: 1, fontSize: 13, color: '#FF3B30', fontWeight: '500' },
});
