import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, RefreshControl } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Project } from '@pnot/shared';

export default function ProjectsScreen() {
  const [projects, setProjects]   = useState<Project[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const user = auth().currentUser;

  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('projects')
      .where('isArchived', '==', false)
      .onSnapshot((snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
        setProjects(all.filter((p) => p.ownerUid===user.uid || p.members?.some((m)=>m.uid===user.uid)));
      });
    return () => unsub();
  }, [user]);

  return (
    <View style={s.container}>
      <View style={s.header}>
        <Text style={s.title}>Projelerim</Text>
        <TouchableOpacity
          style={s.joinBtn}
          onPress={() => router.push('/classroom/join')}
        >
          <Text style={s.joinBtnText}>🏫 Sınıfa Katıl</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={projects}
        keyExtractor={(p) => p.id}
        contentContainerStyle={{ padding: 16, paddingBottom: 80 }}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => setRefreshing(false)} />}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📋</Text>
            <Text style={s.emptyTitle}>Henüz proje yok</Text>
            <Text style={s.emptyHint}>Web uygulamasından proje oluşturun</Text>
          </View>
        }
        renderItem={({ item: p }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/project/${p.id}`)}>
            <View style={[s.emoji, { backgroundColor: p.color + '20' }]}>
              <Text style={s.emojiText}>{p.emoji}</Text>
            </View>
            <View style={s.cardBody}>
              <Text style={s.cardTitle} numberOfLines={1}>{p.name}</Text>
              {p.description ? <Text style={s.cardDesc} numberOfLines={1}>{p.description}</Text> : null}
              <Text style={s.cardMeta}>
                {1 + p.members.length} üye
                {p.classroomId ? '  🏫 Sınıf projesi' : ''}
              </Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:   { flex: 1, backgroundColor: '#f9fafb' },
  header:      { flexDirection:'row', alignItems:'center', justifyContent:'space-between', paddingHorizontal:20, paddingTop:20, paddingBottom:8 },
  title:       { fontSize:24, fontWeight:'bold', color:'#111827' },
  joinBtn:     { backgroundColor:'#eef2ff', borderRadius:12, paddingHorizontal:12, paddingVertical:6 },
  joinBtnText: { fontSize:12, color:'#6366f1', fontWeight:'600' },
  empty:       { alignItems:'center', paddingTop:80 },
  emptyIcon:   { fontSize:48, marginBottom:12 },
  emptyTitle:  { fontSize:16, color:'#9ca3af', fontWeight:'500' },
  emptyHint:   { fontSize:13, color:'#d1d5db', marginTop:6 },
  card:        { backgroundColor:'#fff', borderRadius:16, padding:16, marginBottom:12, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#f3f4f6' },
  emoji:       { width:48, height:48, borderRadius:12, alignItems:'center', justifyContent:'center', marginRight:12 },
  emojiText:   { fontSize:24 },
  cardBody:    { flex:1 },
  cardTitle:   { fontSize:16, fontWeight:'600', color:'#111827' },
  cardDesc:    { fontSize:13, color:'#9ca3af', marginTop:2 },
  cardMeta:    { fontSize:12, color:'#d1d5db', marginTop:4 },
  arrow:       { fontSize:22, color:'#d1d5db' },
});
