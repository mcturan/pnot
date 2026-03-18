'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { subscribeClassrooms, createClassroomLocal } from '@/lib/classroom';
import { Classroom, PROJECT_COLORS, PROJECT_EMOJIS } from '@pnot/shared';
import PinoGuide, { TOURS } from '@/components/PinoGuide';
import Link from 'next/link';

export default function ClassroomListPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const [classrooms, setClassrooms] = useState<Classroom[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', emoji: '🏫', color: '#6366f1' });
  const [creating, setCreating] = useState(false);

  // Only teachers can access this
  useEffect(() => {
    if (profile && profile.role !== 'teacher' && profile.role !== 'admin') {
      router.push('/dashboard');
    }
  }, [profile, router]);

  useEffect(() => {
    if (!user) return;
    return subscribeClassrooms(user.uid, setClassrooms);
  }, [user]);

  async function handleCreate() {
    if (!user || !form.name.trim()) return;
    setCreating(true);
    const id = await createClassroomLocal(user.uid, user.displayName || '', form);
    setShowCreate(false);
    setForm({ name: '', description: '', emoji: '🏫', color: '#6366f1' });
    setCreating(false);
    router.push(`/dashboard/classroom/${id}`);
  }

  if (profile?.role !== 'teacher' && profile?.role !== 'admin') return null;

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      {/* Pino guide — first visit */}
      <PinoGuide tourId="classroom-list" steps={TOURS.classroom(profile?.character || 'pino')} gender={profile?.character || 'pino'} />

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🏫 Sınıflarım</h1>
          <p className="text-sm text-gray-400 mt-1">Öğrencilerini yönet, projeler ata, gruplar oluştur.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
        >
          + Yeni Sınıf
        </button>
      </div>

      {/* Teacher apply reminder if not teacher yet */}
      {profile.teacherStatus === 'pending' && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-6 flex items-center gap-3">
          <span className="text-2xl">⏳</span>
          <div>
            <p className="font-medium text-amber-700">Başvurun inceleniyor</p>
            <p className="text-sm text-amber-500">Onaylandığında sınırsız sınıf oluşturabileceksin.</p>
          </div>
        </div>
      )}

      {/* Classrooms grid */}
      {classrooms.length === 0 ? (
        <div className="text-center py-20 bg-gray-50 rounded-3xl">
          <p className="text-5xl mb-3">🏫</p>
          <p className="text-lg font-medium text-gray-600">Henüz sınıf yok</p>
          <p className="text-sm text-gray-400 mt-1 mb-6">İlk sınıfını oluştur, öğrencilerini ekle!</p>
          <button
            onClick={() => setShowCreate(true)}
            className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700"
          >
            + İlk Sınıfı Oluştur
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {classrooms.map((c) => (
            <button
              key={c.id}
              onClick={() => router.push(`/dashboard/classroom/${c.id}`)}
              className="text-left bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl" style={{ backgroundColor: c.color + '20' }}>
                  {c.emoji}
                </div>
                <div>
                  <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600">{c.name}</h3>
                  {c.description && <p className="text-xs text-gray-400">{c.description}</p>}
                </div>
              </div>
              <div className="flex items-center gap-4 text-xs text-gray-400">
                <span>👥 {c.studentUids.length} öğrenci</span>
                <span>🗂️ {c.groups.length} grup</span>
                <span className="ml-auto font-mono bg-gray-50 px-2 py-1 rounded-lg text-gray-500">#{c.inviteCode}</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Yeni Sınıf</h2>

            <div className="flex gap-2 flex-wrap mb-3">
              {['🏫','📚','🔬','🎨','⚽','🎭','💻','🎯','📐','🌍'].map((e) => (
                <button key={e} onClick={() => setForm({ ...form, emoji: e })}
                  className={`text-xl p-2 rounded-lg ${form.emoji === e ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}>
                  {e}
                </button>
              ))}
            </div>
            <div className="flex gap-2 mb-3">
              {PROJECT_COLORS.map((c) => (
                <button key={c} onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full ${form.color === c ? 'ring-2 ring-offset-1 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }} />
              ))}
            </div>

            <input
              placeholder="Sınıf adı * (ör: 10-A Matematik)"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-3 outline-none focus:border-indigo-400"
              autoFocus
            />
            <textarea
              placeholder="Açıklama (isteğe bağlı)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-indigo-400 resize-none h-16 text-sm"
            />
            <div className="flex gap-3">
              <button onClick={() => setShowCreate(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm">İptal</button>
              <button onClick={handleCreate} disabled={!form.name.trim() || creating}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">
                {creating ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
