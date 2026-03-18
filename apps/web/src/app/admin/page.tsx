'use client';
import { useState, useEffect } from 'react';
import { collection, query, where, onSnapshot, doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useRouter } from 'next/navigation';
import { TeacherApplication } from '@pnot/shared';

export default function AdminPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const [apps, setApps] = useState<TeacherApplication[]>([]);
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
    await updateDoc(doc(db, 'teacherApplications', app.uid), {
      status: 'approved', reviewedAt: serverTimestamp(),
    });
    await updateDoc(doc(db, 'users', app.uid), {
      role: 'teacher', plan: 'pro', teacherStatus: 'approved',
    });
    setActing(null);
  }

  async function reject(app: TeacherApplication, note = '') {
    setActing(app.uid);
    await updateDoc(doc(db, 'teacherApplications', app.uid), {
      status: 'rejected', reviewedAt: serverTimestamp(), reviewNote: note,
    });
    await updateDoc(doc(db, 'users', app.uid), {
      teacherStatus: 'rejected',
    });
    setActing(null);
  }

  if (profile?.role !== 'admin') return null;

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Admin — Öğretmen Başvuruları</h1>
      <p className="text-gray-400 text-sm mb-6">Belgeleri kontrol et, onayla veya reddet.</p>

      {/* Filter */}
      <div className="flex gap-2 mb-6">
        {(['pending', 'approved', 'rejected'] as const).map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition ${
              filter === f ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
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
                <p className="text-xs text-gray-400 mt-2">
                  {app.createdAt?.toDate?.()?.toLocaleDateString('tr-TR')}
                </p>
              </div>

              {/* Document links */}
              <div className="flex flex-col gap-2">
                <a href={app.studentIdUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  🪪 Kimlik Belgesi ↗
                </a>
                <a href={app.documentUrl} target="_blank" rel="noreferrer"
                  className="text-xs text-indigo-600 hover:underline flex items-center gap-1">
                  📄 Öğretmen Belgesi ↗
                </a>
              </div>
            </div>

            {filter === 'pending' && (
              <div className="flex gap-3 mt-4 pt-4 border-t border-gray-50">
                <button
                  onClick={() => approve(app)}
                  disabled={acting === app.uid}
                  className="flex-1 py-2 bg-green-600 text-white rounded-xl text-sm font-medium hover:bg-green-700 disabled:opacity-50"
                >
                  {acting === app.uid ? '...' : '✅ Onayla — Pro\'ya Yükselt'}
                </button>
                <button
                  onClick={() => {
                    const note = prompt('Red sebebi (isteğe bağlı):') || '';
                    reject(app, note);
                  }}
                  disabled={acting === app.uid}
                  className="flex-1 py-2 bg-red-50 text-red-600 border border-red-200 rounded-xl text-sm font-medium hover:bg-red-100 disabled:opacity-50"
                >
                  ❌ Reddet
                </button>
              </div>
            )}

            {app.reviewNote && (
              <p className="text-xs text-red-500 mt-3 bg-red-50 rounded-lg px-3 py-2">
                Red sebebi: {app.reviewNote}
              </p>
            )}
          </div>
        ))}
      </div>
    </main>
  );
}
