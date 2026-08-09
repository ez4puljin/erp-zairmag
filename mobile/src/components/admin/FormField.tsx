import React, { useMemo, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet, Switch, Modal, ScrollView, Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

export type FieldType =
  | 'text'
  | 'number'
  | 'currency'
  | 'phone'
  | 'email'
  | 'textarea'
  | 'date'
  | 'select'
  | 'switch'
  | 'password';

export interface SelectOption {
  label: string;
  value: any;
}

interface Props {
  label: string;
  value: any;
  onChange: (value: any) => void;
  type?: FieldType;
  placeholder?: string;
  error?: string;
  required?: boolean;
  options?: SelectOption[];
  prefix?: string;
  suffix?: string;
  disabled?: boolean;
  multiline?: boolean;
  helperText?: string;
  /** Дэлгэц нээгдэхэд шууд гар гарч, бичихэд бэлэн болно. */
  autoFocus?: boolean;
}

export function FormField({
  label, value, onChange, type = 'text', placeholder, error, required, options, prefix, suffix, disabled, multiline, helperText, autoFocus,
}: Props) {
  const [selectOpen, setSelectOpen] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [selectQuery, setSelectQuery] = useState('');

  const displayValue = value !== null && value !== undefined ? String(value) : '';

  const selectedOption = type === 'select' ? options?.find(o => o.value === value) : null;

  // Сонголт олон үед гүйлгэж хайх нь удаан тул хайлтын мөр гаргана.
  const searchable = (options?.length ?? 0) > 8;
  const filteredOptions = useMemo(() => {
    const all = options ?? [];
    const q = selectQuery.trim().toLocaleLowerCase();
    // Агуулсанаар шүүнэ — эхлэлээр нь биш, дунднаас нь бичсэн ч олдоно.
    return q ? all.filter(o => String(o.label).toLocaleLowerCase().includes(q)) : all;
  }, [options, selectQuery]);

  const openSelect = () => { setSelectQuery(''); setSelectOpen(true); };
  const closeSelect = () => { setSelectOpen(false); setSelectQuery(''); };

  // SWITCH
  if (type === 'switch') {
    return (
      <View style={s.field}>
        <View style={s.switchRow}>
          <View style={{ flex: 1 }}>
            <Text style={s.label}>{label}{required ? ' *' : ''}</Text>
            {helperText ? <Text style={s.helper}>{helperText}</Text> : null}
          </View>
          <Switch value={!!value} onValueChange={onChange} disabled={disabled} trackColor={{ true: '#34C759', false: '#E8ECF0' }} />
        </View>
      </View>
    );
  }

  // SELECT
  if (type === 'select') {
    return (
      <View style={s.field}>
        <Text style={s.label}>{label}{required ? ' *' : ''}</Text>
        <TouchableOpacity
          style={[s.input, s.selectInput, error && s.errorBorder]}
          onPress={() => !disabled && openSelect()}
          disabled={disabled}
        >
          <Text style={[s.inputText, !selectedOption && s.placeholderText]}>
            {selectedOption?.label ?? placeholder ?? 'Сонгох...'}
          </Text>
          <Ionicons name="chevron-down" size={18} color="#8E8E93" />
        </TouchableOpacity>
        {error ? <Text style={s.errorText}>{error}</Text> : helperText ? <Text style={s.helper}>{helperText}</Text> : null}

        <Modal visible={selectOpen} transparent animationType="slide" onRequestClose={closeSelect}>
          <TouchableOpacity style={s.modalOverlay} activeOpacity={1} onPress={closeSelect}>
            <TouchableOpacity activeOpacity={1} style={s.modalSheet} onPress={e => e.stopPropagation()}>
              <View style={s.modalHeader}>
                <Text style={s.modalTitle}>{label}</Text>
                <TouchableOpacity onPress={closeSelect}>
                  <Ionicons name="close" size={24} color="#8E8E93" />
                </TouchableOpacity>
              </View>
              {searchable ? (
                <View style={s.searchBox}>
                  <Ionicons name="search" size={16} color="#8E8E93" />
                  <TextInput
                    style={s.searchInput}
                    value={selectQuery}
                    onChangeText={setSelectQuery}
                    placeholder="Хайх..."
                    placeholderTextColor="#AEAEB2"
                    autoCorrect={false}
                    autoCapitalize="none"
                  />
                  {selectQuery ? (
                    <TouchableOpacity onPress={() => setSelectQuery('')} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}>
                      <Ionicons name="close-circle" size={16} color="#C7C7CC" />
                    </TouchableOpacity>
                  ) : null}
                </View>
              ) : null}
              <ScrollView style={{ maxHeight: 400 }} keyboardShouldPersistTaps="handled">
                {filteredOptions.length === 0 ? (
                  <Text style={s.noResult}>Олдсонгүй</Text>
                ) : filteredOptions.map(opt => (
                  <TouchableOpacity
                    key={String(opt.value)}
                    style={[s.optionRow, value === opt.value && s.optionRowSelected]}
                    onPress={() => { onChange(opt.value); closeSelect(); }}
                  >
                    <Text style={[s.optionText, value === opt.value && s.optionTextSelected]}>{opt.label}</Text>
                    {value === opt.value ? <Ionicons name="checkmark" size={20} color="#007AFF" /> : null}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      </View>
    );
  }

  // TEXT / NUMBER / CURRENCY / PHONE / EMAIL / PASSWORD / TEXTAREA / DATE
  const keyboardType =
    type === 'number' || type === 'currency' ? 'number-pad' :
    type === 'phone' ? 'phone-pad' :
    type === 'email' ? 'email-address' : 'default';

  const secureTextEntry = type === 'password' && !showPassword;

  return (
    <View style={s.field}>
      <Text style={s.label}>{label}{required ? ' *' : ''}</Text>
      <View style={[s.input, (multiline || type === 'textarea') && s.inputMulti, error && s.errorBorder]}>
        {prefix ? <Text style={s.affix}>{prefix}</Text> : null}
        <TextInput
          style={[s.textInput, (multiline || type === 'textarea') && s.textInputMulti]}
          value={displayValue}
          onChangeText={(text) => {
            if (type === 'number' || type === 'currency') {
              const cleaned = text.replace(/[^\d.-]/g, '');
              onChange(cleaned === '' ? '' : cleaned);
            } else {
              onChange(text);
            }
          }}
          placeholder={placeholder}
          placeholderTextColor="#AEAEB2"
          keyboardType={keyboardType as any}
          secureTextEntry={secureTextEntry}
          autoCapitalize={type === 'email' ? 'none' : 'sentences'}
          autoCorrect={type !== 'email'}
          editable={!disabled}
          autoFocus={autoFocus}
          multiline={multiline || type === 'textarea'}
          numberOfLines={type === 'textarea' ? 4 : 1}
        />
        {suffix ? <Text style={s.affix}>{suffix}</Text> : null}
        {type === 'password' ? (
          <TouchableOpacity onPress={() => setShowPassword(v => !v)} hitSlop={{ top: 8, left: 8, bottom: 8, right: 8 }}>
            <Ionicons name={showPassword ? 'eye-off' : 'eye'} size={18} color="#8E8E93" />
          </TouchableOpacity>
        ) : null}
      </View>
      {error ? <Text style={s.errorText}>{error}</Text> : helperText ? <Text style={s.helper}>{helperText}</Text> : null}
    </View>
  );
}

const s = StyleSheet.create({
  field: { marginHorizontal: 12, marginBottom: 12 },
  label: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3, marginBottom: 6, textTransform: 'uppercase' },
  input: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', borderWidth: 1, borderColor: '#E8ECF0', borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8,
  },
  inputMulti: { minHeight: 90, alignItems: 'flex-start', paddingVertical: 12 },
  selectInput: { justifyContent: 'space-between' },
  textInput: { flex: 1, fontSize: 15, color: '#1C1C1E', padding: 0 },
  textInputMulti: { minHeight: 70, textAlignVertical: 'top' },
  inputText: { fontSize: 15, color: '#1C1C1E' },
  placeholderText: { color: '#AEAEB2' },
  affix: { fontSize: 15, color: '#8E8E93', fontWeight: '500' },
  errorBorder: { borderColor: '#FF3B30' },
  errorText: { fontSize: 11, color: '#FF3B30', marginTop: 4, marginLeft: 2 },
  helper: { fontSize: 11, color: '#8E8E93', marginTop: 4, marginLeft: 2 },
  switchRow: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#E8ECF0' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, paddingBottom: 30, maxHeight: '70%' },
  modalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#E8ECF0' },
  modalTitle: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  searchBox: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    marginHorizontal: 16, marginTop: 12, paddingHorizontal: 12, height: 40,
    borderRadius: 10, backgroundColor: '#F2F2F7',
  },
  searchInput: { flex: 1, fontSize: 15, color: '#1C1C1E', padding: 0 },
  noResult: { fontSize: 14, color: '#8E8E93', textAlign: 'center', paddingVertical: 28 },
  optionRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#F2F2F7' },
  optionRowSelected: { backgroundColor: '#007AFF08' },
  optionText: { fontSize: 15, color: '#1C1C1E' },
  optionTextSelected: { fontWeight: '600', color: '#007AFF' },
});
