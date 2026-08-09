import React from 'react';
import { View, ScrollView, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { ScreenHeader, MenuTile } from '@/src/components/admin';

export default function ReportsHubScreen() {
  return (
    <View style={s.container}>
      <ScreenHeader title="Тайлан" />
      <ScrollView contentContainerStyle={{ padding: 12 }}>
        <View style={s.grid}>
          <MenuTile icon="trending-up" label="Өдрийн борлуулалт" color="#34C759" onPress={() => router.push('/(admin)/features/reports/sales' as any)} />
          <MenuTile icon="pie-chart" label="Ашиг" color="#AF52DE" onPress={() => router.push('/(admin)/features/reports/profit' as any)} />
          <MenuTile icon="wallet" label="Өрийн тайлан" color="#FF3B30" onPress={() => router.push('/(admin)/features/reports/debt' as any)} />
          <MenuTile icon="car" label="Жолоочийн тайлан" color="#5856D6" onPress={() => router.push('/(admin)/features/reports/drivers' as any)} />
          <MenuTile icon="card" label="Дансны тайлан" color="#0EA5E9" onPress={() => router.push('/(admin)/features/reports/bank-accounts' as any)} />
          <MenuTile icon="calculator" label="НӨАТ тайлан" color="#0891B2" onPress={() => router.push('/(admin)/features/reports/vat' as any)} />
        </View>
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#F5F6FA' },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
});
