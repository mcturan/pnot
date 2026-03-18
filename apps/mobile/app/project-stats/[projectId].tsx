import { useEffect, useState, useMemo } from 'react';
import {
  View, Text, ScrollView, StyleSheet, ActivityIndicator, TouchableOpacity,
} from 'react-native';
import { useLocalSearchParams, useRouter, Stack } from 'expo-router';
import firestore, { FirebaseFirestoreTypes } from '@react-native-firebase/firestore';
import { Project, Page, Note, TaskStatus } from '@pnot/shared';

type NoteEx = Note & { id: string; pageId: string };

interface MemberStat {
  uid: string;
  name: string;
  notes: number;
  replies: number;
  tasks: number;
  tasksDone: number;
}

interface DayStat {
  label: string;
  count: number;
}

interface PageStat {
  id: string;
  title: string;
  icon: string;
  noteCount: number;
  taskCount: number;
}

function MiniBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? value / max : 0;
  return (
    <View style={mb.wrap}>
      <View style={mb.track}>
        <View style={[mb.fill, { width: `${Math.round(pct * 100)}%` as any, backgroundColor: color }]} />
      </View>
      <Text style={mb.label}>{value}</Text>
    </View>
  );
}

const mb = StyleSheet.create({
  wrap:  { flexDirection: 'row', alignItems: 'center', gap: 8 },
  track: { flex: 1, height: 6, backgroundColor: '#f3f4f6', borderRadius: 3, overflow: 'hidden' },
  fill:  { height: 6, borderRadius: 3 },
  label: { fontSize: 11, color: '#9ca3af', width: 24, textAlign: 'right' },
});

export default function ProjectStatsScreen() {
  const { projectId } = useLocalSearchParams<{ projectId: string }>();
  const router = useRouter();

  const [project, setProject]   = useState<Project | null>(null);
  const [pages, setPages]       = useState<Page[]>([]);
  const [allNotes, setAllNotes] = useState<NoteEx[]>([]);
  const [loading, setLoading]   = useState(true);

  useEffect(() => {
    return firestore().doc(`projects/${projectId}`).onSnapshot((s) => {
      if (s.exists()) setProject({ id: s.id, ...s.data() } as Project);
    });
  }, [projectId]);

  useEffect(() => {
    return firestore()
      .collection(`projects/${projectId}/pages`)
      .orderBy('order', 'asc')
      .onSnapshot((s) => setPages(s.docs.map((d) => ({ id: d.id, ...d.data() } as Page))));
  }, [projectId]);

  // Load all notes from all pages
  useEffect(() => {
    if (!pages.length) { setLoading(false); return; }
    setLoading(true);
    Promise.all(
      pages.map((pg) =>
        firestore()
          .collection(`projects/${projectId}/pages/${pg.id}/notes`)
          .orderBy('createdAt', 'asc')
          .get()
          .then((snap) =>
            snap.docs.map((d) => ({ id: d.id, pageId: pg.id, ...d.data() } as NoteEx))
          )
      )
    ).then((results) => {
      setAllNotes(results.flat());
      setLoading(false);
    });
  }, [pages, projectId]);

  // Aggregations
  const memberStats = useMemo<MemberStat[]>(() => {
    const map = new Map<string, MemberStat>();
    allNotes.forEach((n) => {
      if (!map.has(n.authorUid)) {
        map.set(n.authorUid, { uid: n.authorUid, name: n.authorName, notes: 0, replies: 0, tasks: 0, tasksDone: 0 });
      }
      const m = map.get(n.authorUid)!;
      if (n.parentNoteId) { m.replies++; } else { m.notes++; }
      if (n.isTask) { m.tasks++; if (n.taskStatus === 'done') m.tasksDone++; }
    });
    return Array.from(map.values()).sort((a, b) => (b.notes + b.replies) - (a.notes + a.replies));
  }, [allNotes]);

  const taskStats = useMemo(() => {
    const todo  = allNotes.filter((n) => n.isTask && n.taskStatus === 'todo').length;
    const doing = allNotes.filter((n) => n.isTask && n.taskStatus === 'doing').length;
    const done  = allNotes.filter((n) => n.isTask && n.taskStatus === 'done').length;
    return { todo, doing, done, total: todo + doing + done };
  }, [allNotes]);

  const doneRate = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  const timeline = useMemo<DayStat[]>(() => {
    const days: DayStat[] = [];
    const now = new Date();
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('tr-TR', { weekday: 'short' });
      const count = allNotes.filter((n) => {
        const ts = (n.createdAt as FirebaseFirestoreTypes.Timestamp)?.toDate?.();
        return ts?.toISOString().slice(0, 10) === dateStr;
      }).length;
      days.push({ label, count });
    }
    return days;
  }, [allNotes]);

  const maxDay = useMemo(() => Math.max(...timeline.map((d) => d.count), 1), [timeline]);

  const pageStats = useMemo<PageStat[]>(() => {
    return pages.map((pg) => {
      const pgNotes = allNotes.filter((n) => n.pageId === pg.id);
      return { id: pg.id, title: pg.title, icon: pg.icon || '📄', noteCount: pgNotes.length, taskCount: pgNotes.filter((n) => n.isTask).length };
    }).sort((a, b) => b.noteCount - a.noteCount);
  }, [pages, allNotes]);

  const maxPageNotes = useMemo(() => Math.max(...pageStats.map((p) => p.noteCount), 1), [pageStats]);
  const maxMemberNotes = useMemo(() => Math.max(...memberStats.map((m) => m.notes + m.replies), 1), [memberStats]);

  const totalNotes = allNotes.filter((n) => !n.parentNoteId).length;

  if (!project) {
    return <View style={s.center}><ActivityIndicator color="#6366f1" /></View>;
  }

  return (
    <>
      <Stack.Screen options={{ title: `${project.emoji} İstatistikler` }} />
      <ScrollView style={s.container} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Summary cards */}
        <View style={s.cardRow}>
          <View style={s.summaryCard}>
            <Text style={s.summaryIcon}>💬</Text>
            <Text style={s.summaryValue}>{totalNotes}</Text>
            <Text style={s.summaryLabel}>Not</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryIcon}>✅</Text>
            <Text style={s.summaryValue}>%{doneRate}</Text>
            <Text style={s.summaryLabel}>Tamamlandı</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryIcon}>👥</Text>
            <Text style={s.summaryValue}>{(project.members?.length ?? 0) + 1}</Text>
            <Text style={s.summaryLabel}>Üye</Text>
          </View>
          <View style={s.summaryCard}>
            <Text style={s.summaryIcon}>📄</Text>
            <Text style={s.summaryValue}>{pages.length}</Text>
            <Text style={s.summaryLabel}>Sayfa</Text>
          </View>
        </View>

        {/* Activity timeline (7 days) */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📅 Son 7 Gün</Text>
          {loading ? (
            <ActivityIndicator color="#6366f1" style={{ marginVertical: 16 }} />
          ) : (
            <View style={s.chartRow}>
              {timeline.map((d, i) => {
                const barH = maxDay > 0 ? Math.max((d.count / maxDay) * 60, d.count > 0 ? 4 : 2) : 2;
                const isToday = i === 6;
                return (
                  <View key={i} style={s.barCol}>
                    {d.count > 0 && <Text style={s.barCount}>{d.count}</Text>}
                    <View
                      style={[
                        s.bar,
                        { height: barH, backgroundColor: isToday ? '#6366f1' : d.count > 0 ? '#a5b4fc' : '#f3f4f6' },
                      ]}
                    />
                    <Text style={[s.barLabel, isToday && { color: '#6366f1' }]}>{d.label}</Text>
                  </View>
                );
              })}
            </View>
          )}
        </View>

        {/* Task status */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📋 Görev Durumu</Text>
          {taskStats.total === 0 && !loading ? (
            <Text style={s.emptyText}>Henüz görev yok</Text>
          ) : (
            <>
              {[
                { label: '○ Yapılacak', count: taskStats.todo, color: '#e5e7eb' },
                { label: '◑ Yapılıyor', count: taskStats.doing, color: '#93c5fd' },
                { label: '● Tamamlandı', count: taskStats.done, color: '#6ee7b7' },
              ].map((row) => (
                <View key={row.label} style={s.taskRow}>
                  <View style={[s.dot, { backgroundColor: row.color }]} />
                  <Text style={s.taskLabel}>{row.label}</Text>
                  <Text style={s.taskCount}>{row.count}</Text>
                </View>
              ))}
              {/* Progress bar */}
              <View style={s.taskProgress}>
                {taskStats.total > 0 && (
                  <>
                    <View style={[s.taskSeg, { flex: taskStats.done || 0.001, backgroundColor: '#6ee7b7' }]} />
                    <View style={[s.taskSeg, { flex: taskStats.doing || 0.001, backgroundColor: '#93c5fd' }]} />
                    <View style={[s.taskSeg, { flex: taskStats.todo || 0.001, backgroundColor: '#e5e7eb' }]} />
                  </>
                )}
              </View>
              <Text style={s.doneRateText}>%{doneRate} tamamlandı</Text>
            </>
          )}
        </View>

        {/* Member stats */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>👥 Üye Katılımı</Text>
          {loading ? (
            <ActivityIndicator color="#6366f1" />
          ) : memberStats.length === 0 ? (
            <Text style={s.emptyText}>Henüz not yok</Text>
          ) : (
            memberStats.map((m, i) => {
              const totalAct = m.notes + m.replies;
              const totalAll = memberStats.reduce((sum, x) => sum + x.notes + x.replies, 0);
              const share = totalAll > 0 ? Math.round((totalAct / totalAll) * 100) : 0;
              return (
                <View key={m.uid} style={s.memberRow}>
                  <View style={s.avatar}>
                    <Text style={s.avatarText}>{m.name?.[0] || '?'}</Text>
                  </View>
                  <View style={{ flex: 1 }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 4 }}>
                      <Text style={s.memberName} numberOfLines={1}>{m.name}</Text>
                      {i === 0 && <Text style={{ marginLeft: 4 }}>🏆</Text>}
                      <Text style={s.memberShare}> %{share}</Text>
                    </View>
                    <MiniBar value={m.notes + m.replies} max={maxMemberNotes} color="#6366f1" />
                    <Text style={s.memberMeta}>💬 {m.notes} not · ↩ {m.replies} yanıt{m.tasks > 0 ? ` · ✅ ${m.tasksDone}/${m.tasks}` : ''}</Text>
                  </View>
                </View>
              );
            })
          )}
        </View>

        {/* Page breakdown */}
        <View style={s.section}>
          <Text style={s.sectionTitle}>📄 Sayfa Aktivitesi</Text>
          {loading ? (
            <ActivityIndicator color="#6366f1" />
          ) : pageStats.length === 0 ? (
            <Text style={s.emptyText}>Henüz sayfa yok</Text>
          ) : (
            pageStats.map((pg) => (
              <TouchableOpacity
                key={pg.id}
                style={s.pageRow}
                onPress={() => router.push(`/page/${projectId}/${pg.id}`)}
              >
                <Text style={s.pageIcon}>{pg.icon}</Text>
                <View style={{ flex: 1, gap: 4 }}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <Text style={s.pageTitle} numberOfLines={1}>{pg.title}</Text>
                    <Text style={s.pageNoteCount}>{pg.noteCount} not</Text>
                  </View>
                  <View style={s.pageBar}>
                    <View
                      style={[s.pageBarFill, { width: `${Math.round((pg.noteCount / maxPageNotes) * 100)}%` as any }]}
                    />
                  </View>
                </View>
              </TouchableOpacity>
            ))
          )}
        </View>

      </ScrollView>
    </>
  );
}

const s = StyleSheet.create({
  container:    { flex: 1, backgroundColor: '#f9fafb' },
  center:       { flex: 1, alignItems: 'center', justifyContent: 'center' },
  cardRow:      { flexDirection: 'row', gap: 8, marginBottom: 12 },
  summaryCard:  { flex: 1, backgroundColor: '#fff', borderRadius: 16, padding: 12, alignItems: 'center', borderWidth: 1, borderColor: '#f3f4f6' },
  summaryIcon:  { fontSize: 18, marginBottom: 4 },
  summaryValue: { fontSize: 18, fontWeight: 'bold', color: '#111827' },
  summaryLabel: { fontSize: 10, color: '#9ca3af', marginTop: 2 },
  section:      { backgroundColor: '#fff', borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  sectionTitle: { fontSize: 14, fontWeight: '600', color: '#374151', marginBottom: 14 },
  // Timeline
  chartRow:     { flexDirection: 'row', alignItems: 'flex-end', gap: 4, height: 80 },
  barCol:       { flex: 1, alignItems: 'center', gap: 2 },
  barCount:     { fontSize: 9, color: '#6366f1' },
  bar:          { width: '80%', borderRadius: 3 },
  barLabel:     { fontSize: 9, color: '#9ca3af' },
  // Tasks
  taskRow:      { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  dot:          { width: 10, height: 10, borderRadius: 5 },
  taskLabel:    { flex: 1, fontSize: 13, color: '#4b5563' },
  taskCount:    { fontSize: 14, fontWeight: '600', color: '#111827' },
  taskProgress: { flexDirection: 'row', height: 6, borderRadius: 3, overflow: 'hidden', marginTop: 8, marginBottom: 4 },
  taskSeg:      { height: 6 },
  doneRateText: { fontSize: 11, color: '#9ca3af', textAlign: 'right' },
  emptyText:    { color: '#d1d5db', fontSize: 13, textAlign: 'center', paddingVertical: 12 },
  // Members
  memberRow:    { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginBottom: 14 },
  avatar:       { width: 34, height: 34, borderRadius: 17, backgroundColor: '#eef2ff', alignItems: 'center', justifyContent: 'center' },
  avatarText:   { fontSize: 15, fontWeight: '700', color: '#6366f1' },
  memberName:   { flex: 1, fontSize: 13, fontWeight: '600', color: '#111827' },
  memberShare:  { fontSize: 11, color: '#9ca3af' },
  memberMeta:   { fontSize: 11, color: '#9ca3af', marginTop: 4 },
  // Pages
  pageRow:      { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  pageIcon:     { fontSize: 18 },
  pageTitle:    { flex: 1, fontSize: 13, fontWeight: '600', color: '#374151' },
  pageNoteCount:{ fontSize: 11, color: '#9ca3af' },
  pageBar:      { height: 4, backgroundColor: '#f3f4f6', borderRadius: 2, overflow: 'hidden' },
  pageBarFill:  { height: 4, backgroundColor: '#a5b4fc', borderRadius: 2 },
});
