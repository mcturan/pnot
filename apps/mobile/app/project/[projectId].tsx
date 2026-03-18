import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Project, Page } from '@pnot/shared';

export default function ProjectScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();
  const user = auth().currentUser;
  const [project, setProject] = useState<Project|null>(null);
  const [pages, setPages]     = useState<Page[]>([]);

  useEffect(() => {
    const u1 = firestore().doc(`projects/${projectId}`).onSnapshot((s) => {
      if (s.exists()) setProject({ id: s.id, ...s.data() } as Project);
    });
    const u2 = firestore()
      .collection(`projects/${projectId}/pages`)
      .orderBy('order','asc')
      .onSnapshot((s) => setPages(s.docs.map((d) => ({ id:d.id, ...d.data() } as Page))));
    return () => { u1(); u2(); };
  }, [projectId]);

  if (!project) return <View style={s.center}><Text style={s.loading}>Yükleniyor...</Text></View>;

  return (
    <>
      <Stack.Screen options={{ title: `${project.emoji} ${project.name}` }} />
      <View style={s.container}>
        {/* Project info */}
        <View style={[s.banner, { backgroundColor: project.color + '15' }]}>
          <Text style={s.bannerEmoji}>{project.emoji}</Text>
          <View style={{ flex:1 }}>
            <Text style={s.bannerTitle}>{project.name}</Text>
            {project.description ? <Text style={s.bannerDesc}>{project.description}</Text> : null}
            <Text style={s.bannerMeta}>{1+project.members.length} üye</Text>
          </View>
        </View>

        {/* Stats shortcut */}
        <TouchableOpacity style={s.statsBtn} onPress={() => router.push(`/project-stats/${projectId}`)}>
          <Text style={s.statsBtnText}>📊 İstatistikleri Gör</Text>
        </TouchableOpacity>

        {/* Pages */}
        <Text style={s.sectionTitle}>Sayfalar</Text>
        <FlatList
          data={pages}
          keyExtractor={(p) => p.id}
          contentContainerStyle={{ padding:16, paddingBottom:40 }}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={s.emptyText}>Henüz sayfa yok</Text>
            </View>
          }
          renderItem={({ item: pg }) => (
            <TouchableOpacity
              style={s.pageCard}
              onPress={() => router.push(`/page/${projectId}/${pg.id}`)}
            >
              <Text style={s.pageIcon}>{pg.icon||'📄'}</Text>
              <Text style={s.pageTitle}>{pg.title}</Text>
              <Text style={s.pageArrow}>›</Text>
            </TouchableOpacity>
          )}
        />
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container:   { flex:1, backgroundColor:'#f9fafb' },
  center:      { flex:1, alignItems:'center', justifyContent:'center' },
  loading:     { color:'#9ca3af' },
  banner:      { flexDirection:'row', alignItems:'center', gap:16, margin:16, padding:16, borderRadius:20 },
  bannerEmoji: { fontSize:36 },
  bannerTitle: { fontSize:18, fontWeight:'bold', color:'#111827' },
  bannerDesc:  { fontSize:13, color:'#6b7280', marginTop:2 },
  bannerMeta:  { fontSize:12, color:'#9ca3af', marginTop:4 },
  sectionTitle:{ fontSize:14, fontWeight:'600', color:'#6b7280', paddingHorizontal:20, paddingBottom:4 },
  emptyBox:    { alignItems:'center', paddingVertical:40 },
  emptyText:   { color:'#9ca3af' },
  pageCard:    { flexDirection:'row', alignItems:'center', backgroundColor:'#fff', borderRadius:16, padding:16, marginBottom:10, borderWidth:1, borderColor:'#f3f4f6' },
  pageIcon:    { fontSize:20, marginRight:12 },
  pageTitle:   { flex:1, fontSize:15, fontWeight:'600', color:'#111827' },
  pageArrow:   { fontSize:22, color:'#d1d5db' },
  statsBtn:    { marginHorizontal:16, marginBottom:8, backgroundColor:'#eef2ff', borderRadius:14, padding:12, alignItems:'center' },
  statsBtnText:{ color:'#6366f1', fontWeight:'600', fontSize:13 },
});
