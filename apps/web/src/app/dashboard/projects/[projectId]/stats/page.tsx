'use client';
import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot, collection, getDocs, query, orderBy } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { subscribePages } from '@/lib/projects';
import { Project, Page, Note } from '@pnot/shared';
import Link from 'next/link';

interface MemberStat {
  uid: string;
  name: string;
  photo: string;
  notes: number;
  tasks: number;
  tasksDone: number;
  replies: number;
}

interface DayStat {
  label: string; // "Mon 3"
  date: string;  // "YYYY-MM-DD"
  count: number;
}

interface PageStat {
  id: string;
  title: string;
  icon: string;
  noteCount: number;
  taskCount: number;
}

function BarMini({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
        <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-gray-400 w-8 text-right">{value}</span>
    </div>
  );
}

function StatCard({ icon, label, value, sub }: { icon: string; label: string; value: string | number; sub?: string }) {
  return (
    <div className="bg-white rounded-2xl p-5 border border-gray-100 shadow-sm">
      <div className="text-2xl mb-2">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-sm font-medium text-gray-500 mt-0.5">{label}</div>
      {sub && <div className="text-xs text-gray-400 mt-1">{sub}</div>}
    </div>
  );
}

export default function ProjectStatsPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();

  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [allNotes, setAllNotes] = useState<(Note & { id: string; pageId: string })[]>([]);
  const [loading, setLoading] = useState(true);

  // Project listener
  useEffect(() => {
    return onSnapshot(doc(db, 'projects', projectId), (s) => {
      if (s.exists()) setProject({ id: s.id, ...s.data() } as Project);
    });
  }, [projectId]);

  // Pages listener
  useEffect(() => {
    return subscribePages(projectId, setPages);
  }, [projectId]);

  // Load all notes across all pages
  useEffect(() => {
    if (!pages.length) { setLoading(false); return; }
    (async () => {
      setLoading(true);
      const results: (Note & { id: string; pageId: string })[] = [];
      await Promise.all(
        pages.map(async (pg) => {
          const snap = await getDocs(
            query(
              collection(db, `projects/${projectId}/pages/${pg.id}/notes`),
              orderBy('createdAt', 'asc'),
            )
          );
          snap.docs.forEach((d) => {
            results.push({ id: d.id, pageId: pg.id, ...d.data() } as any);
          });
        })
      );
      setAllNotes(results);
      setLoading(false);
    })();
  }, [pages, projectId]);

  // ── Aggregations ──────────────────────────────────────────────────────────

  const memberStats = useMemo<MemberStat[]>(() => {
    const map = new Map<string, MemberStat>();
    allNotes.forEach((n) => {
      if (!map.has(n.authorUid)) {
        map.set(n.authorUid, {
          uid: n.authorUid,
          name: n.authorName,
          photo: (n as any).authorPhoto || '',
          notes: 0,
          tasks: 0,
          tasksDone: 0,
          replies: 0,
        });
      }
      const m = map.get(n.authorUid)!;
      if (n.parentNoteId) { m.replies++; } else { m.notes++; }
      if (n.isTask) { m.tasks++; if (n.taskStatus === 'done') m.tasksDone++; }
    });
    return Array.from(map.values()).sort((a, b) => (b.notes + b.replies) - (a.notes + a.replies));
  }, [allNotes]);

  const taskStats = useMemo(() => {
    const todo = allNotes.filter((n) => n.isTask && n.taskStatus === 'todo').length;
    const doing = allNotes.filter((n) => n.isTask && n.taskStatus === 'doing').length;
    const done = allNotes.filter((n) => n.isTask && n.taskStatus === 'done').length;
    const total = todo + doing + done;
    return { todo, doing, done, total };
  }, [allNotes]);

  const pageStats = useMemo<PageStat[]>(() => {
    return pages.map((pg) => {
      const pgNotes = allNotes.filter((n) => n.pageId === pg.id);
      return {
        id: pg.id,
        title: pg.title,
        icon: pg.icon || '📄',
        noteCount: pgNotes.length,
        taskCount: pgNotes.filter((n) => n.isTask).length,
      };
    }).sort((a, b) => b.noteCount - a.noteCount);
  }, [pages, allNotes]);

  const timeline = useMemo<DayStat[]>(() => {
    const days: DayStat[] = [];
    const now = new Date();
    for (let i = 13; i >= 0; i--) {
      const d = new Date(now);
      d.setDate(d.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      const label = d.toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric' });
      days.push({ label, date: dateStr, count: 0 });
    }
    allNotes.forEach((n) => {
      const ts = (n.createdAt as any)?.toDate?.();
      if (!ts) return;
      const dateStr = ts.toISOString().slice(0, 10);
      const day = days.find((d) => d.date === dateStr);
      if (day) day.count++;
    });
    return days;
  }, [allNotes]);

  const maxDay = useMemo(() => Math.max(...timeline.map((d) => d.count), 1), [timeline]);
  const maxMemberNotes = useMemo(
    () => Math.max(...memberStats.map((m) => m.notes + m.replies), 1),
    [memberStats]
  );

  if (!project) {
    return (
      <div className="flex items-center justify-center h-64 text-gray-400">
        Yükleniyor...
      </div>
    );
  }

  const totalNotes = allNotes.filter((n) => !n.parentNoteId).length;
  const totalReplies = allNotes.filter((n) => !!n.parentNoteId).length;
  const memberCount = (project.members?.length ?? 0) + 1;
  const doneRate = taskStats.total > 0 ? Math.round((taskStats.done / taskStats.total) * 100) : 0;

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Back link */}
      <Link
        href={`/dashboard/projects/${projectId}`}
        className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-indigo-600 mb-6 transition-colors"
      >
        ← {project.emoji} {project.name}
      </Link>

      <h1 className="text-2xl font-bold text-gray-900 mb-6">📊 Proje İstatistikleri</h1>

      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <StatCard icon="💬" label="Toplam Not" value={totalNotes} sub={`${totalReplies} yanıt dahil değil`} />
        <StatCard icon="✅" label="Görev Tamamlama" value={`%${doneRate}`} sub={`${taskStats.done}/${taskStats.total} görev`} />
        <StatCard icon="👥" label="Üye" value={memberCount} />
        <StatCard icon="📄" label="Sayfa" value={pages.length} />
      </div>

      {/* Activity Timeline */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm mb-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">📅 Son 14 Günlük Aktivite</h2>
        {loading ? (
          <div className="h-24 flex items-center justify-center text-gray-300">Yükleniyor...</div>
        ) : (
          <div className="flex items-end gap-1 h-24">
            {timeline.map((d) => {
              const pct = Math.round((d.count / maxDay) * 100);
              const isToday = d.date === new Date().toISOString().slice(0, 10);
              return (
                <div key={d.date} className="flex-1 flex flex-col items-center gap-1 group">
                  <div className="relative w-full flex items-end justify-center">
                    <div
                      title={`${d.label}: ${d.count} not`}
                      className="w-full rounded-t transition-all group-hover:opacity-80"
                      style={{
                        height: `${Math.max(pct * 0.72, d.count > 0 ? 4 : 1)}px`,
                        backgroundColor: isToday ? '#6366f1' : d.count > 0 ? '#a5b4fc' : '#f3f4f6',
                      }}
                    />
                  </div>
                  {d.count > 0 && (
                    <span className="text-[9px] text-indigo-400 font-medium">{d.count}</span>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex justify-between mt-1">
          <span className="text-[10px] text-gray-300">{timeline[0]?.label}</span>
          <span className="text-[10px] text-gray-300">{timeline[13]?.label}</span>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        {/* Member Stats */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">👥 Üye Katılımı</h2>
          {loading ? (
            <div className="text-gray-300 text-sm">Yükleniyor...</div>
          ) : memberStats.length === 0 ? (
            <div className="text-gray-300 text-sm">Henüz not yok</div>
          ) : (
            <div className="space-y-4">
              {memberStats.map((m, i) => {
                const totalActivity = m.notes + m.replies;
                const pct = memberStats.reduce((sum, x) => sum + x.notes + x.replies, 0);
                const share = pct > 0 ? Math.round((totalActivity / pct) * 100) : 0;
                return (
                  <div key={m.uid}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-xs font-bold text-indigo-600 shrink-0">
                        {m.photo
                          ? <img src={m.photo} className="w-7 h-7 rounded-full" alt="" />
                          : m.name?.[0] || '?'}
                      </div>
                      <span className="text-sm font-medium text-gray-800 flex-1 truncate">{m.name}</span>
                      <span className="text-xs text-gray-400">%{share}</span>
                      {i === 0 && <span className="text-xs">🏆</span>}
                    </div>
                    <BarMini value={m.notes} max={maxMemberNotes} color="#6366f1" />
                    <div className="flex gap-4 mt-1.5">
                      <span className="text-[11px] text-gray-400">💬 {m.notes} not</span>
                      <span className="text-[11px] text-gray-400">↩ {m.replies} yanıt</span>
                      {m.tasks > 0 && (
                        <span className="text-[11px] text-gray-400">✅ {m.tasksDone}/{m.tasks} görev</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Task Status */}
        <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
          <h2 className="text-base font-semibold text-gray-800 mb-4">📋 Görev Durumu</h2>

          {/* Donut-style progress */}
          <div className="flex items-center justify-center mb-6">
            <div className="relative w-28 h-28">
              <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                <circle cx="18" cy="18" r="15.9" fill="none" stroke="#f3f4f6" strokeWidth="3.8" />
                {taskStats.total > 0 && (
                  <>
                    {/* done */}
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#6ee7b7" strokeWidth="3.8"
                      strokeDasharray={`${(taskStats.done / taskStats.total) * 100} 100`}
                      strokeDashoffset="0" strokeLinecap="round" />
                    {/* doing */}
                    <circle cx="18" cy="18" r="15.9" fill="none" stroke="#93c5fd" strokeWidth="3.8"
                      strokeDasharray={`${(taskStats.doing / taskStats.total) * 100} 100`}
                      strokeDashoffset={`-${(taskStats.done / taskStats.total) * 100}`}
                      strokeLinecap="round" />
                  </>
                )}
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-gray-800">%{doneRate}</span>
                <span className="text-[10px] text-gray-400">tamamlandı</span>
              </div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              { label: '○ Yapılacak', count: taskStats.todo, color: '#e5e7eb' },
              { label: '◑ Yapılıyor', count: taskStats.doing, color: '#93c5fd' },
              { label: '● Tamamlandı', count: taskStats.done, color: '#6ee7b7' },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: row.color }} />
                <span className="text-sm text-gray-600 flex-1">{row.label}</span>
                <span className="text-sm font-semibold text-gray-800">{row.count}</span>
              </div>
            ))}
          </div>

          {taskStats.total === 0 && !loading && (
            <p className="text-gray-300 text-sm mt-4 text-center">Henüz görev yok</p>
          )}
        </div>
      </div>

      {/* Page Breakdown */}
      <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
        <h2 className="text-base font-semibold text-gray-800 mb-4">📄 Sayfa Aktivitesi</h2>
        {loading ? (
          <div className="text-gray-300 text-sm">Yükleniyor...</div>
        ) : pageStats.length === 0 ? (
          <div className="text-gray-300 text-sm">Henüz sayfa yok</div>
        ) : (
          <div className="space-y-3">
            {pageStats.map((pg) => {
              const maxPg = Math.max(...pageStats.map((p) => p.noteCount), 1);
              return (
                <div key={pg.id}>
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base">{pg.icon}</span>
                    <Link
                      href={`/dashboard/projects/${projectId}/${pg.id}`}
                      className="text-sm font-medium text-gray-700 hover:text-indigo-600 flex-1 truncate"
                    >
                      {pg.title}
                    </Link>
                    <span className="text-xs text-gray-400">{pg.noteCount} not</span>
                    {pg.taskCount > 0 && (
                      <span className="text-xs text-gray-400">· {pg.taskCount} görev</span>
                    )}
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full bg-indigo-400 transition-all"
                      style={{ width: `${Math.round((pg.noteCount / maxPg) * 100)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
