'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { httpsCallable } from 'firebase/functions';
import { db, functions } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRouter } from 'next/navigation';
import { TeacherApplication } from '@pnot/shared';

type AdminTab = 'teachers' | 'users';

interface UserResult {
  uid: string;
  displayName: string;
  email: string;
  plan: string;
  role: string;
  proGrantedBy: string | null;
}

function UserManagementTab() {
  const [email, setEmail]       = useState('');
  const [results, setResults]   = useState<UserResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [acting, setActing]     = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ uid: string; msg: string } | null>(null);

  async function search() {
    if (!email.trim()) return;
    setSearching(true);
    try {
      const fn  = httpsCallable<{ email: string }, { users: UserResult[] }>(functions, 'adminSearchUsers');
      const res = await fn({ email: email.trim().toLowerCase() });
      setResults(res.data.users);
    } finally {
      setSearching(false);
    }
  }

  async function setPlan(uid: string, plan: 'pro' | 'free', durationDays?: number) {
    setActing(uid);
    try {
      const fn = httpsCallable(functions, 'adminSetPlan');
      await fn({ targetUid: uid, plan, durationDays });
      setResults((prev) =>
        prev.map((u) => u.uid === uid ? { ...u, plan, proGrantedBy: plan === 'pro' ? 'admin' : null } : u)
      );
      setFeedback({ uid, msg: plan === 'pro' ? '✅ Pro verildi' : '↩ Basic yapıldı' });
      setTimeout(() => setFeedback(null), 3000);
    } finally {
      setActing(null);
    }
  }

  return (
    <div>
      <p className="text-gray-400 text-sm mb-5">E-posta ile kullanıcı ara, plan değiştir, pro ver.</p>

      {/* Search */}
      <div className="flex gap-2 mb-6">
        <input
          placeholder="E-posta adresi..."
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && search()}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400"
        />
        <button
          onClick={search}
          disabled={!email.trim() || searching}
          className="px-5 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
        >
          {searching ? '...' : 'Ara'}
        </button>
      </div>

      {results.length === 0 && email && !searching && (
        <p className="text-gray-300 text-sm text-center py-6">Kullanıcı bulunamadı</p>
      )}

      <div className="space-y-3">
        {results.map((u) => (
          <div key={u.uid} className="bg-white border border-gray-100 rounded-2xl p-5">
            <div className="flex items-start justify-between flex-wrap gap-3">
              <div>
                <p className="font-semibold text-gray-900">{u.displayName}</p>
                <p className="text-sm text-gray-400">{u.email}</p>
                <div className="flex gap-2 mt-2">
                  <span className={`text-xs px-2 py-1 rounded-full font-medium ${
                    u.plan === 'pro' ? 'bg-indigo-100 text-indigo-700' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {u.plan === 'pro' ? '⭐ Pro' : '○ Basic'}
                  </span>
                  {u.role !== 'user' && (
                    <span className="text-xs bg-amber-50 text-amber-700 px-2 py-1 rounded-full">{u.role}</span>
                  )}
                  {u.proGrantedBy && (
                    <span className="text-xs bg-green-50 text-green-600 px-2 py-1 rounded-full">via {u.proGrantedBy}</span>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {u.plan !== 'pro' ? (
                  <>
                    <button
                      onClick={() => setPlan(u.uid, 'pro')}
                      disabled={acting === u.uid}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-xl text-xs font-medium hover:bg-indigo-700 disabled:opacity-50"
                    >
                      ⭐ Sonsuz Pro Ver
                    </button>
                    <button
                      onClick={() => setPlan(u.uid, 'pro', 30)}
                      disabled={acting === u.uid}
                      className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-medium hover:bg-indigo-100 disabled:opacity-50"
                    >
                      ⏳ 30 Gün Pro Ver
                    </button>
                    <button
                      onClick={() => setPlan(u.uid, 'pro', 7)}
                      disabled={acting === u.uid}
                      className="px-3 py-2 bg-indigo-50 text-indigo-600 border border-indigo-200 rounded-xl text-xs font-medium hover:bg-indigo-100 disabled:opacity-50"
                    >
                      7 Gün
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => setPlan(u.uid, 'free')}
                    disabled={acting === u.uid}
                    className="px-3 py-2 bg-red-50 text-red-500 border border-red-200 rounded-xl text-xs font-medium hover:bg-red-100 disabled:opacity-50"
                  >
                    ↩ Basic Yap
                  </button>
                )}
              </div>
            </div>

            {feedback?.uid === u.uid && (
              <p className="text-xs text-green-600 mt-2 bg-green-50 rounded-lg px-3 py-2">{feedback.msg}</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const { profile } = useUserProfile();
  const router = useRouter();
  const [tab, setTab]       = useState<AdminTab>('teachers');
  const [apps, setApps]     = useState<TeacherApplication[]>([]);
  const [filter, setFilter] = useState<'pending' | 'approved' | 'rejected'>('pending');
  const [acting, setActing] = useState<string | null>(null);

  useEffect(() => {
    if (profile && profile.role !== 'admin') router.push('/dashboard');
  }, [profile, router]);

  useEffect(() => {
    const q = query(collection(db, 'teacherApplications'), where('status', '==', filter));
    return onSnapshot(q, (snap) => {
      setApps(snap.docs.map((d) => ({ id: d.id, ...d.data() } as TeacherApplication)));
    });
  }, [filter]);

  async function approve(app: TeacherApplication) {
    setActing(app.uid);
    await updateDoc(doc(db, 'teacherApplications', app.uid), { status: 'approved', reviewedAt: serverTimestamp() });
    await updateDoc(doc(db, 'users', app.uid), { role: 'teacher', plan: 'pro', teacherStatus: 'approved', proGrantedBy: 'admin' });
    setActing(null);
  }

  async function reject(app: TeacherApplication, note = '') {
    setActing(app.uid);
    await updateDoc(doc(db, 'teacherApplications', app.uid), { status: 'rejected', reviewedAt: serverTimestamp(), reviewNote: note });
    await updateDoc(doc(db, 'users', app.uid), { teacherStatus: 'rejected' });
    setActing(null);
  }

  if (profile?.role !== 'admin') return null;

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-6">🛡️ Admin Paneli</h1>

      {/* Main tabs */}
      <div className="flex gap-2 mb-8 bg-gray-100 p-1 rounded-2xl w-fit">
        <button
          onClick={() => setTab('teachers')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${tab === 'teachers' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          🎓 Öğretmen Başvuruları
        </button>
        <button
          onClick={() => setTab('users')}
          className={`px-5 py-2.5 rounded-xl text-sm font-medium transition ${tab === 'users' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}
        >
          👤 Kullanıcı Yönetimi
        </button>
      </div>

      {/* Teachers tab */}
      {tab === 'teachers' && (
        <>
          <p className="text-gray-400 text-sm mb-5">Belgeleri kontrol et, onayla veya reddet.</p>
          <div className="flex gap-2 mb-6">
            {(['pending', 'approved', 'rejected'] as const).map((f) => (
              <button key={f} onClick={() => setFilter(f)}
                className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
                  filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}>
                {f === 'pending' ? '⏳ Bekleyen' : f === 'approved' ? '✅ Onaylı' : '❌ Reddedilen'}
                {filter === f && ` (${apps.length})`}
              </button>
            ))}
          </div>

          {apps.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <p className="text-4xl mb-3">📭</p>
              <p>Bu kategoride başvuru yok.</p>
            </div>
          )}

          <div className="space-y-4">
            {apps.map((app) => (
              <div key={app.uid} className="bg-white border border-gray-100 rounded-2xl p-6">
                <div className="flex items-start justify-between flex-wrap gap-4">
                  <div>
                    <h3 className="font-semibold text-gray-900">{app.displayName}</h3>
                    <p className="text-sm text-gray-400">{app.email}</p>
                    <div className="flex flex-wrap gap-2 mt-2">
                      <span className="text-xs bg-blue-50 text-blue-600 px-2 py-1 rounded-full">🏫 {app.schoolName}</span>
                      <span className="text-xs bg-purple-50 text-purple-600 px-2 py-1 rounded-full">📚 {app.subject}</span>
                      {app.city && <span className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded-full">📍 {app.city}</span>}
                    </div>
                    <p className="text-xs text-gray-400 mt-2">{app.createdAt?.toDate?.()?.toLocaleDateString('tr-TR')}</p>
                  </div>
                  <div className="flex flex-col gap-2">
                    <a href={app.studentIdUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">🪪 Kimlik Belgesi ↗</a>
                    <a href={app.documentUrl} target="_blank" rel="noreferrer" className="text-xs text-indigo-600 hover:underline">📄 Öğretmen Belgesi ↗</a>
                  </div>
                </div>
                {filter === 'pending' && (
                  <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50">
                    <button onClick={() => approve(app)} disabled={acting === app.uid}
                      className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50">
                      {acting === app.uid ? '...' : '✅ Onayla — Pro\'ya Yükselt'}
                    </button>
                    <button onClick={() => { const note = prompt('Red sebebi:') || ''; reject(app, note); }}
                      disabled={acting === app.uid}
                      className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50">
                      ❌ Reddet
                    </button>
                  </div>
                )}
                {app.reviewNote && (
                  <p className="text-xs text-red-500 mt-3 bg-red-50 rounded-lg px-3 py-2">Red: {app.reviewNote}</p>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Users tab */}
      {tab === 'users' && <UserManagementTab />}
    </main>
  );
}
