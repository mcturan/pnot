'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { subscribePages, createPage } from '@/lib/projects';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { Project, Page } from '@pnot/shared';

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');
  const [inviteLink, setInviteLink] = useState('');
  const [showInvite, setShowInvite] = useState(false);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) setProject({ id: snap.id, ...snap.data() } as Project);
    });
    return unsub;
  }, [projectId]);

  useEffect(() => {
    const unsub = subscribePages(projectId, setPages);
    return unsub;
  }, [projectId]);

  async function handleCreatePage() {
    if (!user || !newPageTitle.trim()) return;
    const id = await createPage(projectId, user.uid, newPageTitle.trim());
    setNewPageTitle('');
    setShowNewPage(false);
    router.push(`/dashboard/projects/${projectId}/${id}`);
  }

  async function handleInvite() {
    try {
      const fn = httpsCallable(functions, 'createInvite');
      const result = await fn({ projectId, role: 'editor' });
      const token = (result.data as { token: string }).token;
      const link = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invite/${token}`;
      setInviteLink(link);
      setShowInvite(true);
    } catch (e) {
      alert('Davet linki oluşturulamadı');
    }
  }

  if (!project) return <div className="flex items-center justify-center h-64 text-gray-400">Yükleniyor...</div>;

  const isOwner = user?.uid === project.ownerUid;

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      {/* Project header */}
      <div className="flex items-start justify-between mb-8">
        <div className="flex items-center gap-4">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl"
            style={{ backgroundColor: project.color + '20' }}
          >
            {project.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-400 mt-0.5">{project.description}</p>}
            <div className="flex items-center gap-2 mt-2">
              <span className="text-xs text-gray-400">{1 + project.members.length} üye</span>
              {project.members.map((m) => (
                <span key={m.uid} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {m.displayName}
                </span>
              ))}
            </div>
          </div>
        </div>
        {isOwner && (
          <button
            onClick={handleInvite}
            className="px-4 py-2 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 transition"
          >
            + Üye Davet Et
          </button>
        )}
      </div>

      {/* Pages */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">Sayfalar</h2>
        <button
          onClick={() => setShowNewPage(true)}
          className="text-sm text-indigo-600 hover:text-indigo-700 font-medium"
        >
          + Sayfa Ekle
        </button>
      </div>

      <div className="space-y-2">
        {pages.map((p) => (
          <button
            key={p.id}
            onClick={() => router.push(`/dashboard/projects/${projectId}/${p.id}`)}
            className="w-full flex items-center gap-3 bg-white border border-gray-100 rounded-xl px-4 py-4 hover:shadow-sm transition text-left group"
          >
            <span className="text-xl">{p.icon || '📄'}</span>
            <span className="flex-1 font-medium text-gray-800 group-hover:text-indigo-600 transition">{p.title}</span>
            <span className="text-gray-300 group-hover:text-indigo-300">→</span>
          </button>
        ))}
        {pages.length === 0 && (
          <div className="text-center py-12 text-gray-400 bg-gray-50 rounded-2xl">
            <p>Henüz sayfa yok</p>
            <button onClick={() => setShowNewPage(true)} className="text-indigo-600 text-sm mt-2">
              İlk sayfayı oluştur
            </button>
          </div>
        )}
      </div>

      {/* New page modal */}
      {showNewPage && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-4">Yeni Sayfa</h2>
            <input
              placeholder="Sayfa başlığı"
              value={newPageTitle}
              onChange={(e) => setNewPageTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreatePage()}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-indigo-400"
              autoFocus
            />
            <div className="flex gap-3">
              <button onClick={() => setShowNewPage(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm">İptal</button>
              <button onClick={handleCreatePage} disabled={!newPageTitle.trim()} className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50">Oluştur</button>
            </div>
          </div>
        </div>
      )}

      {/* Invite modal */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Davet Linki</h2>
            <p className="text-sm text-gray-400 mb-4">Bu linki WhatsApp veya Telegram'da paylaş. 7 gün geçerli.</p>
            <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-600 break-all mb-4 font-mono">{inviteLink}</div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); }}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                Kopyala
              </button>
              <button onClick={() => setShowInvite(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm">Kapat</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
