import { Tabs } from 'expo-router';
import { Text } from 'react-native';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{
      tabBarActiveTintColor: '#6366f1',
      tabBarStyle: { borderTopColor: '#f3f4f6' },
      headerShown: false,
    }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Projeler',
          tabBarIcon: ({ color }) => <Text style={{ fontSize:20, color }}>📋</Text>,
        }}
      />
      <Tabs.Screen
        name="notifications"
        options={{
          title: 'Bildirimler',
          tabBarIcon: ({ color }) => <Text style={{ fontSize:20, color }}>🔔</Text>,
        }}
      />
    </Tabs>
  );
}
