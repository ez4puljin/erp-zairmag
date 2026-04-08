import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, TextInput, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { formatDate } from '../../lib/format';

interface Props {
  from: string; // ISO yyyy-mm-dd
  to: string;
  onChange: (from: string, to: string) => void;
}

function isoDate(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function applyPreset(preset: string): { from: string; to: string } {
  const now = new Date();
  const to = isoDate(now);
  const start = new Date(now);
  if (preset === 'today') {}
  else if (preset === '7d') start.setDate(start.getDate() - 6);
  else if (preset === '30d') start.setDate(start.getDate() - 29);
  else if (preset === 'month') { start.setDate(1); }
  else if (preset === 'year') { start.setMonth(0); start.setDate(1); }
  return { from: isoDate(start), to };
}

export function DateRangePicker({ from, to, onChange }: Props) {
  const [open, setOpen] = useState(false);
  const [localFrom, setLocalFrom] = useState(from);
  const [localTo, setLocalTo] = useState(to);

  const presets = [
    { key: 'today', label: 'Өнөөдөр' },
    { key: '7d', label: '7 хоног' },
    { key: '30d', label: '30 хоног' },
    { key: 'month', label: 'Энэ сар' },
    { key: 'year', label: 'Энэ жил' },
  ];

  const handleApply = () => {
    onChange(localFrom, localTo);
    setOpen(false);
  };

  return (
    <>
      <TouchableOpacity style={s.trigger} onPress={() => { setLocalFrom(from); setLocalTo(to); setOpen(true); }}>
        <Ionicons name="calendar-outline" size={16} color="#007AFF" />
        <Text style={s.triggerText}>
          {from && to ? `${formatDate(from)} — ${formatDate(to)}` : 'Огноо сонгох'}
        </Text>
        <Ionicons name="chevron-down" size={16} color="#8E8E93" />
      </TouchableOpacity>

      <Modal visible={open} transparent animationType="slide">
        <TouchableOpacity style={s.overlay} activeOpacity={1} onPress={() => setOpen(false)}>
          <TouchableOpacity activeOpacity={1} style={s.sheet} onPress={e => e.stopPropagation()}>
            <View style={s.header}>
              <Text style={s.title}>Огноо сонгох</Text>
              <TouchableOpacity onPress={() => setOpen(false)}>
                <Ionicons name="close" size={24} color="#8E8E93" />
              </TouchableOpacity>
            </View>

            <View style={s.presetsRow}>
              {presets.map(p => (
                <TouchableOpacity key={p.key} style={s.presetBtn} onPress={() => {
                  const r = applyPreset(p.key);
                  setLocalFrom(r.from); setLocalTo(r.to);
                }}>
                  <Text style={s.presetText}>{p.label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={s.inputRow}>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>ЭХЭЛ</Text>
                <TextInput style={s.input} value={localFrom} onChangeText={setLocalFrom} placeholder="YYYY-MM-DD" placeholderTextColor="#AEAEB2" />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={s.label}>ДУУСАХ</Text>
                <TextInput style={s.input} value={localTo} onChangeText={setLocalTo} placeholder="YYYY-MM-DD" placeholderTextColor="#AEAEB2" />
              </View>
            </View>

            <TouchableOpacity style={s.applyBtn} onPress={handleApply}>
              <Text style={s.applyText}>Хэрэглэх</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  trigger: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#fff', borderRadius: 10, paddingHorizontal: 12, paddingVertical: 8, borderWidth: 1, borderColor: '#E8ECF0' },
  triggerText: { flex: 1, fontSize: 13, fontWeight: '600', color: '#1C1C1E' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.4)', justifyContent: 'flex-end' },
  sheet: { backgroundColor: '#fff', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 16, paddingBottom: 30 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 17, fontWeight: '700', color: '#1C1C1E' },
  presetsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 16 },
  presetBtn: { backgroundColor: '#F2F4F7', paddingHorizontal: 14, paddingVertical: 8, borderRadius: 10 },
  presetText: { fontSize: 12, fontWeight: '600', color: '#1C1C1E' },
  inputRow: { flexDirection: 'row', gap: 10, marginBottom: 16 },
  label: { fontSize: 10, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.3, marginBottom: 4 },
  input: { backgroundColor: '#F2F4F7', borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 14, color: '#1C1C1E' },
  applyBtn: { backgroundColor: '#007AFF', borderRadius: 12, paddingVertical: 14, alignItems: 'center' },
  applyText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
