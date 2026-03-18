import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: '#6366f1' }}>
      <Tabs.Screen name="index" options={{ title: 'Projeler', tabBarIcon: () => null }} />
      <Tabs.Screen name="notifications" options={{ title: 'Bildirimler', tabBarIcon: () => null }} />
    </Tabs>
  );
}
