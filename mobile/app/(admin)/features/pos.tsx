import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Linking } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { ScreenHeader } from '@/src/components/admin';
import { getCurrentBaseUrl } from '@/src/lib/api';

export default function AdminPOSScreen() {
  const openWebPOS = () => {
    const base = getCurrentBaseUrl().replace(':3000', ':3001');
    Linking.openURL(`${base}/pos`);
  };

  return (
    <View style={s.container}>
      <ScreenHeader title="POS Борлуулалт" />
      <View style={s.content}>
        <View style={s.card}>
          <View style={s.iconWrap}>
            <Ionicons name="bag-handle" size={40} color="#34C759" />
          </View>
          <Text style={s.title}>Вэб POS</Text>
          <Text style={s.desc}>
            Админ POS нь вэб хэлбэрээр ажиллана. Жолооч гар утасны апп дээрээс шууд POS ашиглана.
          </Text>
          <TouchableOpacity style={s.btn} onPress={openWebPOS}>
            <Ionicons name="open-outline" size={18} color="#fff" />
            <Text style={s.btnText}>Вэб POS нээх</Text>
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  content: { flex: 1, justifyContent: 'center', paddingHorizontal: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 32, alignItems: 'center', borderWidth: 1, borderColor: '#E8ECF0' },
  iconWrap: { width: 80, height: 80, borderRadius: 20, backgroundColor: '#34C75915', justifyContent: 'center', alignItems: 'center', marginBottom: 16 },
  title: { fontSize: 22, fontWeight: '800', color: '#1C1C1E', marginBottom: 8 },
  desc: { fontSize: 14, color: '#8E8E93', textAlign: 'center', lineHeight: 20, marginBottom: 24 },
  btn: { flexDirection: 'row', alignItems: 'center', gap: 8, backgroundColor: '#007AFF', paddingHorizontal: 28, paddingVertical: 14, borderRadius: 14 },
  btnText: { fontSize: 15, fontWeight: '700', color: '#fff' },
});
