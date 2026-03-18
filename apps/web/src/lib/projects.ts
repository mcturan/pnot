import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  getDocs, onSnapshot, query, where, orderBy,
  serverTimestamp, Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import { Project, Page } from '@pnot/shared';

// Projects
export function subscribeProjects(uid: string, cb: (projects: Project[]) => void): Unsubscribe {
  // Get projects where user is owner or member
  const q = query(
    collection(db, 'projects'),
    where('isArchived', '==', false)
  );
  return onSnapshot(q, (snap) => {
    const all = snap.docs.map((d) => ({ id: d.id, ...d.data() } as Project));
    // Filter: owner or member
    const mine = all.filter(
      (p) => p.ownerUid === uid || p.members?.some((m) => m.uid === uid)
    );
    cb(mine);
  });
}

export async function createProject(uid: string, displayName: string, photoURL: string, data: {
  name: string; description?: string; emoji: string; color: string;
}): Promise<string> {
  const ref = await addDoc(collection(db, 'projects'), {
    ...data,
    ownerUid: uid,
    members: [],
    isArchived: false,
    createdAt: serverTimestamp(),
  });

  // Create a default "General" page
  await addDoc(collection(db, `projects/${ref.id}/pages`), {
    projectId: ref.id,
    title: 'General',
    icon: '📝',
    order: 0,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });

  return ref.id;
}

export async function archiveProject(projectId: string) {
  await updateDoc(doc(db, 'projects', projectId), { isArchived: true });
}

// Pages
export function subscribePages(projectId: string, cb: (pages: Page[]) => void): Unsubscribe {
  const q = query(collection(db, `projects/${projectId}/pages`), orderBy('order', 'asc'));
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Page)));
  });
}

export async function createPage(projectId: string, uid: string, title: string, icon = '📄'): Promise<string> {
  const existing = await getDocs(collection(db, `projects/${projectId}/pages`));
  const ref = await addDoc(collection(db, `projects/${projectId}/pages`), {
    projectId,
    title,
    icon,
    order: existing.size,
    createdBy: uid,
    createdAt: serverTimestamp(),
  });
  return ref.id;
}

export async function updatePage(projectId: string, pageId: string, data: Partial<Pick<Page, 'title' | 'icon'>>) {
  await updateDoc(doc(db, `projects/${projectId}/pages/${pageId}`), data);
}

export async function deletePage(projectId: string, pageId: string) {
  await deleteDoc(doc(db, `projects/${projectId}/pages/${pageId}`));
}
