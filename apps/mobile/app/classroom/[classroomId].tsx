import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import { Classroom, UserProfile, ClassGroup } from '@pnot/shared';

type Tab = 'students' | 'groups';

export default function ClassroomDetailScreen() {
  const { classroomId } = useLocalSearchParams<{ classroomId: string }>();
  const router = useRouter();
  const user = auth().currentUser;
  const [classroom, setClassroom] = useState<Classroom|null>(null);
  const [students,  setStudents]  = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<Tab>('students');

  useEffect(() => {
    const unsub = firestore().doc(`classrooms/${classroomId}`).onSnapshot((s) => {
      if (s.exists()) setClassroom({ id:s.id, ...s.data() } as Classroom);
    });
    return () => unsub();
  }, [classroomId]);

  useEffect(() => {
    if (!classroom?.studentUids.length) return;
    Promise.all(
      classroom.studentUids.map((uid) => firestore().doc(`users/${uid}`).get())
    ).then((snaps) => setStudents(snaps.filter((s)=>s.exists()).map((s)=>({ uid:s.id, ...s.data() } as UserProfile))));
  }, [classroom?.studentUids]);

  if (!classroom) return <View style={s.center}><Text style={s.loading}>Yükleniyor...</Text></View>;

  const isTeacher = user?.uid === classroom.teacherUid;

  return (
    <>
      <Stack.Screen options={{ title: `${classroom.emoji} ${classroom.name}` }} />
      <View style={s.container}>
        {/* Header */}
        <View style={[s.banner, { backgroundColor: classroom.color+'15' }]}>
          <Text style={s.bannerEmoji}>{classroom.emoji}</Text>
          <View style={{ flex:1 }}>
            <Text style={s.bannerTitle}>{classroom.name}</Text>
            <Text style={s.bannerMeta}>{classroom.studentUids.length} öğrenci · {classroom.groups.length} grup</Text>
          </View>
          <View style={s.codeBox}>
            <Text style={s.codeLabel}>Kod</Text>
            <Text style={s.code}>#{classroom.inviteCode}</Text>
          </View>
        </View>

        {/* Class project shortcut */}
        {classroom.projectId && (
          <TouchableOpacity style={s.projectBtn} onPress={() => router.push(`/project/${classroom.projectId}`)}>
            <Text style={s.projectBtnText}>📋 Sınıf Projesine Git →</Text>
          </TouchableOpacity>
        )}

        {/* Tabs */}
        <View style={s.tabs}>
          <TouchableOpacity onPress={()=>setTab('students')} style={[s.tab, tab==='students'&&s.tabActive]}>
            <Text style={[s.tabText, tab==='students'&&s.tabTextActive]}>👥 Öğrenciler</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={()=>setTab('groups')} style={[s.tab, tab==='groups'&&s.tabActive]}>
            <Text style={[s.tabText, tab==='groups'&&s.tabTextActive]}>🗂️ Gruplar</Text>
          </TouchableOpacity>
        </View>

        {/* Students */}
        {tab === 'students' && (
          <FlatList
            data={students}
            keyExtractor={(s) => s.uid}
            contentContainerStyle={{ padding:16 }}
            ListEmptyComponent={<Text style={s.emptyText}>Henüz öğrenci yok</Text>}
            renderItem={({ item: st }) => {
              const inGroups = classroom.groups.filter((g)=>g.studentUids.includes(st.uid));
              return (
                <View style={s.studentCard}>
                  <View style={s.studentAvatar}>
                    <Text style={s.studentAvatarText}>{st.displayName?.[0]||'?'}</Text>
                  </View>
                  <View style={{ flex:1 }}>
                    <Text style={s.studentName}>{st.displayName}</Text>
                    <Text style={s.studentMeta}>Lv.{st.level||1} · {st.xp||0} XP · 📝{st.noteCount||0} ✅{st.taskCount||0}</Text>
                    {inGroups.length > 0 && (
                      <View style={s.groupTags}>
                        {inGroups.map((g)=>(
                          <View key={g.id} style={s.groupTag}>
                            <Text style={s.groupTagText}>{g.emoji} {g.name}</Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </View>
                </View>
              );
            }}
          />
        )}

        {/* Groups */}
        {tab === 'groups' && (
          <FlatList
            data={classroom.groups}
            keyExtractor={(g) => g.id}
            contentContainerStyle={{ padding:16 }}
            ListEmptyComponent={<Text style={s.emptyText}>Henüz grup yok</Text>}
            renderItem={({ item: g }) => {
              const members = students.filter((st)=>g.studentUids.includes(st.uid));
              return (
                <View style={s.groupCard}>
                  <View style={s.groupHeader}>
                    <Text style={s.groupEmoji}>{g.emoji}</Text>
                    <Text style={s.groupName}>{g.name}</Text>
                    <Text style={s.groupCount}>{members.length} üye</Text>
                  </View>
                  <Text style={s.groupMembers}>
                    {members.map((m)=>m.displayName).join(', ') || 'Üye yok'}
                  </Text>
                  {g.projectId && (
                    <TouchableOpacity onPress={()=>router.push(`/project/${g.projectId}`)} style={s.groupProjectBtn}>
                      <Text style={s.groupProjectBtnText}>📋 Grup Projesi →</Text>
                    </TouchableOpacity>
                  )}
                </View>
              );
            }}
          />
        )}
      </View>
    </>
  );
}

const s = StyleSheet.create({
  container:       { flex:1, backgroundColor:'#f9fafb' },
  center:          { flex:1, alignItems:'center', justifyContent:'center' },
  loading:         { color:'#9ca3af' },
  banner:          { flexDirection:'row', alignItems:'center', gap:12, margin:16, padding:16, borderRadius:20 },
  bannerEmoji:     { fontSize:32 },
  bannerTitle:     { fontSize:17, fontWeight:'bold', color:'#111827' },
  bannerMeta:      { fontSize:12, color:'#6b7280', marginTop:2 },
  codeBox:         { alignItems:'center' },
  codeLabel:       { fontSize:10, color:'#9ca3af' },
  code:            { fontSize:16, fontWeight:'bold', color:'#6366f1', fontFamily:'monospace' },
  projectBtn:      { marginHorizontal:16, marginBottom:8, backgroundColor:'#eef2ff', borderRadius:16, padding:14, alignItems:'center' },
  projectBtnText:  { color:'#6366f1', fontWeight:'600', fontSize:14 },
  tabs:            { flexDirection:'row', margin:16, backgroundColor:'#f3f4f6', borderRadius:16, padding:4 },
  tab:             { flex:1, paddingVertical:10, borderRadius:12, alignItems:'center' },
  tabActive:       { backgroundColor:'#fff' },
  tabText:         { fontSize:13, color:'#9ca3af', fontWeight:'500' },
  tabTextActive:   { color:'#111827', fontWeight:'600' },
  emptyText:       { color:'#9ca3af', textAlign:'center', paddingTop:40 },
  studentCard:     { flexDirection:'row', backgroundColor:'#fff', borderRadius:16, padding:14, marginBottom:10, borderWidth:1, borderColor:'#f3f4f6', gap:12, alignItems:'flex-start' },
  studentAvatar:   { width:40, height:40, borderRadius:20, backgroundColor:'#eef2ff', alignItems:'center', justifyContent:'center' },
  studentAvatarText:{ fontSize:16, color:'#6366f1', fontWeight:'700' },
  studentName:     { fontSize:14, fontWeight:'600', color:'#111827' },
  studentMeta:     { fontSize:12, color:'#9ca3af', marginTop:2 },
  groupTags:       { flexDirection:'row', flexWrap:'wrap', gap:4, marginTop:4 },
  groupTag:        { backgroundColor:'#eef2ff', borderRadius:8, paddingHorizontal:8, paddingVertical:2 },
  groupTagText:    { fontSize:11, color:'#6366f1' },
  groupCard:       { backgroundColor:'#fff', borderRadius:16, padding:16, marginBottom:10, borderWidth:1, borderColor:'#f3f4f6' },
  groupHeader:     { flexDirection:'row', alignItems:'center', gap:8, marginBottom:8 },
  groupEmoji:      { fontSize:20 },
  groupName:       { flex:1, fontSize:15, fontWeight:'600', color:'#111827' },
  groupCount:      { fontSize:12, color:'#9ca3af' },
  groupMembers:    { fontSize:13, color:'#6b7280', marginBottom:10 },
  groupProjectBtn: { backgroundColor:'#eef2ff', borderRadius:12, padding:10, alignItems:'center' },
  groupProjectBtnText: { color:'#6366f1', fontWeight:'600', fontSize:13 },
});
