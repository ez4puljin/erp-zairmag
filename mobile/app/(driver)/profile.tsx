import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '../../src/hooks/use-auth';

const ROLE_LABELS: Record<string, string> = {
  DRIVER: 'Жолооч',
  ADMIN: 'Админ',
  WAREHOUSE_MANAGER: 'Агуулахын менежер',
  CUSTOMER: 'Харилцагч',
};

export default function ProfileScreen() {
  const { user, logout, isLoggingOut } = useAuth();

  const handleLogout = () => {
    Alert.alert('Системээс гарах', 'Та гарахдаа итгэлтэй байна уу?', [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Гарах',
        style: 'destructive',
        onPress: async () => {
          try {
            await logout();
            router.replace('/(auth)/login');
          } catch {
            // ignore
          }
        },
      },
    ]);
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scroll}>
        <Text style={styles.header}>Профайл</Text>

        {/* User Info */}
        <View style={styles.card}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.firstName?.charAt(0) || ''}{user?.lastName?.charAt(0) || ''}
            </Text>
          </View>
          <Text style={styles.userName}>
            {user?.firstName} {user?.lastName}
          </Text>
          <Text style={styles.userEmail}>{user?.email}</Text>
          <View style={styles.roleBadge}>
            <Text style={styles.roleText}>{ROLE_LABELS[user?.role || ''] || user?.role}</Text>
          </View>
        </View>

        {/* Printer Settings */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Принтер тохиргоо</Text>
          <View style={styles.printerRow}>
            <View style={styles.printerDot} />
            <Text style={styles.printerText}>Bluetooth принтер холбогдоогүй</Text>
          </View>
        </View>

        {/* Info */}
        <View style={styles.card}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Имэйл</Text>
            <Text style={styles.infoValue}>{user?.email || '-'}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Утас</Text>
            <Text style={styles.infoValue}>{user?.phone || '-'}</Text>
          </View>
          <View style={[styles.infoRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.infoLabel}>Эрх</Text>
            <Text style={styles.infoValue}>{ROLE_LABELS[user?.role || ''] || user?.role}</Text>
          </View>
        </View>

        {/* Logout */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} disabled={isLoggingOut}>
          <Text style={styles.logoutBtnText}>{isLoggingOut ? 'Гарч байна...' : 'Системээс гарах'}</Text>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>Хувилбар 1.0.0</Text>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F2F2F7' },
  scroll: { flex: 1 },
  header: { fontSize: 28, fontWeight: '700', color: '#1C1C1E', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 12 },
  card: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    alignItems: 'center',
  },
  avatar: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: { fontSize: 28, fontWeight: '700', color: '#fff' },
  userName: { fontSize: 20, fontWeight: '700', color: '#1C1C1E', marginBottom: 4 },
  userEmail: { fontSize: 14, color: '#8E8E93', marginBottom: 8 },
  roleBadge: { backgroundColor: '#E8F0FE', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 6 },
  roleText: { fontSize: 13, fontWeight: '600', color: '#007AFF' },
  cardTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E', marginBottom: 12, alignSelf: 'flex-start' },
  printerRow: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start' },
  printerDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#FF3B30', marginRight: 8 },
  printerText: { fontSize: 14, color: '#8E8E93' },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  infoLabel: { fontSize: 14, color: '#8E8E93' },
  infoValue: { fontSize: 14, fontWeight: '600', color: '#1C1C1E' },
  logoutBtn: {
    marginHorizontal: 16,
    backgroundColor: '#FF3B30',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  logoutBtnText: { color: '#fff', fontSize: 17, fontWeight: '700' },
  version: { textAlign: 'center', fontSize: 13, color: '#C7C7CC', marginTop: 20 },
});
