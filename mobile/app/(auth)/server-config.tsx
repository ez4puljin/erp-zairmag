import React, { useEffect, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ActivityIndicator, KeyboardAvoidingView, Platform, ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import axios from 'axios';
import { getServerUrl, setServerUrl } from '@/src/lib/api';

export default function ServerConfigScreen() {
  const [serverIp, setServerIp] = useState('');
  const [port, setPort] = useState('3000');
  const [testing, setTesting] = useState(false);
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getServerUrl().then(url => {
      try {
        const u = new URL(url);
        setServerIp(u.hostname);
        setPort(u.port || '3000');
      } catch {
        setServerIp(url.replace(/^https?:\/\//, '').replace(/:\d+$/, ''));
      }
      setLoading(false);
    });
  }, []);

  const fullUrl = `http://${serverIp}:${port}`;

  const handleTest = async () => {
    if (!serverIp.trim()) { setErrorMsg('IP хаяг оруулна уу'); return; }
    setTesting(true);
    setStatus('idle');
    setErrorMsg('');
    try {
      const res = await axios.get(`${fullUrl}/api/auth/me`, { timeout: 5000 }).catch(err => err.response || err);
      // Any response (even 401) means server is reachable
      if (res?.status || res?.data) {
        setStatus('success');
      } else {
        throw new Error('No response');
      }
    } catch (err: any) {
      if (err?.response) {
        // Got HTTP response - server is reachable
        setStatus('success');
      } else {
        setStatus('error');
        setErrorMsg(err?.message || 'Сервертэй холбогдож чадсангүй');
      }
    } finally { setTesting(false); }
  };

  const handleSave = async () => {
    if (status !== 'success') {
      await handleTest();
      return;
    }
    await setServerUrl(fullUrl);
    router.replace('/(auth)/login');
  };

  if (loading) {
    return <View style={s.centered}><ActivityIndicator size="large" color="#007AFF" /></View>;
  }

  return (
    <KeyboardAvoidingView style={s.container} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={s.scroll} keyboardShouldPersistTaps="handled">
        <View style={s.iconWrap}>
          <Ionicons name="server-outline" size={40} color="#007AFF" />
        </View>
        <Text style={s.title}>Серверийн тохиргоо</Text>
        <Text style={s.subtitle}>Backend серверийн IP хаяг болон портыг оруулна уу</Text>

        <View style={s.card}>
          <View style={s.field}>
            <Text style={s.label}>IP ХАЯГ</Text>
            <TextInput
              style={s.input}
              value={serverIp}
              onChangeText={t => { setServerIp(t); setStatus('idle'); }}
              placeholder="192.168.1.65"
              placeholderTextColor="#AEAEB2"
              keyboardType="numeric"
              autoFocus
            />
          </View>
          <View style={s.field}>
            <Text style={s.label}>ПОРТ</Text>
            <TextInput
              style={s.input}
              value={port}
              onChangeText={t => { setPort(t); setStatus('idle'); }}
              placeholder="3000"
              placeholderTextColor="#AEAEB2"
              keyboardType="number-pad"
            />
          </View>

          <View style={s.urlRow}>
            <Ionicons name="link" size={14} color="#8E8E93" />
            <Text style={s.urlText}>{fullUrl}</Text>
          </View>

          {/* Status */}
          {status === 'success' && (
            <View style={s.successBox}>
              <Ionicons name="checkmark-circle" size={18} color="#34C759" />
              <Text style={s.successText}>Сервертэй амжилттай холбогдлоо</Text>
            </View>
          )}
          {status === 'error' && (
            <View style={s.errorBox}>
              <Ionicons name="close-circle" size={18} color="#FF3B30" />
              <Text style={s.errorText}>{errorMsg}</Text>
            </View>
          )}
        </View>

        {/* Buttons */}
        <TouchableOpacity style={s.testBtn} onPress={handleTest} disabled={testing || !serverIp.trim()}>
          {testing ? <ActivityIndicator color="#007AFF" /> : <Ionicons name="wifi" size={18} color="#007AFF" />}
          <Text style={s.testBtnText}>{testing ? 'Шалгаж байна...' : 'Холболт шалгах'}</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[s.saveBtn, status !== 'success' && { opacity: 0.5 }]}
          onPress={handleSave}
          disabled={status !== 'success'}
        >
          <Ionicons name="arrow-forward-circle" size={20} color="#fff" />
          <Text style={s.saveBtnText}>Үргэлжлүүлэх</Text>
        </TouchableOpacity>

        <Text style={s.hint}>
          Жишээ: Компьютерийн WiFi IP хаягийг оруулна.{'\n'}
          Windows: ipconfig → IPv4 Address{'\n'}
          Mac: ifconfig → inet
        </Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  scroll: { flexGrow: 1, justifyContent: 'center', padding: 24 },
  centered: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#F5F6FA' },
  iconWrap: { width: 72, height: 72, borderRadius: 20, backgroundColor: '#007AFF12', justifyContent: 'center', alignItems: 'center', alignSelf: 'center', marginBottom: 16 },
  title: { fontSize: 24, fontWeight: '800', color: '#1C1C1E', textAlign: 'center', marginBottom: 4 },
  subtitle: { fontSize: 14, color: '#8E8E93', textAlign: 'center', marginBottom: 24 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: '#E8ECF0' },
  field: { marginBottom: 14 },
  label: { fontSize: 11, fontWeight: '700', color: '#8E8E93', letterSpacing: 0.5, marginBottom: 6 },
  input: { backgroundColor: '#F5F6FA', borderWidth: 1.5, borderColor: '#E8ECF0', borderRadius: 12, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
  urlRow: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingTop: 8, borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: '#E8ECF0' },
  urlText: { fontSize: 13, color: '#8E8E93', fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  successBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#34C75910', borderRadius: 10, padding: 10 },
  successText: { fontSize: 13, fontWeight: '600', color: '#34C759' },
  errorBox: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12, backgroundColor: '#FF3B3010', borderRadius: 10, padding: 10 },
  errorText: { fontSize: 13, fontWeight: '600', color: '#FF3B30', flex: 1 },
  testBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#007AFF12', borderRadius: 14, paddingVertical: 14, marginBottom: 10, borderWidth: 1, borderColor: '#007AFF30' },
  testBtnText: { fontSize: 15, fontWeight: '600', color: '#007AFF' },
  saveBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#34C759', borderRadius: 14, paddingVertical: 16, marginBottom: 16 },
  saveBtnText: { fontSize: 17, fontWeight: '700', color: '#fff' },
  hint: { fontSize: 12, color: '#AEAEB2', textAlign: 'center', lineHeight: 18 },
});
