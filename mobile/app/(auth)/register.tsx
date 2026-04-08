import { Link, router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import api from '@/src/lib/api';

export default function RegisterScreen() {
  const [storeName, setStoreName] = useState('');
  const [contactName, setContactName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [address, setAddress] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRegister = async () => {
    if (!storeName || !contactName || !phone || !email || !password || !address) {
      setError('Бүх талбарыг бөглөнө үү');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      await api.post('/api/auth/register', {
        storeName,
        contactName,
        phone,
        email,
        password,
        address,
      });
      Alert.alert('Амжилттай', 'Бүртгэл амжилттай үүслээ. Нэвтэрнэ үү.', [
        { text: 'OK', onPress: () => router.replace('/(auth)/login') },
      ]);
    } catch (err: any) {
      const message =
        err.response?.data?.message || 'Бүртгүүлэхэд алдаа гарлаа';
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const isValid =
    storeName.length > 0 &&
    contactName.length > 0 &&
    phone.length > 0 &&
    email.length > 0 &&
    password.length >= 6 &&
    address.length > 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={styles.title}>Бүртгүүлэх</Text>
        <Text style={styles.subtitle}>Дэлгүүрийн мэдээлэл оруулна уу</Text>

        {error && (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        )}

        <View style={styles.card}>
          <InputField
            label="Дэлгүүрийн нэр"
            value={storeName}
            onChangeText={setStoreName}
            placeholder="Жишээ: Болд Маркет"
          />
          <InputField
            label="Холбоо барих нэр"
            value={contactName}
            onChangeText={setContactName}
            placeholder="Таны нэр"
          />
          <InputField
            label="Утас"
            value={phone}
            onChangeText={setPhone}
            placeholder="9911 2233"
            keyboardType="phone-pad"
          />
          <InputField
            label="Имэйл"
            value={email}
            onChangeText={setEmail}
            placeholder="example@mail.com"
            keyboardType="email-address"
            autoCapitalize="none"
          />
          <InputField
            label="Нууц үг"
            value={password}
            onChangeText={setPassword}
            placeholder="6+ тэмдэгт"
            secureTextEntry
          />
          <InputField
            label="Хаяг"
            value={address}
            onChangeText={setAddress}
            placeholder="Дэлгүүрийн хаяг"
            multiline
            last
          />
        </View>

        <TouchableOpacity
          style={[
            styles.button,
            (!isValid || isSubmitting) && styles.buttonDisabled,
          ]}
          onPress={handleRegister}
          disabled={!isValid || isSubmitting}
          activeOpacity={0.8}
        >
          {isSubmitting ? (
            <ActivityIndicator color="#ffffff" />
          ) : (
            <Text style={styles.buttonText}>Бүртгүүлэх</Text>
          )}
        </TouchableOpacity>

        <View style={styles.linkContainer}>
          <Text style={styles.linkLabel}>Бүртгэлтэй юу? </Text>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity>
              <Text style={styles.linkText}>Нэвтрэх</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType,
  autoCapitalize,
  secureTextEntry,
  multiline,
  last,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences';
  secureTextEntry?: boolean;
  multiline?: boolean;
  last?: boolean;
}) {
  return (
    <View style={[fieldStyles.container, !last && fieldStyles.border]}>
      <Text style={fieldStyles.label}>{label}</Text>
      <TextInput
        style={[fieldStyles.input, multiline && { minHeight: 60, textAlignVertical: 'top' }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#C7C7CC"
        keyboardType={keyboardType}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
        multiline={multiline}
        autoCorrect={false}
      />
    </View>
  );
}

const fieldStyles = StyleSheet.create({
  container: {
    paddingVertical: 10,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#8E8E93',
    marginBottom: 4,
  },
  input: {
    fontSize: 16,
    color: '#1C1C1E',
    paddingVertical: 2,
  },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 20,
    paddingVertical: 48,
  },
  title: {
    fontSize: 30,
    fontWeight: '700',
    color: '#1C1C1E',
    textAlign: 'center',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
    textAlign: 'center',
    marginBottom: 24,
  },
  errorContainer: {
    backgroundColor: '#FFF2F2',
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
  },
  errorText: {
    color: '#FF3B30',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingHorizontal: 16,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#007AFF',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '600',
  },
  linkContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 20,
  },
  linkLabel: {
    fontSize: 15,
    color: '#8E8E93',
  },
  linkText: {
    fontSize: 15,
    color: '#007AFF',
    fontWeight: '600',
  },
});
