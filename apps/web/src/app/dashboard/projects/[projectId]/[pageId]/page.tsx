'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { subscribeNotes, addNote, updateTaskStatus, deleteNote, togglePin, convertToTask } from '@/lib/notes';
import { Note, Page, TaskStatus } from '@pnot/shared';
import Link from 'next/link';

function NoteItem({
  note,
  allNotes,
  projectId,
  pageId,
  user,
  depth = 0,
}: {
  note: Note;
  allNotes: Note[];
  projectId: string;
  pageId: string;
  user: { uid: string; displayName: string | null; photoURL: string | null };
  depth?: number;
}) {
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState('');
  const [expanded, setExpanded] = useState(true);
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

  return (
    <div className={`${depth > 0 ? 'ml-8 border-l-2 border-gray-100 pl-4' : ''}`}>
      <div className="bg-white rounded-xl border border-gray-100 p-4 mb-2 group">
        {/* Author + time */}
        <div className="flex items-center gap-2 mb-2">
          {note.isPinned && <span className="text-xs text-amber-500">📌</span>}
          <span className="text-sm font-medium text-gray-700">{note.authorName}</span>
          <span className="text-xs text-gray-400">
            {note.createdAt?.toDate?.()?.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: 'numeric', month: 'short' })}
          </span>
          {note.isTask && (
            <button
              onClick={() => {
                const statuses: TaskStatus[] = ['todo', 'doing', 'done'];
                const next = statuses[(statuses.indexOf(note.taskStatus || 'todo') + 1) % 3];
                updateTaskStatus(projectId, pageId, note.id, next);
              }}
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${taskColors[note.taskStatus || 'todo']}`}
            >
              {note.taskStatus === 'todo' ? '○ Yapılacak' : note.taskStatus === 'doing' ? '◑ Yapılıyor' : '● Tamamlandı'}
            </button>
          )}
        </div>

        {/* Content */}
        <p className="text-gray-800 whitespace-pre-wrap">{note.content}</p>

        {/* Actions */}
        <div className="flex items-center gap-3 mt-3 opacity-0 group-hover:opacity-100 transition">
          <button onClick={() => setShowReply(!showReply)} className="text-xs text-gray-400 hover:text-indigo-600">
            Yanıtla {replies.length > 0 && `(${replies.length})`}
          </button>
          {!note.isTask && (
            <button onClick={() => convertToTask(projectId, pageId, note.id, true)} className="text-xs text-gray-400 hover:text-indigo-600">
              Göreve Dönüştür
            </button>
          )}
          <button onClick={() => togglePin(projectId, pageId, note.id, note.isPinned)} className="text-xs text-gray-400 hover:text-amber-500">
            {note.isPinned ? 'Sabitlemeyi Kaldır' : 'Sabitle'}
          </button>
          {note.authorUid === user.uid && (
            <button onClick={() => deleteNote(projectId, pageId, note.id)} className="text-xs text-gray-400 hover:text-red-500">
              Sil
            </button>
          )}
        </div>

        {/* Reply input */}
        {showReply && (
          <div className="mt-3 flex gap-2">
            <input
              placeholder="Yanıt yaz..."
              value={replyText}
              onChange={(e) => setReplyText(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), submitReply())}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-indigo-400"
              autoFocus
            />
            <button onClick={submitReply} className="px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm">Gönder</button>
          </div>
        )}
      </div>

      {/* Replies */}
      {replies.map((r) => (
        <NoteItem key={r.id} note={r} allNotes={allNotes} projectId={projectId} pageId={pageId} user={user} depth={depth + 1} />
      ))}
    </div>
  );
}

export default function PageView() {
  const { projectId, pageId } = useParams<{ projectId: string; pageId: string }>();
  const { user } = useAuth();
  const [page, setPage] = useState<Page | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [text, setText] = useState('');
  const [isTask, setIsTask] = useState(false);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, `projects/${projectId}/pages/${pageId}`), (snap) => {
      if (snap.exists()) setPage({ id: snap.id, ...snap.data() } as Page);
    });
    return unsub;
  }, [projectId, pageId]);

  useEffect(() => {
    const unsub = subscribeNotes(projectId, pageId, setNotes);
    return unsub;
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
    if (isTask) {
      await convertToTask(projectId, pageId, noteId, true);
    }
    inputRef.current?.focus();
  }

  // Pinned first, then by time
  const rootNotes = notes
    .filter((n) => n.parentNoteId === null)
    .sort((a, b) => {
      if (a.isPinned && !b.isPinned) return -1;
      if (!a.isPinned && b.isPinned) return 1;
      return (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0);
    });

  if (!user) return null;

  return (
    <main className="max-w-3xl mx-auto px-4 py-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-indigo-600">Projeler</Link>
        <span>/</span>
        <Link href={`/dashboard/projects/${projectId}`} className="hover:text-indigo-600">Proje</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{page?.icon} {page?.title}</span>
      </div>

      {/* Notes */}
      <div className="space-y-1 mb-6">
        {rootNotes.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <p className="text-5xl mb-3">💬</p>
            <p>İlk notu ekle</p>
          </div>
        ) : (
          rootNotes.map((n) => (
            <NoteItem key={n.id} note={n} allNotes={notes} projectId={projectId} pageId={pageId} user={user} />
          ))
        )}
      </div>

      {/* Input bar */}
      <div className="sticky bottom-0 bg-gray-50 pt-4 pb-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-3 shadow-sm">
          <textarea
            ref={inputRef}
            placeholder="Not ekle... (Enter = gönder, Shift+Enter = yeni satır)"
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
              <input
                type="checkbox"
                checked={isTask}
                onChange={(e) => setIsTask(e.target.checked)}
                className="rounded"
              />
              Görev olarak ekle
            </label>
            <button
              onClick={handleSubmit}
              disabled={!text.trim()}
              className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-40 transition"
            >
              Gönder
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
