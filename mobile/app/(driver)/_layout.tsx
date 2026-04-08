import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

export default function DriverLayout() {
  const insets = useSafeAreaInsets();
  const tabBarPaddingBottom = Math.max(insets.bottom, 8);

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          height: 56 + tabBarPaddingBottom,
          paddingBottom: tabBarPaddingBottom,
          paddingTop: 6,
          borderTopWidth: 1,
          borderTopColor: '#E8ECF0',
          backgroundColor: '#fff',
        },
        tabBarLabelStyle: { fontSize: 10, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="pos" options={{ title: 'POS', tabBarIcon: ({ color, size }) => <Ionicons name="bag-handle" size={size} color={color} /> }} />
      <Tabs.Screen name="orders" options={{ title: 'Захиалга', tabBarIcon: ({ color, size }) => <Ionicons name="clipboard" size={size} color={color} /> }} />
      <Tabs.Screen name="load" options={{ title: 'Ачилт', tabBarIcon: ({ color, size }) => <Ionicons name="car" size={size} color={color} /> }} />
      <Tabs.Screen name="sales-history" options={{ title: 'Түүх', tabBarIcon: ({ color, size }) => <Ionicons name="list" size={size} color={color} /> }} />
      <Tabs.Screen name="profile" options={{ title: 'Профайл', tabBarIcon: ({ color, size }) => <Ionicons name="person" size={size} color={color} /> }} />
    </Tabs>
  );
}
