import { useEffect, useState, useRef } from 'react';
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  KeyboardAvoidingView, Platform, StyleSheet, Pressable,
} from 'react-native';
import { useLocalSearchParams, Stack } from 'expo-router';
import auth from '@react-native-firebase/auth';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Note, Page, TaskStatus } from '@pnot/shared';

type MobileNote = Note & { id: string };

function NoteCard({ note, onReply, onTaskToggle }: {
  note: MobileNote;
  onReply: (n: MobileNote) => void;
  onTaskToggle: (n: MobileNote) => void;
}) {
  const taskColors: Record<TaskStatus, string> = {
    todo: '#f3f4f6', doing: '#dbeafe', done: '#d1fae5',
  };
  const taskLabel: Record<TaskStatus, string> = {
    todo: '○ Yapılacak', doing: '◑ Yapılıyor', done: '● Tamamlandı',
  };

  return (
    <View style={[s.noteCard, note.isPinned && s.noteCardPinned]}>
      <View style={s.noteHeader}>
        {note.isPinned && <Text style={s.pin}>📌 </Text>}
        <Text style={s.noteAuthor}>{note.authorName}</Text>
        <Text style={s.noteTime}>
          {(note.createdAt as FirebaseFirestoreTypes.Timestamp)?.toDate?.()?.toLocaleTimeString('tr-TR', { hour:'2-digit', minute:'2-digit' })}
        </Text>
      </View>
      <Text style={s.noteContent}>{note.content}</Text>
      <View style={s.noteActions}>
        {note.isTask && (
          <TouchableOpacity onPress={() => onTaskToggle(note)}
            style={[s.taskBadge, { backgroundColor: taskColors[note.taskStatus||'todo'] }]}>
            <Text style={s.taskBadgeText}>{taskLabel[note.taskStatus||'todo']}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity onPress={() => onReply(note)} style={s.replyBtn}>
          <Text style={s.replyBtnText}>↩ Yanıtla {note.replyCount ? `(${note.replyCount})` : ''}</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

export default function PageViewScreen() {
  const { projectId, pageId } = useLocalSearchParams<{ projectId: string; pageId: string }>();
  const user = auth().currentUser;
  const [page, setPage]         = useState<Page|null>(null);
  const [notes, setNotes]       = useState<MobileNote[]>([]);
  const [text, setText]         = useState('');
  const [isTask, setIsTask]     = useState(false);
  const [replyTo, setReplyTo]   = useState<MobileNote|null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    const u1 = firestore().doc(`projects/${projectId}/pages/${pageId}`).onSnapshot((s) => {
      if (s.exists()) setPage({ id: s.id, ...s.data() } as Page);
    });
    const u2 = firestore()
      .collection(`projects/${projectId}/pages/${pageId}/notes`)
      .orderBy('createdAt','asc')
      .onSnapshot((s) => setNotes(s.docs.map((d) => ({ id:d.id, ...d.data() } as MobileNote))));
    return () => { u1(); u2(); };
  }, [projectId, pageId]);

  async function send() {
    if (!user || !text.trim()) return;
    const content = text.trim();
    setText('');
    const noteRef = await firestore().collection(`projects/${projectId}/pages/${pageId}/notes`).add({
      projectId, pageId, content,
      authorUid:    user.uid,
      authorName:   user.displayName || 'User',
      authorPhoto:  user.photoURL || '',
      parentNoteId: replyTo?.id || null,
      isPinned: false,
      isTask,
      taskStatus: isTask ? 'todo' : null,
      replyCount: 0,
      createdAt: firestore.FieldValue.serverTimestamp(),
      updatedAt: firestore.FieldValue.serverTimestamp(),
    });

    if (replyTo) {
      await firestore().doc(`projects/${projectId}/pages/${pageId}/notes/${replyTo.id}`)
        .update({ replyCount: firestore.FieldValue.increment(1) });
    }
    setReplyTo(null);
    setIsTask(false);
  }

  async function toggleTask(note: MobileNote) {
    const order: TaskStatus[] = ['todo','doing','done'];
    const next = order[(order.indexOf(note.taskStatus||'todo')+1)%3];
    await firestore().doc(`projects/${projectId}/pages/${pageId}/notes/${note.id}`)
      .update({ taskStatus: next });
  }

  const rootNotes = notes
    .filter((n) => !n.parentNoteId)
    .sort((a,b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return 0;
    });

  return (
    <>
      <Stack.Screen options={{ title: `${page?.icon||'📄'} ${page?.title||''}` }} />
      <KeyboardAvoidingView
        style={s.container}
        behavior={Platform.OS==='ios' ? 'padding' : undefined}
        keyboardVerticalOffset={90}
      >
        <FlatList
          data={rootNotes}
          keyExtractor={(n) => n.id}
          contentContainerStyle={{ padding:12, paddingBottom:20 }}
          ListEmptyComponent={
            <View style={s.emptyBox}>
              <Text style={s.emptyIcon}>💬</Text>
              <Text style={s.emptyText}>İlk notu ekle</Text>
            </View>
          }
          renderItem={({ item: note }) => {
            const replies = notes.filter((n) => n.parentNoteId===note.id);
            return (
              <View>
                <NoteCard note={note} onReply={setReplyTo} onTaskToggle={toggleTask} />
                {replies.map((r) => (
                  <View key={r.id} style={s.replyWrap}>
                    <NoteCard note={r} onReply={setReplyTo} onTaskToggle={toggleTask} />
                  </View>
                ))}
              </View>
            );
          }}
        />

        {/* Input bar */}
        <View style={s.inputBar}>
          {replyTo && (
            <View style={s.replyPreview}>
              <Text style={s.replyPreviewText} numberOfLines={1}>↩ {replyTo.authorName}: {replyTo.content}</Text>
              <TouchableOpacity onPress={() => setReplyTo(null)}>
                <Text style={s.replyClose}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
          <View style={s.inputRow}>
            <TouchableOpacity onPress={() => setIsTask(!isTask)} style={[s.taskToggle, isTask && s.taskToggleActive]}>
              <Text style={s.taskToggleText}>{isTask ? '✅' : '○'}</Text>
            </TouchableOpacity>
            <TextInput
              ref={inputRef}
              style={s.input}
              placeholder="Not yaz..."
              value={text}
              onChangeText={setText}
              multiline
              returnKeyType="send"
              onSubmitEditing={send}
            />
            <TouchableOpacity onPress={send} disabled={!text.trim()} style={[s.sendBtn, !text.trim() && s.sendBtnDisabled]}>
              <Text style={s.sendBtnText}>↑</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </>
  );
}

const s = StyleSheet.create({
  container:        { flex:1, backgroundColor:'#f9fafb' },
  emptyBox:         { alignItems:'center', paddingTop:80 },
  emptyIcon:        { fontSize:48, marginBottom:12 },
  emptyText:        { color:'#9ca3af', fontSize:15 },
  noteCard:         { backgroundColor:'#fff', borderRadius:16, padding:14, marginBottom:8, borderWidth:1, borderColor:'#f3f4f6' },
  noteCardPinned:   { borderColor:'#fcd34d', backgroundColor:'#fffbeb' },
  noteHeader:       { flexDirection:'row', alignItems:'center', marginBottom:6, gap:6 },
  pin:              { fontSize:12 },
  noteAuthor:       { fontSize:13, fontWeight:'600', color:'#374151', flex:1 },
  noteTime:         { fontSize:11, color:'#9ca3af' },
  noteContent:      { fontSize:14, color:'#1f2937', lineHeight:20 },
  noteActions:      { flexDirection:'row', gap:8, marginTop:10, flexWrap:'wrap' },
  taskBadge:        { borderRadius:20, paddingHorizontal:10, paddingVertical:4 },
  taskBadgeText:    { fontSize:12, color:'#374151', fontWeight:'500' },
  replyBtn:         { paddingVertical:4 },
  replyBtnText:     { fontSize:12, color:'#6366f1' },
  replyWrap:        { marginLeft:20, borderLeftWidth:2, borderLeftColor:'#e5e7eb', paddingLeft:8 },
  inputBar:         { backgroundColor:'#fff', borderTopWidth:1, borderTopColor:'#f3f4f6', paddingHorizontal:12, paddingVertical:8, paddingBottom: Platform.OS==='ios' ? 24 : 8 },
  replyPreview:     { flexDirection:'row', alignItems:'center', backgroundColor:'#eef2ff', borderRadius:8, paddingHorizontal:10, paddingVertical:4, marginBottom:6 },
  replyPreviewText: { flex:1, fontSize:12, color:'#6366f1' },
  replyClose:       { color:'#6366f1', fontSize:14, paddingLeft:8 },
  inputRow:         { flexDirection:'row', alignItems:'flex-end', gap:8 },
  taskToggle:       { width:36, height:36, borderRadius:18, backgroundColor:'#f3f4f6', alignItems:'center', justifyContent:'center' },
  taskToggleActive: { backgroundColor:'#d1fae5' },
  taskToggleText:   { fontSize:16 },
  input:            { flex:1, backgroundColor:'#f9fafb', borderRadius:16, paddingHorizontal:14, paddingVertical:10, fontSize:14, maxHeight:120, borderWidth:1, borderColor:'#e5e7eb' },
  sendBtn:          { width:36, height:36, borderRadius:18, backgroundColor:'#6366f1', alignItems:'center', justifyContent:'center' },
  sendBtnDisabled:  { backgroundColor:'#c7d2fe' },
  sendBtnText:      { color:'#fff', fontSize:18, fontWeight:'bold' },
});
