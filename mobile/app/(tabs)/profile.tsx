import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { useAuth } from '@/src/hooks/use-auth';
import api from '@/src/lib/api';
import type { Customer } from '@/src/types';

export default function ProfileScreen() {
  const { user, logout, isLoggingOut } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [loadingCustomer, setLoadingCustomer] = useState(true);

  useEffect(() => {
    const fetchCustomer = async () => {
      try {
        const { data } = await api.get<Customer>('/api/customers/me');
        setCustomer(data);
      } catch {
        // Customer info may not be available
      } finally {
        setLoadingCustomer(false);
      }
    };
    fetchCustomer();
  }, []);

  const handleLogout = () => {
    Alert.alert('Гарах', 'Та гарахдаа итгэлтэй байна уу?', [
      { text: 'Болих', style: 'cancel' },
      {
        text: 'Гарах',
        style: 'destructive',
        onPress: async () => {
          await logout();
          router.replace('/(auth)/login');
        },
      },
    ]);
  };

  const tierLabel = (tier: string) => {
    switch (tier) {
      case 'GOLD': return 'Алт';
      case 'SILVER': return 'Мөнгө';
      case 'BRONZE': return 'Хүрэл';
      default: return 'Энгийн';
    }
  };

  const tierColor = (tier: string) => {
    switch (tier) {
      case 'GOLD': return '#D4A017';
      case 'SILVER': return '#8E8E93';
      case 'BRONZE': return '#CD7F32';
      default: return '#007AFF';
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.scrollContent}
    >
      {/* User Card */}
      <View style={styles.userCard}>
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>
            {user?.firstName?.charAt(0) || '?'}
          </Text>
        </View>
        <Text style={styles.userName}>
          {user?.firstName} {user?.lastName}
        </Text>
        <Text style={styles.userEmail}>{user?.email}</Text>
        {customer?.pricingTier && (
          <View style={[styles.tierBadge, { backgroundColor: tierColor(customer.pricingTier) + '20' }]}>
            <Ionicons name="diamond-outline" size={14} color={tierColor(customer.pricingTier)} />
            <Text style={[styles.tierText, { color: tierColor(customer.pricingTier) }]}>
              {tierLabel(customer.pricingTier)} түвшин
            </Text>
          </View>
        )}
      </View>

      {loadingCustomer ? (
        <View style={styles.loadingSection}>
          <ActivityIndicator size="small" color="#007AFF" />
        </View>
      ) : customer ? (
        <>
          {/* Store Info */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>ДЭЛГҮҮРИЙН МЭДЭЭЛЭЛ</Text>
            <InfoRow icon="storefront-outline" label="Нэр" value={customer.storeName} />
            <InfoRow icon="person-outline" label="Холбоо барих" value={customer.contactName} />
            <InfoRow icon="call-outline" label="Утас" value={customer.phone} />
            <InfoRow icon="location-outline" label="Хаяг" value={customer.address} last />
          </View>

          {/* Finance */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>САНХҮҮГИЙН МЭДЭЭЛЭЛ</Text>
            <View style={styles.financeGrid}>
              <FinanceCard
                label="Зээлийн лимит"
                value={`${Number(customer.creditLimit).toLocaleString()}₮`}
                color="#007AFF"
              />
              <FinanceCard
                label="Өрийн үлдэгдэл"
                value={`${Number(customer.outstandingDebt).toLocaleString()}₮`}
                color="#FF3B30"
              />
              <FinanceCard
                label="Боломжит"
                value={`${(Number(customer.creditLimit) - Number(customer.outstandingDebt)).toLocaleString()}₮`}
                color="#34C759"
              />
            </View>
          </View>
        </>
      ) : null}

      {/* Logout */}
      <TouchableOpacity
        style={[styles.logoutButton, isLoggingOut && { opacity: 0.6 }]}
        onPress={handleLogout}
        disabled={isLoggingOut}
      >
        {isLoggingOut ? (
          <ActivityIndicator color="#FF3B30" />
        ) : (
          <>
            <Ionicons name="log-out-outline" size={20} color="#FF3B30" />
            <Text style={styles.logoutText}>Гарах</Text>
          </>
        )}
      </TouchableOpacity>

      <Text style={styles.version}>Ice Cream Order v1.0.0</Text>
    </ScrollView>
  );
}

function InfoRow({
  icon,
  label,
  value,
  last,
}: {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View style={[infoStyles.row, !last && infoStyles.border]}>
      <Ionicons name={icon} size={18} color="#8E8E93" />
      <View style={infoStyles.content}>
        <Text style={infoStyles.label}>{label}</Text>
        <Text style={infoStyles.value}>{value}</Text>
      </View>
    </View>
  );
}

function FinanceCard({
  label,
  value,
  color,
}: {
  label: string;
  value: string;
  color: string;
}) {
  return (
    <View style={financeStyles.card}>
      <Text style={financeStyles.label}>{label}</Text>
      <Text style={[financeStyles.value, { color }]}>{value}</Text>
    </View>
  );
}

const infoStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 12,
    gap: 12,
  },
  border: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E5E5EA',
  },
  content: { flex: 1 },
  label: { fontSize: 12, color: '#8E8E93', marginBottom: 1 },
  value: { fontSize: 15, color: '#1C1C1E', fontWeight: '500' },
});

const financeStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: '#F2F2F7',
    borderRadius: 10,
    padding: 12,
    minWidth: '30%',
  },
  label: { fontSize: 11, color: '#8E8E93', marginBottom: 4 },
  value: { fontSize: 16, fontWeight: '700' },
});

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 40,
  },
  userCard: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 24,
    alignItems: 'center',
    marginBottom: 12,
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
  avatarText: {
    fontSize: 30,
    fontWeight: '700',
    color: '#ffffff',
  },
  userName: {
    fontSize: 22,
    fontWeight: '700',
    color: '#1C1C1E',
    marginBottom: 2,
  },
  userEmail: {
    fontSize: 15,
    color: '#8E8E93',
    marginBottom: 8,
  },
  tierBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tierText: {
    fontSize: 13,
    fontWeight: '600',
  },
  loadingSection: {
    padding: 32,
    alignItems: 'center',
  },
  section: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#8E8E93',
    letterSpacing: 0.5,
    marginBottom: 4,
  },
  financeGrid: {
    flexDirection: 'row',
    gap: 8,
    marginTop: 8,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: '#ffffff',
    borderRadius: 14,
    paddingVertical: 14,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FF3B30',
  },
  version: {
    textAlign: 'center',
    fontSize: 12,
    color: '#C7C7CC',
    marginTop: 16,
  },
});
