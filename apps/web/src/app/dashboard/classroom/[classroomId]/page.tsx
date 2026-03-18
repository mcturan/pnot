'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc, onSnapshot, updateDoc, arrayUnion, arrayRemove, collection, query, where, getDocs } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { subscribeClassroom, addGroup } from '@/lib/classroom';
import { createProject } from '@/lib/projects';
import { Classroom, ClassGroup, UserProfile, PROJECT_COLORS } from '@pnot/shared';
import PinoCharacter from '@/components/PinoCharacter';
import Link from 'next/link';

type Tab = 'students' | 'groups' | 'project';

export default function ClassroomDetailPage() {
  const { classroomId } = useParams<{ classroomId: string }>();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const [classroom, setClassroom] = useState<Classroom | null>(null);
  const [students, setStudents] = useState<UserProfile[]>([]);
  const [tab, setTab] = useState<Tab>('students');

  // Group form
  const [showGroup, setShowGroup] = useState(false);
  const [groupForm, setGroupForm] = useState({ name: '', emoji: '👥', studentUids: [] as string[] });
  const [creatingGroup, setCreatingGroup] = useState(false);

  // Creating group project
  const [creatingProject, setCreatingProject] = useState<string | null>(null); // groupId

  useEffect(() => {
    return subscribeClassroom(classroomId, setClassroom);
  }, [classroomId]);

  // Load student profiles
  useEffect(() => {
    if (!classroom?.studentUids.length) { setStudents([]); return; }
    Promise.all(classroom.studentUids.map((uid) => getDoc(doc(db, 'users', uid))))
      .then((snaps) => setStudents(snaps.filter((s) => s.exists()).map((s) => ({ uid: s.id, ...s.data() } as UserProfile))));
  }, [classroom?.studentUids]);

  async function handleCreateGroup() {
    if (!groupForm.name.trim()) return;
    setCreatingGroup(true);
    await addGroup(classroomId, {
      name: groupForm.name,
      emoji: groupForm.emoji,
      studentUids: groupForm.studentUids,
    });
    setGroupForm({ name: '', emoji: '👥', studentUids: [] });
    setShowGroup(false);
    setCreatingGroup(false);
  }

  async function handleCreateGroupProject(group: ClassGroup) {
    if (!user || !classroom) return;
    setCreatingProject(group.id);
    try {
      const projectId = await createProject(
        user.uid,
        user.displayName || '',
        user.photoURL || '',
        { name: `${classroom.name} — ${group.name}`, emoji: group.emoji, color: classroom.color }
      );
      // Update group with projectId
      const updatedGroups = classroom.groups.map((g) =>
        g.id === group.id ? { ...g, projectId } : g
      );
      await updateDoc(doc(db, 'classrooms', classroomId), { groups: updatedGroups });
      router.push(`/dashboard/projects/${projectId}`);
    } finally {
      setCreatingProject(null);
    }
  }

  async function handleCreateClassProject() {
    if (!user || !classroom) return;
    const projectId = await createProject(
      user.uid, user.displayName || '', user.photoURL || '',
      { name: classroom.name, emoji: classroom.emoji, color: classroom.color, description: 'Sınıf projesi' }
    );
    await updateDoc(doc(db, 'classrooms', classroomId), { projectId });
    router.push(`/dashboard/projects/${projectId}`);
  }

  async function removeStudent(uid: string) {
    await updateDoc(doc(db, 'classrooms', classroomId), { studentUids: arrayRemove(uid) });
  }

  if (!classroom) return <div className="flex items-center justify-center h-64 text-gray-400">Yükleniyor...</div>;
  if (!profile) return null;

  const isTeacher = user?.uid === classroom.teacherUid || profile.role === 'admin';

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard/classroom" className="hover:text-indigo-600">Sınıflarım</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{classroom.emoji} {classroom.name}</span>
      </div>

      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-4 mb-8">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: classroom.color + '20' }}>
            {classroom.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{classroom.name}</h1>
            {classroom.description && <p className="text-gray-400 text-sm">{classroom.description}</p>}
            <div className="flex items-center gap-3 mt-2 text-xs text-gray-400">
              <span>👥 {classroom.studentUids.length} öğrenci</span>
              <span>🗂️ {classroom.groups.length} grup</span>
            </div>
          </div>
        </div>

        {/* Join code */}
        <div className="bg-indigo-50 rounded-2xl px-5 py-3 text-center">
          <p className="text-xs text-indigo-400 mb-1">Katılım Kodu</p>
          <p className="text-2xl font-bold text-indigo-600 font-mono tracking-widest">#{classroom.inviteCode}</p>
          <p className="text-xs text-gray-400 mt-1">Öğrencilere ver</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-xl p-1 mb-6 w-fit">
        {([['students','👥 Öğrenciler'], ['groups','🗂️ Gruplar'], ['project','📋 Sınıf Projesi']] as [Tab, string][]).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${tab === id ? 'bg-white shadow text-gray-900' : 'text-gray-500 hover:text-gray-700'}`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* ── Students Tab ── */}
      {tab === 'students' && (
        <div>
          {students.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl text-gray-400">
              <p className="text-4xl mb-2">👤</p>
              <p className="font-medium">Henüz öğrenci yok</p>
              <p className="text-sm mt-1">Katılım kodunu (<strong>#{classroom.inviteCode}</strong>) öğrencilere gönderin</p>
            </div>
          ) : (
            <div className="space-y-2">
              {students.map((s) => (
                <div key={s.uid} className="flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-3">
                  <PinoCharacter gender={s.character || 'pino'} mood="happy" noseSize={3} size={36} outfit={s.characterOutfit || 'casual'} />
                  <div className="flex-1">
                    <p className="font-medium text-gray-800">{s.displayName}</p>
                    <p className="text-xs text-gray-400">{s.email} · Lv.{s.level || 1} · {s.xp || 0} XP</p>
                  </div>
                  {/* In which group */}
                  {classroom.groups
                    .filter((g) => g.studentUids.includes(s.uid))
                    .map((g) => (
                      <span key={g.id} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">{g.emoji} {g.name}</span>
                    ))
                  }
                  {/* Note + task stats */}
                  <span className="text-xs text-gray-400 hidden sm:block">📝 {s.noteCount || 0} · ✅ {s.taskCount || 0}</span>
                  {isTeacher && (
                    <button onClick={() => removeStudent(s.uid)} className="text-xs text-red-400 hover:text-red-600 ml-2">Çıkar</button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── Groups Tab ── */}
      {tab === 'groups' && (
        <div>
          <div className="flex justify-end mb-4">
            {isTeacher && (
              <button onClick={() => setShowGroup(true)} className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700">
                + Yeni Grup
              </button>
            )}
          </div>

          {classroom.groups.length === 0 ? (
            <div className="text-center py-16 bg-gray-50 rounded-2xl text-gray-400">
              <p className="text-4xl mb-2">🗂️</p>
              <p>Henüz grup yok. Öğrencileri gruplara bölerek çalışma projeleri atayabilirsin.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {classroom.groups.map((g) => {
                const groupStudents = students.filter((s) => g.studentUids.includes(s.uid));
                return (
                  <div key={g.id} className="bg-white border border-gray-100 rounded-2xl p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-xl">{g.emoji}</span>
                      <h3 className="font-semibold text-gray-900">{g.name}</h3>
                      <span className="ml-auto text-xs text-gray-400">{groupStudents.length} üye</span>
                    </div>

                    {/* Members */}
                    <div className="flex flex-wrap gap-1 mb-4">
                      {groupStudents.length === 0 ? (
                        <p className="text-xs text-gray-400">Henüz üye yok</p>
                      ) : groupStudents.map((s) => (
                        <span key={s.uid} className="text-xs bg-gray-50 border border-gray-100 text-gray-600 px-2 py-1 rounded-full">
                          {s.displayName}
                        </span>
                      ))}
                    </div>

                    {/* Group project */}
                    {g.projectId ? (
                      <button
                        onClick={() => router.push(`/dashboard/projects/${g.projectId}`)}
                        className="w-full py-2 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50"
                      >
                        📋 Grup Projesine Git
                      </button>
                    ) : isTeacher ? (
                      <button
                        onClick={() => handleCreateGroupProject(g)}
                        disabled={creatingProject === g.id}
                        className="w-full py-2 bg-gray-50 text-gray-600 border border-gray-200 rounded-xl text-sm hover:bg-indigo-50 hover:text-indigo-600 hover:border-indigo-200 disabled:opacity-50"
                      >
                        {creatingProject === g.id ? 'Oluşturuluyor...' : '+ Grup Projesi Oluştur'}
                      </button>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}

          {/* Create group modal */}
          {showGroup && (
            <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
              <div className="bg-white rounded-2xl p-6 w-full max-w-md">
                <h2 className="text-lg font-semibold mb-4">Yeni Grup</h2>

                <div className="flex gap-2 flex-wrap mb-3">
                  {['👥','🔴','🔵','🟢','🟡','🟣','⚪','🔶','🎯','⭐'].map((e) => (
                    <button key={e} onClick={() => setGroupForm({ ...groupForm, emoji: e })}
                      className={`text-xl p-1.5 rounded-lg ${groupForm.emoji === e ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}>
                      {e}
                    </button>
                  ))}
                </div>

                <input
                  placeholder="Grup adı (ör: Kırmızı Takım)"
                  value={groupForm.name}
                  onChange={(e) => setGroupForm({ ...groupForm, name: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-3 outline-none focus:border-indigo-400"
                  autoFocus
                />

                {/* Student checkboxes */}
                <p className="text-sm font-medium text-gray-700 mb-2">Öğrenciler</p>
                <div className="max-h-48 overflow-y-auto space-y-2 mb-4 border border-gray-100 rounded-xl p-3">
                  {students.length === 0 && <p className="text-xs text-gray-400">Önce öğrenci eklenmeli</p>}
                  {students.map((s) => (
                    <label key={s.uid} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={groupForm.studentUids.includes(s.uid)}
                        onChange={(e) => setGroupForm({
                          ...groupForm,
                          studentUids: e.target.checked
                            ? [...groupForm.studentUids, s.uid]
                            : groupForm.studentUids.filter((id) => id !== s.uid),
                        })}
                        className="rounded"
                      />
                      <PinoCharacter gender={s.character || 'pino'} mood="happy" noseSize={3} size={24} />
                      <span className="text-sm text-gray-700">{s.displayName}</span>
                    </label>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowGroup(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm">İptal</button>
                  <button onClick={handleCreateGroup} disabled={!groupForm.name.trim() || creatingGroup}
                    className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                    {creatingGroup ? 'Oluşturuluyor...' : 'Oluştur'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Classroom Project Tab ── */}
      {tab === 'project' && (
        <div className="text-center py-8">
          {classroom.projectId ? (
            <div>
              <p className="text-gray-500 mb-4">Sınıfın paylaşımlı projesi:</p>
              <button
                onClick={() => router.push(`/dashboard/projects/${classroom.projectId}`)}
                className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
              >
                📋 Sınıf Projesine Git
              </button>
            </div>
          ) : (
            <div>
              <p className="text-5xl mb-4">📋</p>
              <p className="text-gray-600 mb-2 font-medium">Sınıf Projesi</p>
              <p className="text-gray-400 text-sm mb-6">
                Tüm sınıfın birlikte çalışacağı bir proje oluştur. Öğrenciler not ekleyebilir, görevleri takip edebilir.
              </p>
              {isTeacher && (
                <button
                  onClick={handleCreateClassProject}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
                >
                  + Sınıf Projesi Oluştur
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </main>
  );
}
