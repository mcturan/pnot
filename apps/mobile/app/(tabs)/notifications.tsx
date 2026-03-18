import { View, Text, StyleSheet } from 'react-native';

export default function NotificationsScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Bildirimler</Text>
      <Text style={styles.hint}>Yakında — Push bildirimler aktif edilecek</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb', alignItems: 'center', justifyContent: 'center' },
  title: { fontSize: 20, fontWeight: 'bold', color: '#111827' },
  hint: { fontSize: 13, color: '#9ca3af', marginTop: 8 },
});
