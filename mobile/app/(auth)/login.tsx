import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/src/hooks/use-auth';
import { getCurrentBaseUrl } from '@/src/lib/api';

export default function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const { login, isLoggingIn, loginError, isAuthenticated, user } = useAuth();

  // Auto-redirect if already logged in
  React.useEffect(() => {
    if (isAuthenticated && user) {
      if (user.role === 'DRIVER') router.replace('/(driver)/pos');
      else if (user.role === 'ADMIN' || user.role === 'WAREHOUSE_MANAGER') router.replace('/(admin)/dashboard');
      else router.replace('/(tabs)/products');
    }
  }, [isAuthenticated, user]);

  const [errorMsg, setErrorMsg] = useState('');

  const handleLogin = async () => {
    setErrorMsg('');
    try {
      const result = await login({ email, password });
      const role = result.user?.role;
      if (role === 'DRIVER') {
        router.replace('/(driver)/pos');
      } else if (role === 'ADMIN' || role === 'WAREHOUSE_MANAGER') {
        router.replace('/(admin)/dashboard');
      } else {
        router.replace('/(tabs)/products');
      }
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message;
      if (!err?.response) {
        // Network error
        setErrorMsg(`Сервертэй холбогдож чадсангүй.\nСерверийн хаяг: ${process.env.EXPO_PUBLIC_API_URL || 'тохируулаагүй'}\n\nШалтгаан: ${err?.message || 'Сүлжээний алдаа'}`);
      } else if (status === 401) {
        setErrorMsg('Имэйл эсвэл нууц үг буруу байна');
      } else if (status === 403) {
        setErrorMsg('Бүртгэл идэвхгүй болсон байна');
      } else if (status === 400) {
        setErrorMsg(`Оруулсан мэдээлэл буруу: ${Array.isArray(msg) ? msg.join(', ') : msg || 'Алдаа'}`);
      } else {
        setErrorMsg(`Алдаа (${status}): ${msg || err?.message || 'Тодорхойгүй алдаа'}`);
      }
    }
  };

  const isValid = email.length > 0 && password.length >= 4;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        {/* Top accent bar */}
        <View style={styles.accentBar} />

        {/* Card */}
        <View style={styles.card}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.logoRow}>
              <View style={styles.logoBadge}>
                <Text style={styles.logoEmoji}>🍦</Text>
              </View>
              <View>
                <Text style={styles.appName}>Зайрмаг ERP</Text>
                <Text style={styles.appDesc}>Удирдлагын систем</Text>
              </View>
            </View>
          </View>

          <View style={styles.divider} />

          {/* Title */}
          <Text style={styles.title}>Нэвтрэх</Text>
          <Text style={styles.subtitle}>Имэйл болон нууц үгээ оруулна уу</Text>

          {/* Error */}
          {errorMsg ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{errorMsg}</Text>
            </View>
          ) : null}

          {/* Email */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>ИМЭЙЛ</Text>
            <TextInput
              style={styles.input}
              value={email}
              onChangeText={setEmail}
              placeholder="admin@icecream.mn"
              placeholderTextColor="#A0A3B1"
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          {/* Password */}
          <View style={styles.fieldGroup}>
            <Text style={styles.label}>НУУЦ ҮГ</Text>
            <View style={styles.passwordRow}>
              <TextInput
                style={[styles.input, { flex: 1 }]}
                value={password}
                onChangeText={setPassword}
                placeholder="••••••"
                placeholderTextColor="#A0A3B1"
                secureTextEntry={!showPassword}
              />
              <TouchableOpacity
                style={styles.eyeBtn}
                onPress={() => setShowPassword(!showPassword)}
              >
                <Text style={styles.eyeText}>{showPassword ? 'Нуух' : 'Харах'}</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Submit */}
          <TouchableOpacity
            style={[styles.button, (!isValid || isLoggingIn) && styles.buttonDisabled]}
            onPress={handleLogin}
            disabled={!isValid || isLoggingIn}
            activeOpacity={0.8}
          >
            {isLoggingIn ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.buttonText}>Нэвтрэх</Text>
            )}
          </TouchableOpacity>
        </View>

        {/* Server config link */}
        <TouchableOpacity onPress={() => router.push('/(auth)/server-config')} style={{ alignItems: 'center', marginTop: 16, paddingVertical: 8 }}>
          <Text style={{ fontSize: 13, color: '#007AFF', fontWeight: '500' }}>Серверийн тохиргоо</Text>
        </TouchableOpacity>

        {/* Footer */}
        <Text style={styles.footer}>Зайрмаг ERP v1.0 — Түгээлт & POS</Text>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F6FA',
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 20,
    paddingVertical: 40,
  },
  accentBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 4,
    backgroundColor: '#007AFF',
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  header: {
    marginBottom: 16,
  },
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  logoBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEmoji: {
    fontSize: 24,
  },
  appName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1A1D26',
  },
  appDesc: {
    fontSize: 12,
    color: '#8C8FA3',
    fontWeight: '500',
  },
  divider: {
    height: 1,
    backgroundColor: '#E8ECF0',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1A1D26',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 14,
    color: '#8C8FA3',
    marginBottom: 24,
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#EF4444',
    fontSize: 13,
    textAlign: 'center',
    fontWeight: '500',
  },
  fieldGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 11,
    fontWeight: '700',
    color: '#8C8FA3',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF0',
    paddingHorizontal: 14,
    paddingVertical: 14,
    fontSize: 15,
    color: '#1A1D26',
  },
  passwordRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  eyeBtn: {
    paddingHorizontal: 14,
    paddingVertical: 14,
    backgroundColor: '#F5F6FA',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E8ECF0',
  },
  eyeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#007AFF',
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#007AFF',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  footer: {
    textAlign: 'center',
    marginTop: 20,
    fontSize: 12,
    color: '#A0A3B1',
  },
});
