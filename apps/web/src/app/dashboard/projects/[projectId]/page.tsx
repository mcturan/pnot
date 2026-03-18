'use client';
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, onSnapshot } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useI18n } from '@/lib/i18n/context';
import { subscribePages, createPage } from '@/lib/projects';
import { Project, Page, HELP_TAGS, HelpType } from '@pnot/shared';
import Link from 'next/link';

const HELP_TYPES: { id: HelpType; icon: string; label: string }[] = [
  { id: 'feedback',      icon: '💬', label: 'Geri Bildirim' },
  { id: 'collaboration', icon: '🤝', label: 'İşbirliği' },
  { id: 'mentorship',    icon: '🎓', label: 'Mentorlük' },
  { id: 'code-review',   icon: '🔍', label: 'Kod İnceleme' },
];

export default function ProjectPage() {
  const { projectId } = useParams<{ projectId: string }>();
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const { t } = useI18n();

  const [project, setProject] = useState<Project | null>(null);
  const [pages, setPages] = useState<Page[]>([]);

  // New page modal
  const [showNewPage, setShowNewPage] = useState(false);
  const [newPageTitle, setNewPageTitle] = useState('');

  // Invite modal
  const [inviteLink, setInviteLink] = useState('');
  const [showInvite, setShowInvite] = useState(false);
  const [copied, setCopied] = useState(false);

  // Share to community modal
  const [showShare, setShowShare] = useState(false);
  const [shareForm, setShareForm] = useState({
    title: '',
    description: '',
    tags: [] as string[],
    helpTypes: [] as HelpType[],
  });
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);

  useEffect(() => {
    return onSnapshot(doc(db, 'projects', projectId), (snap) => {
      if (snap.exists()) setProject({ id: snap.id, ...snap.data() } as Project);
    });
  }, [projectId]);

  useEffect(() => {
    return subscribePages(projectId, setPages);
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
      const { data } = await fn({ projectId, role: 'editor' });
      const link = `${process.env.NEXT_PUBLIC_APP_URL}/dashboard/invite/${(data as { token: string }).token}`;
      setInviteLink(link);
      setShowInvite(true);
    } catch { alert('Davet linki oluşturulamadı'); }
  }

  async function handleShare() {
    if (!shareForm.title.trim() || !shareForm.description.trim()) return;
    setSharing(true);
    try {
      const fn = httpsCallable(functions, 'shareProjectGlobally');
      await fn({
        projectId,
        title: shareForm.title,
        description: shareForm.description,
        tags: shareForm.tags,
        helpTypes: shareForm.helpTypes,
        lang: 'tr',
      });
      setShared(true);
      setTimeout(() => { setShowShare(false); setShared(false); }, 2000);
    } catch { alert('Paylaşım başarısız'); }
    finally { setSharing(false); }
  }

  function toggleTag(tag: string) {
    setShareForm((f) => ({
      ...f,
      tags: f.tags.includes(tag) ? f.tags.filter((t) => t !== tag) : [...f.tags, tag],
    }));
  }

  function toggleHelpType(h: HelpType) {
    setShareForm((f) => ({
      ...f,
      helpTypes: f.helpTypes.includes(h) ? f.helpTypes.filter((x) => x !== h) : [...f.helpTypes, h],
    }));
  }

  if (!project) return <div className="flex items-center justify-center h-64 text-gray-400">Yükleniyor...</div>;

  const isOwner = user?.uid === project.ownerUid;

  return (
    <main className="max-w-4xl mx-auto px-6 py-8">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-gray-400 mb-6">
        <Link href="/dashboard" className="hover:text-indigo-600">{t('nav.projects')}</Link>
        <span>/</span>
        <span className="text-gray-700 font-medium">{project.emoji} {project.name}</span>
      </div>

      {/* Project header */}
      <div className="flex items-start justify-between mb-8 flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl" style={{ backgroundColor: project.color + '20' }}>
            {project.emoji}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{project.name}</h1>
            {project.description && <p className="text-gray-400 mt-0.5 text-sm">{project.description}</p>}
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              <span className="text-xs text-gray-400">{1 + project.members.length} üye</span>
              {project.members.slice(0, 4).map((m) => (
                <span key={m.uid} className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{m.displayName}</span>
              ))}
            </div>
          </div>
        </div>

        {isOwner && (
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => { setShareForm({ ...shareForm, title: project.name, description: project.description || '' }); setShowShare(true); }}
              className="px-3 py-2 border border-purple-200 text-purple-600 rounded-xl text-sm font-medium hover:bg-purple-50 transition"
            >
              🌍 Topluluğa Aç <span className="text-xs text-purple-400">+25 XP</span>
            </button>
            <button
              onClick={handleInvite}
              className="px-3 py-2 border border-indigo-200 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-50 transition"
            >
              + Üye Davet Et
            </button>
          </div>
        )}
      </div>

      {/* Stats link */}
      <Link
        href={`/dashboard/projects/${projectId}/stats`}
        className="inline-flex items-center gap-2 mb-6 px-4 py-2 bg-indigo-50 text-indigo-600 rounded-xl text-sm font-medium hover:bg-indigo-100 transition"
      >
        📊 Proje İstatistikleri
      </Link>

      {/* Pages */}
      <div className="mb-4 flex items-center justify-between">
        <h2 className="font-semibold text-gray-700">Sayfalar</h2>
        <button onClick={() => setShowNewPage(true)} className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
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
            <button onClick={() => setShowNewPage(true)} className="text-indigo-600 text-sm mt-2">İlk sayfayı oluştur</button>
          </div>
        )}
      </div>

      {/* ── Modals ────────────────────────────── */}

      {/* New page */}
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

      {/* Invite */}
      {showInvite && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-sm">
            <h2 className="text-lg font-semibold mb-2">Davet Linki</h2>
            <p className="text-sm text-gray-400 mb-4">WhatsApp veya Telegram'da paylaş. 7 gün geçerli.</p>
            <div className="bg-gray-50 rounded-xl p-3 text-xs text-gray-600 break-all mb-4 font-mono">{inviteLink}</div>
            <div className="flex gap-3">
              <button
                onClick={() => { navigator.clipboard.writeText(inviteLink); setCopied(true); setTimeout(() => setCopied(false), 2000); }}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700"
              >
                {copied ? '✓ Kopyalandı' : 'Kopyala'}
              </button>
              <button onClick={() => setShowInvite(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm">Kapat</button>
            </div>
          </div>
        </div>
      )}

      {/* Share to community */}
      {showShare && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg my-4">
            {shared ? (
              <div className="text-center py-8">
                <div className="text-5xl mb-3">🎉</div>
                <p className="text-lg font-semibold text-gray-900">Paylaşıldı! +25 XP kazandın!</p>
                <p className="text-sm text-gray-400 mt-1">Projen global toplulukta görünüyor.</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold mb-1">Projeyi Topluluğa Aç</h2>
                <p className="text-sm text-gray-400 mb-4">Dünyanın her yerinden insanlar projenle ilgili yardım teklifinde bulunabilir.</p>

                <input
                  placeholder="Proje başlığı *"
                  value={shareForm.title}
                  onChange={(e) => setShareForm({ ...shareForm, title: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-3 outline-none focus:border-indigo-400"
                />
                <textarea
                  placeholder="Ne tür bir destek arıyorsunuz? *"
                  value={shareForm.description}
                  onChange={(e) => setShareForm({ ...shareForm, description: e.target.value })}
                  className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-indigo-400 resize-none h-24 text-sm"
                />

                {/* Help types */}
                <p className="text-sm font-medium text-gray-700 mb-2">Ne tür yardım istiyorsunuz?</p>
                <div className="flex flex-wrap gap-2 mb-4">
                  {HELP_TYPES.map((h) => (
                    <button
                      key={h.id}
                      onClick={() => toggleHelpType(h.id)}
                      className={`px-3 py-1.5 rounded-full text-sm transition ${
                        shareForm.helpTypes.includes(h.id)
                          ? 'bg-indigo-600 text-white'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                      }`}
                    >
                      {h.icon} {h.label}
                    </button>
                  ))}
                </div>

                {/* Tags */}
                <p className="text-sm font-medium text-gray-700 mb-2">Etiketler</p>
                <div className="flex flex-wrap gap-2 mb-6">
                  {HELP_TAGS.map((tag) => (
                    <button
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      className={`px-2 py-1 rounded-lg text-xs transition ${
                        shareForm.tags.includes(tag)
                          ? 'bg-indigo-100 text-indigo-700 font-medium'
                          : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
                      }`}
                    >
                      #{tag}
                    </button>
                  ))}
                </div>

                <div className="flex gap-3">
                  <button onClick={() => setShowShare(false)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm">İptal</button>
                  <button
                    onClick={handleShare}
                    disabled={!shareForm.title.trim() || !shareForm.description.trim() || sharing}
                    className="flex-1 px-4 py-3 bg-purple-600 text-white rounded-xl text-sm font-medium hover:bg-purple-700 disabled:opacity-50"
                  >
                    {sharing ? 'Paylaşılıyor...' : '🌍 Paylaş & +25 XP Kazan'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </main>
  );
}
