'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { subscribeNotes, addNote, updateTaskStatus, deleteNote, togglePin, convertToTask } from '@/lib/notes';
import { Note, Page, TaskStatus } from '@pnot/shared';
import { useI18n } from '@/lib/i18n/context';
import Link from 'next/link';

// ── Note Item ──────────────────────────────────────────────────────────────────
function NoteItem({
  note, allNotes, projectId, pageId, user, depth = 0,
}: {
  note: Note;
  allNotes: Note[];
  projectId: string;
  pageId: string;
  user: { uid: string; displayName: string | null; photoURL: string | null };
  depth?: number;
}) {
  const { t } = useI18n();
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const replies = allNotes.filter((n) => n.parentNoteId === note.id);

  async function submitReply() {
    if (!replyText.trim()) return;
    await addNote(projectId, pageId, replyText.trim(), {
      uid: user.uid,
      displayName: user.displayName || 'User',
      photoURL: user.photoURL || '',
    }, note.id);
    setReplyText('');
    setShowReply(false);
  }

  const taskColors: Record<TaskStatus, string> = {
    todo: 'bg-gray-100 text-gray-600',
    doing: 'bg-blue-100 text-blue-600',
    done: 'bg-green-100 text-green-600',
  };

  const taskNextLabel: Record<TaskStatus, string> = {
    todo: '○ Yapılacak',
    doing: '◑ Yapılıyor',
    done: '● Tamamlandı',
  };

  return (
    <div className={depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}>
      <div className={`bg-white rounded-xl border border-gray-100 p-4 mb-2 group ${note.isPinned ? 'border-amber-200 bg-amber-50' : ''}`}>
        <div className="flex items-center gap-2 mb-2 flex-wrap">
          {note.isPinned && <span className="text-xs text-amber-500">📌</span>}
          <span className="text-sm font-medium text-gray-700">{note.authorName}</span>
          <span className="text-xs text-gray-400">
            {note.createdAt?.toDate?.()?.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
          </span>
          {note.isTask && (
            <button
              onClick={() => {
                const s: TaskStatus[] = ['todo', 'doing', 'done'];
                updateTaskStatus(projectId, pageId, note.id, s[(s.indexOf(note.taskStatus || 'todo') + 1) % 3]);
              }}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${taskColors[note.taskStatus || 'todo']}`}
            >
              {taskNextLabel[note.taskStatus || 'todo']}
            </button>
          )}
        </div>

        <p className="text-gray-800 whitespace-pre-wrap text-sm">{note.content}</p>

        <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition flex-wrap">
          <button onClick={() => setShowReply(!showReply)} className="text-xs text-gray-400 hover:text-indigo-600">
            {t('note.reply')} {replies.length > 0 && `(${replies.length})`}
          </button>
          {!note.isTask && (
            <button onClick={() => convertToTask(projectId, pageId, note.id, true)} className="text-xs text-gray-400 hover:text-indigo-600">
              {t('note.to_task')}
            </button>
          )}
          <button onClick={() => togglePin(projectId, pageId, note.id, note.isPinned)} className="text-xs text-gray-400 hover:text-amber-500">
            {note.isPinned ? t('note.unpin') : t('note.pin')}
          </button>
          {note.authorUid === user.uid && (
            <button onClick={() => deleteNote(projectId, pageId, note.id)} className="text-xs text-gray-400 hover:text-red-500">Sil</button>
          )}
        </div>

        {showReply && (
          <div className="mt-3 flex gap-2">
            <input
              placeholder={`${t('note.reply')}...`}
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submitReply())}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
              autoFocus
            />
            <button onClick={submitReply} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">
              {t('note.send')}
            </button>
          </div>
        )}
      </div>

      {replies.map((r) => (
        <NoteItem key={r.id} note={r} allNotes={allNotes} projectId={projectId} pageId={pageId} user={user} depth={depth + 1} />
      ))}
    </div>
  );
}

// ── Kanban Column ──────────────────────────────────────────────────────────────
function KanbanColumn({
  status, label, color, notes, projectId, pageId,
}: {
  status: TaskStatus;
  label: string;
  color: string;
  notes: Note[];
  projectId: string;
  pageId: string;
}) {
  return (
    <div className="flex-1 min-w-[240px]">
      <div className={`flex items-center gap-2 mb-3 px-1`}>
        <div className={`w-2.5 h-2.5 rounded-full ${color}`} />
        <span className="text-sm font-semibold text-gray-700">{label}</span>
        <span className="text-xs text-gray-400 ml-auto bg-gray-100 px-2 py-0.5 rounded-full">{notes.length}</span>
      </div>
      <div className="space-y-2 min-h-[80px]">
        {notes.map((note) => (
          <div key={note.id} className="bg-white rounded-xl border border-gray-100 p-4">
            <p className="text-sm text-gray-800 mb-3">{note.content}</p>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-400">{note.authorName}</span>
              <div className="flex gap-1">
                {(['todo', 'doing', 'done'] as TaskStatus[]).filter((s) => s !== status).map((s) => (
                  <button
                    key={s}
                    onClick={() => updateTaskStatus(projectId, pageId, note.id, s)}
                    className="text-xs text-gray-400 hover:text-indigo-600 border border-gray-100 rounded px-2 py-0.5"
                  >
                    {s === 'todo' ? '○' : s === 'doing' ? '◑' : '●'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function PageView() {
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { t } = useI18n();
  const [page, setPage] = useState<Page | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [isTask, setIsTask] = useState(false);
  const [view, setView] = useState<'notes' | 'kanban'>('notes');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    return onSnapshot(doc(db, `projects/${projectId}/pages/${pageId}`), (snap) => {
      if (snap.exists()) setPage({ id: snap.id, ...snap.data() } as Page);
    });
  }, [projectId, pageId]);

  useEffect(() => {
    return subscribeNotes(projectId, pageId, setNotes);
  }, [projectId, pageId]);

  async function handleSubmit() {
    if (!user || !text.trim()) return;
    const content = text.trim();
    setText('');
    const noteId = await addNote(projectId, pageId, content, {
      uid: user.uid,
      displayName: user.displayName || 'User',
      photoURL: user.photoURL || '',
    });
    if (isTask) await convertToTask(projectId, pageId, noteId, true);
    inputRef.current?.focus();
  }

  const rootNotes = notes
    .filter((n) => n.parentNoteId === null)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    });

  const taskNotes = notes.filter((n) => n.isTask && n.parentNoteId === null);
  const byStatus = {
    todo:  taskNotes.filter((n) => n.taskStatus === 'todo' || !n.taskStatus),
    doing: taskNotes.filter((n) => n.taskStatus === 'doing'),
    done:  taskNotes.filter((n) => n.taskStatus === 'done'),
  };

  if (!user) return null;

  return (
    <main className="max-w-4xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-4">
        <Link href="/dashboard" className="hover:text-indigo-600">{t('nav.projects')}</Link>
        <span>/</span>
        <Link href={`/dashboard/projects/${projectId}`} className="hover:text-indigo-600">Proje</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{page?.icon} {page?.title}</span>
      </div>

      {/* View toggle */}
      <div className="flex items-center gap-1 mb-6 bg-gray-100 rounded-xl p-1 w-fit">
        <button
          onClick={() => setView('notes')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'notes' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          💬 Notlar
        </button>
        <button
          onClick={() => setView('kanban')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${view === 'kanban' ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
        >
          📋 Kanban {taskNotes.length > 0 && <span className="ml-1 text-xs bg-indigo-100 text-indigo-600 px-1.5 py-0.5 rounded-full">{taskNotes.length}</span>}
        </button>
      </div>

      {/* ── Notes view ── */}
      {view === 'notes' && (
        <div className="space-y-1 mb-6">
          {rootNotes.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <p className="text-5xl mb-3">💬</p>
              <p>{t('note.add')}</p>
            </div>
          ) : (
            rootNotes.map((n) => (
              <NoteItem key={n.id} note={n} allNotes={notes} projectId={projectId} pageId={pageId} user={user} />
            ))
          )}
        </div>
      )}

      {/* ── Kanban view ── */}
      {view === 'kanban' && (
        <div className="flex gap-4 overflow-x-auto pb-4 mb-6">
          <KanbanColumn status="todo"  label="Yapılacak" color="bg-gray-400"  notes={byStatus.todo}  projectId={projectId} pageId={pageId} />
          <KanbanColumn status="doing" label="Yapılıyor" color="bg-blue-400"  notes={byStatus.doing} projectId={projectId} pageId={pageId} />
          <KanbanColumn status="done"  label="Tamamlandı" color="bg-green-400" notes={byStatus.done}  projectId={projectId} pageId={pageId} />
        </div>
      )}

      {/* Input bar */}
      <div className="sticky bottom-0 bg-gray-50 pt-4 pb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <textarea
            ref={inputRef}
            placeholder={`${t('note.add')} (Enter = gönder, Shift+Enter = yeni satır)`}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
            }}
            className="w-full outline-none resize-none text-gray-800 text-sm min-h-[60px] max-h-40"
            rows={2}
          />
          <div className="flex items-center justify-between mt-2">
            <label className="flex items-center gap-2 text-sm text-gray-500 cursor-pointer select-none">
              <input type="checkbox" checked={isTask} onChange={(e) => setIsTask(e.target.checked)} className="rounded" />
              {t('note.as_task')}
            </label>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition"
            >
              {t('note.send')}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
