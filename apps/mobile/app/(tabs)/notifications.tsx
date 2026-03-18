import { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import messaging from '@react-native-firebase/messaging';
import firebaseFunctions from '@react-native-firebase/functions';

interface PushItem {
  id: string;
  title: string;
  body: string;
  projectId?: string;
  pageId?: string;
  receivedAt: Date;
}

export default function NotificationsScreen() {
  const [items, setItems]     = useState<PushItem[]>([]);
  const [permitted, setPermitted] = useState(false);
  const router = useRouter();
  const user = auth().currentUser;

  useEffect(() => {
    async function setup() {
      const status = await messaging().requestPermission();
      const enabled = status === messaging.AuthorizationStatus.AUTHORIZED
                   || status === messaging.AuthorizationStatus.PROVISIONAL;
      setPermitted(enabled);
      if (!enabled || !user) return;

      const token = await messaging().getToken();
      await firestore().doc(`fcmTokens/${user.uid}`).set({ token });

      // Record daily login
      await firebaseFunctions().httpsCallable('recordLogin')({});
    }
    setup();

    // Foreground messages
    const unsub = messaging().onMessage(async (msg) => {
      setItems((prev) => [{
        id: Date.now().toString(),
        title: msg.notification?.title || 'PNOT',
        body:  msg.notification?.body  || '',
        projectId: msg.data?.projectId,
        pageId:    msg.data?.pageId,
        receivedAt: new Date(),
      }, ...prev]);
    });
    return () => unsub();
  }, [user]);

  return (
    <View style={s.container}>
      <Text style={s.title}>🔔 Bildirimler</Text>

      {!permitted && (
        <View style={s.permBox}>
          <Text style={s.permText}>Bildirim izni verilmedi. Ayarlardan etkinleştir.</Text>
        </View>
      )}

      <FlatList
        data={items}
        keyExtractor={(i) => i.id}
        contentContainerStyle={{ padding:16, paddingBottom:40 }}
        ListEmptyComponent={
          <View style={s.empty}>
            <Text style={s.emptyIcon}>🔕</Text>
            <Text style={s.emptyText}>Henüz bildirim yok</Text>
          </View>
        }
        renderItem={({ item }) => (
          <TouchableOpacity
            style={s.card}
            onPress={() => item.projectId && router.push(
              item.pageId
                ? `/page/${item.projectId}/${item.pageId}`
                : `/project/${item.projectId}`
            )}
          >
            <View style={{ flex:1 }}>
              <Text style={s.cardTitle}>{item.title}</Text>
              <Text style={s.cardBody}>{item.body}</Text>
              <Text style={s.cardTime}>{item.receivedAt.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })}</Text>
            </View>
            {item.projectId && <Text style={s.arrow}>›</Text>}
          </TouchableOpacity>
        )}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container:  { flex:1, backgroundColor:'#f9fafb' },
  title:      { fontSize:22, fontWeight:'bold', color:'#111827', padding:20, paddingBottom:12 },
  permBox:    { margin:16, backgroundColor:'#fef3c7', borderRadius:16, padding:14 },
  permText:   { color:'#92400e', fontSize:13 },
  empty:      { alignItems:'center', paddingTop:80 },
  emptyIcon:  { fontSize:48, marginBottom:10 },
  emptyText:  { color:'#9ca3af', fontSize:15 },
  card:       { backgroundColor:'#fff', borderRadius:16, padding:16, marginBottom:10, flexDirection:'row', alignItems:'center', borderWidth:1, borderColor:'#f3f4f6' },
  cardTitle:  { fontSize:14, fontWeight:'600', color:'#111827' },
  cardBody:   { fontSize:13, color:'#6b7280', marginTop:2 },
  cardTime:   { fontSize:11, color:'#d1d5db', marginTop:4 },
  arrow:      { fontSize:22, color:'#d1d5db', marginLeft:8 },
});
