import {
  collection, doc, addDoc, updateDoc, onSnapshot,
  query, where, orderBy, serverTimestamp, getDoc, Unsubscribe,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';
import { Classroom, ClassGroup } from '@pnot/shared';

// ── Classroom CRUD ────────────────────────────────────────────────────────────
export function subscribeClassrooms(teacherUid: string, cb: (c: Classroom[]) => void): Unsubscribe {
  const q = query(
    collection(db, 'classrooms'),
    where('teacherUid', '==', teacherUid),
    where('isArchived', '==', false),
    orderBy('createdAt', 'desc')
  );
  return onSnapshot(q, (snap) => {
    cb(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Classroom)));
  });
}

export function subscribeClassroom(classroomId: string, cb: (c: Classroom | null) => void): Unsubscribe {
  return onSnapshot(doc(db, 'classrooms', classroomId), (snap) => {
    cb(snap.exists() ? { id: snap.id, ...snap.data() } as Classroom : null);
  });
}

// Called from Cloud Function (createClassroom), but also available client-side
export async function createClassroomLocal(
  teacherUid: string,
  teacherName: string,
  data: { name: string; description?: string; emoji: string; color: string }
): Promise<string> {
  const code = Math.random().toString(36).substring(2, 8).toUpperCase();
  const ref2 = await addDoc(collection(db, 'classrooms'), {
    ...data,
    teacherUid,
    teacherName,
    studentUids: [],
    groups: [],
    inviteCode: code,
    isArchived: false,
    createdAt: serverTimestamp(),
  });
  return ref2.id;
}

export async function addGroup(
  classroomId: string,
  group: Omit<ClassGroup, 'id'>
): Promise<void> {
  const snap = await getDoc(doc(db, 'classrooms', classroomId));
  const groups: ClassGroup[] = snap.data()?.groups || [];
  const newGroup = { ...group, id: Math.random().toString(36).slice(2, 10) };
  await updateDoc(doc(db, 'classrooms', classroomId), {
    groups: [...groups, newGroup],
  });
}

export async function updateGroup(classroomId: string, groupId: string, patch: Partial<ClassGroup>): Promise<void> {
  const snap = await getDoc(doc(db, 'classrooms', classroomId));
  const groups: ClassGroup[] = (snap.data()?.groups || []).map((g: ClassGroup) =>
    g.id === groupId ? { ...g, ...patch } : g
  );
  await updateDoc(doc(db, 'classrooms', classroomId), { groups });
}

export async function deleteGroup(classroomId: string, groupId: string): Promise<void> {
  const snap = await getDoc(doc(db, 'classrooms', classroomId));
  const groups: ClassGroup[] = (snap.data()?.groups || []).filter((g: ClassGroup) => g.id !== groupId);
  await updateDoc(doc(db, 'classrooms', classroomId), { groups });
}

// ── Teacher application file upload ──────────────────────────────────────────
export async function uploadTeacherDoc(uid: string, file: File, type: 'id' | 'credential'): Promise<string> {
  const path = `teacher-applications/${uid}/${type}_${Date.now()}_${file.name}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
