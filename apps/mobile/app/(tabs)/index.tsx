import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Project } from '@pnot/shared';

export default function ProjectsScreen() {
  const [projects, setProjects] = useState<Project[]>([]);
  const router = useRouter();
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('projects')
      .where('isArchived', '==', false)
      .onSnapshot((snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
        setProjects(all.filter(
          (p) => p.ownerUid === user.uid || p.members?.some((m) => m.uid === user.uid)
        ));
      });
    return () => unsub();
  }, [user]);

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Projelerim</Text>
      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16 }}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyText}>Henüz proje yok</Text>
            <Text style={styles.emptyHint}>Web uygulamasından proje oluşturun</Text>
          </View>
        }
        renderItem={({ item: p }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() => router.push(`/project/${p.id}`)}
          >
            <View style={[styles.emoji, { backgroundColor: p.color + '20' }]}>
              <Text style={styles.emojiText}>{p.emoji}</Text>
            </View>
            <View style={styles.cardContent}>
              <Text style={styles.cardTitle}>{p.name}</Text>
              {p.description && <Text style={styles.cardDesc} numberOfLines={1}>{p.description}</Text>}
              <Text style={styles.cardMeta}>{1 + p.members.length} üye</Text>
            </View>
            <Text style={styles.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f9fafb' },
  header: { fontSize: 24, fontWeight: 'bold', color: '#111827', padding: 20, paddingBottom: 8 },
  empty: { alignItems: 'center', paddingTop: 80 },
  emptyText: { fontSize: 16, color: '#9ca3af', fontWeight: '500' },
  emptyHint: { fontSize: 13, color: '#d1d5db', marginTop: 8 },
  card: { backgroundColor: '#fff', borderRadius: 16, padding: 16, marginBottom: 12, flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  emoji: { width: 48, height: 48, borderRadius: 12, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  emojiText: { fontSize: 24 },
  cardContent: { flex: 1 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#111827' },
  cardDesc: { fontSize: 13, color: '#9ca3af', marginTop: 2 },
  cardMeta: { fontSize: 12, color: '#d1d5db', marginTop: 4 },
  arrow: { fontSize: 22, color: '#d1d5db' },
});
