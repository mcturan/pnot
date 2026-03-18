import { useEffect, useState } from 'react';
import { View, Text, FlatList, TouchableOpacity, StyleSheet, TextInput, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore from '@react-native-firebase/firestore';
import functions from '@react-native-firebase/functions';
import { Classroom } from '@pnot/shared';

export default function ClassroomScreen() {
  const router = useRouter();
  const user = auth().currentUser;
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [code, setCode]   = useState('');
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = firestore()
      .collection('classrooms')
      .where('isArchived', '==', false)
      .onSnapshot((snap) => {
        const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Classroom));
        setClassrooms(all.filter((c) =>
          c.teacherUid === user.uid || c.studentUids.includes(user.uid)
        ));
      });
    return () => unsub();
  }, [user]);

  async function joinClassroom() {
    if (!code.trim()) return;
    setJoining(true);
    try {
      const result = await functions().httpsCallable('joinClassroom')({ inviteCode: code.trim().toUpperCase() });
      const { classroomId } = result.data as { classroomId: string };
      setCode('');
      router.push(`/classroom/${classroomId}`);
    } catch (e: any) {
      Alert.alert('Hata', e.message || 'Geçersiz kod');
    } finally {
      setJoining(false);
    }
  }

  return (
    <View style={s.container}>
      <Text style={s.title}>🏫 Sınıflarım</Text>

      {/* Join bar */}
      <View style={s.joinBar}>
        <TextInput
          style={s.codeInput}
          placeholder="Katılım kodu (ör: ABC123)"
          value={code}
          onChangeText={(t) => setCode(t.toUpperCase())}
          maxLength={8}
          autoCapitalize="characters"
        />
        <TouchableOpacity onPress={joinClassroom} disabled={!code.trim() || joining} style={[s.joinBtn, (!code.trim()||joining) && s.joinBtnDis]}>
          <Text style={s.joinBtnText}>{joining ? '...' : 'Katıl'}</Text>
        </TouchableOpacity>
      </View>

      <FlatList
        data={classrooms}
        keyExtractor={(c) => c.id}
        contentContainerStyle={{ padding:16, paddingBottom:40 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🏫</Text>
            <Text style={s.emptyText}>Henüz sınıf yok</Text>
            <Text style={s.emptyHint}>Öğretmenin verdiği kodu girerek katıl</Text>
          </View>
        }
        renderItem={({ item: c }) => (
          <TouchableOpacity style={s.card} onPress={() => router.push(`/classroom/${c.id}`)}>
            <View style={[s.icon, { backgroundColor: c.color+'20' }]}>
              <Text style={s.iconText}>{c.emoji}</Text>
            </View>
            <View style={{ flex:1 }}>
              <Text style={s.cardTitle}>{c.name}</Text>
              <Text style={s.cardMeta}>{c.studentUids.length} öğrenci · {c.groups.length} grup</Text>
            </View>
            <Text style={s.arrow}>›</Text>
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:'#f9fafb' },
  title:      { fontSize:22, fontWeight:'bold', color:'#111827', paddingHorizontal:20, paddingTop:20, paddingBottom:12 },
  joinBar:    { flexDirection:'row', gap:8, paddingHorizontal:16, marginBottom:12 },
  codeInput:  { flex:1, backgroundColor:'#fff', borderRadius:16, borderWidth:1, borderColor:'#e5e7eb', paddingHorizontal:16, paddingVertical:12, fontSize:16, fontWeight:'bold', letterSpacing:3 },
  joinBtn:    { backgroundColor:'#6366f1', borderRadius:16, paddingHorizontal:18, justifyContent:'center' },
  joinBtnDis: { backgroundColor:'#c7d2fe' },
  joinBtnText:{ color:'#fff', fontWeight:'700', fontSize:15 },
  empty:      { alignItems:'center', paddingTop:60 },
  emptyIcon:  { fontSize:48, marginBottom:10 },
  emptyText:  { color:'#9ca3af', fontSize:16, fontWeight:'500' },
  emptyHint:  { color:'#d1d5db', fontSize:13, marginTop:6 },
  card:       { backgroundColor:'#fff', borderRadius:16, padding:16, marginBottom:10, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#f3f4f6' },
  icon:       { width:48, height:48, borderRadius:12, alignItems:'center', justifyContent:'center', marginRight:12 },
  iconText:   { fontSize:24 },
  cardTitle:  { fontSize:15, fontWeight:'600', color:'#111827' },
  cardMeta:   { fontSize:12, color:'#9ca3af', marginTop:2 },
  arrow:      { fontSize:22, color:'#d1d5db' },
});
