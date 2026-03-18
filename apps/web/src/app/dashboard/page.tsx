'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { subscribeProjects, createProject } from '@/lib/projects';
import { Project, FREE_PROJECT_LIMIT, PROJECT_COLORS, PROJECT_EMOJIS } from '@pnot/shared';

export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [projects, setProjects] = useState<Project[]>([]);
  const [showCreate, setShowCreate] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', emoji: '📋', color: '#6366f1' });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!user) return;
    const unsub = subscribeProjects(user.uid, setProjects);
    return unsub;
  }, [user]);

  const ownedCount = projects.filter((p) => p.ownerUid === user?.uid).length;
  const canCreate = ownedCount < FREE_PROJECT_LIMIT;

  async function handleCreate() {
    if (!user || !form.name.trim()) return;
    setCreating(true);
    try {
      const id = await createProject(user.uid, user.displayName || '', user.photoURL || '', form);
      setShowCreate(false);
      setForm({ name: '', description: '', emoji: '📋', color: '#6366f1' });
      router.push(`/dashboard/projects/${id}`);
    } finally {
      setCreating(false);
    }
  }

  return (
    <main className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Projelerim</h1>
          <p className="text-sm text-gray-400 mt-1">
            {ownedCount}/{FREE_PROJECT_LIMIT} ücretsiz proje kullanılıyor
          </p>
        </div>
        <button
          onClick={() => canCreate ? setShowCreate(true) : alert('Ücretsiz planda maksimum 5 proje oluşturabilirsiniz. Pro\'ya geçin!')}
          className="px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition flex items-center gap-2"
        >
          + Yeni Proje
        </button>
      </div>

      {/* Projects grid */}
      {projects.length === 0 ? (
        <div className="text-center py-24 text-gray-400">
          <div className="text-6xl mb-4">📋</div>
          <p className="text-lg font-medium">Henüz proje yok</p>
          <p className="text-sm mt-2">İlk projeyi oluşturmak için "Yeni Proje" düğmesine tıkla</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((p) => (
            <button
              key={p.id}
              onClick={() => router.push(`/dashboard/projects/${p.id}`)}
              className="text-left bg-white border border-gray-100 rounded-2xl p-5 hover:shadow-md transition group"
            >
              <div
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl mb-4"
                style={{ backgroundColor: p.color + '20' }}
              >
                {p.emoji}
              </div>
              <h3 className="font-semibold text-gray-900 group-hover:text-indigo-600 transition">{p.name}</h3>
              {p.description && <p className="text-sm text-gray-400 mt-1 line-clamp-2">{p.description}</p>}
              <div className="flex items-center gap-2 mt-4">
                <div className="flex -space-x-2">
                  {[{ uid: p.ownerUid }, ...p.members].slice(0, 4).map((m, i) => (
                    <div key={i} className="w-6 h-6 rounded-full bg-indigo-100 border-2 border-white text-xs flex items-center justify-center text-indigo-600">
                      {i === 0 ? '👑' : '•'}
                    </div>
                  ))}
                </div>
                <span className="text-xs text-gray-400">{1 + p.members.length} üye</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* Create Modal */}
      {showCreate && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <h2 className="text-lg font-semibold mb-4">Yeni Proje</h2>

            {/* Emoji picker */}
            <div className="flex gap-2 flex-wrap mb-4">
              {PROJECT_EMOJIS.map((e) => (
                <button
                  key={e}
                  onClick={() => setForm({ ...form, emoji: e })}
                  className={`text-xl p-2 rounded-lg transition ${form.emoji === e ? 'bg-indigo-100' : 'hover:bg-gray-100'}`}
                >
                  {e}
                </button>
              ))}
            </div>

            {/* Color picker */}
            <div className="flex gap-2 mb-4">
              {PROJECT_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setForm({ ...form, color: c })}
                  className={`w-7 h-7 rounded-full transition ${form.color === c ? 'ring-2 ring-offset-2 ring-gray-400' : ''}`}
                  style={{ backgroundColor: c }}
                />
              ))}
            </div>

            <input
              placeholder="Proje adı *"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-3 outline-none focus:border-indigo-400"
              autoFocus
            />
            <textarea
              placeholder="Açıklama (isteğe bağlı)"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-indigo-400 resize-none h-20"
            />

            <div className="flex gap-3">
              <button
                onClick={() => setShowCreate(false)}
                className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm font-medium hover:bg-gray-50"
              >
                İptal
              </button>
              <button
                onClick={handleCreate}
                disabled={!form.name.trim() || creating}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                {creating ? 'Oluşturuluyor...' : 'Oluştur'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
