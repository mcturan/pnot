import {
  collection, addDoc, updateDoc, deleteDoc, doc,
  query, where, orderBy, onSnapshot, serverTimestamp, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Note, TaskStatus } from '@pnot/shared';

export function subscribeNotes(
  projectId: string,
  pageId: string,
  cb: (notes: Note[]) => void
): Unsubscribe {
  const q = query(
    collection(db, `projects/${projectId}/pages/${pageId}/notes`),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Note)));
  });
}

export async function addNote(
  projectId: string,
  pageId: string,
  content: string,
  author: { uid: string; displayName: string; photoURL?: string },
  parentNoteId: string | null = null
): Promise<string> {
  const ref = await addDoc(collection(db, `projects/${projectId}/pages/${pageId}/notes`), {
    projectId,
    pageId,
    content,
    authorUid: author.uid,
    authorName: author.displayName,
    authorPhoto: author.photoURL || '',
    parentNoteId,
    isPinned: false,
    isTask: false,
    replyCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  // Increment parent reply count
  if (parentNoteId) {
    await updateDoc(doc(db, `projects/${projectId}/pages/${pageId}/notes/${parentNoteId}`), {
      replyCount: (await import('firebase/firestore')).increment(1),
    });
  }

  return ref.id;
}

export async function updateNoteContent(
  projectId: string,
  pageId: string,
  noteId: string,
  content: string
) {
  await updateDoc(doc(db, `projects/${projectId}/pages/${pageId}/notes/${noteId}`), {
    content,
    updatedAt: serverTimestamp(),
  });
}

export async function togglePin(projectId: string, pageId: string, noteId: string, current: boolean) {
  await updateDoc(doc(db, `projects/${projectId}/pages/${pageId}/notes/${noteId}`), {
    isPinned: !current,
  });
}

export async function convertToTask(
  projectId: string,
  pageId: string,
  noteId: string,
  isTask: boolean
) {
  await updateDoc(doc(db, `projects/${projectId}/pages/${pageId}/notes/${noteId}`), {
    isTask,
    taskStatus: isTask ? 'todo' : null,
  });
}

export async function updateTaskStatus(
  projectId: string,
  pageId: string,
  noteId: string,
  status: TaskStatus
) {
  await updateDoc(doc(db, `projects/${projectId}/pages/${pageId}/notes/${noteId}`), {
    taskStatus: status,
  });
}

export async function assignTask(
  projectId: string,
  pageId: string,
  noteId: string,
  assignedTo: string[]
) {
  await updateDoc(doc(db, `projects/${projectId}/pages/${pageId}/notes/${noteId}`), {
    assignedTo,
  });
}

export async function deleteNote(projectId: string, pageId: string, noteId: string) {
  await deleteDoc(doc(db, `projects/${projectId}/pages/${pageId}/notes/${noteId}`));
}
