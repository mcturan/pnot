'use client';
import { useState, useEffect } from 'react';
import {
  collection, query, where, orderBy, limit,
  onSnapshot, addDoc, serverTimestamp, doc, updateDoc, increment
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n/context';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PinoCharacter from '@/components/PinoCharacter';
import { GlobalProject, HelpType, HELP_TAGS, HelpOffer } from '@pnot/shared';
import Link from 'next/link';

const HELP_TYPE_ICONS: Record<HelpType, string> = {
  feedback: '💬',
  collaboration: '🤝',
  mentorship: '🎓',
  'code-review': '🔍',
};

export default function CommunityPage() {
  const { user } = useAuth();
  const { t } = useI18n();
  const [projects, setProjects] = useState<GlobalProject[]>([]);
  const [filterTag, setFilterTag] = useState('');
  const [filterHelp, setFilterHelp] = useState<HelpType | ''>('');
  const [selectedProject, setSelectedProject] = useState<GlobalProject | null>(null);
  const [offerMsg, setOfferMsg] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const q = query(
      collection(db, 'globalProjects'),
      where('isOpen', '==', true),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    return onSnapshot(q, (snap) => {
      setProjects(snap.docs.map((d) => ({ id: d.id, ...d.data() } as GlobalProject)));
    });
  }, []);

  const filtered = projects.filter((p) => {
    if (filterTag && !p.tags.includes(filterTag)) return false;
    if (filterHelp && !p.helpTypes.includes(filterHelp as HelpType)) return false;
    return true;
  });

  async function sendHelp() {
    if (!user || !selectedProject || !offerMsg.trim()) return;
    setSending(true);
    try {
      await addDoc(collection(db, 'helpOffers'), {
        globalProjectId: selectedProject.id,
        helperUid: user.uid,
        helperName: user.displayName,
        helperCharacter: 'pino',
        message: offerMsg.trim(),
        createdAt: serverTimestamp(),
      } as Omit<HelpOffer, 'id'>);
      await updateDoc(doc(db, 'globalProjects', selectedProject.id), {
        helpersCount: increment(1),
      });
      setOfferMsg('');
      setSelectedProject(null);
      // XP reward is handled server-side via Cloud Function
    } finally {
      setSending(false);
    }
  }

  return (
    <main className="min-h-screen bg-gray-50">
      {/* Navbar */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/" className="text-xl font-bold text-indigo-600">PNOT</Link>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          {user ? (
            <Link href="/dashboard" className="text-sm text-indigo-600 font-medium hover:underline">
              {t('nav.projects')}
            </Link>
          ) : (
            <Link href="/auth/login" className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700">
              {t('nav.login')}
            </Link>
          )}
        </div>
      </header>

      <div className="max-w-5xl mx-auto px-6 py-8">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="flex justify-center gap-4 mb-4">
            <PinoCharacter gender="pino" mood="excited" noseSize={2} size={70} outfit="student" />
            <PinoCharacter gender="pina" mood="happy" noseSize={2} size={70} outfit="creative" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">{t('community.title')}</h1>
          <p className="text-gray-500 mt-2 max-w-xl mx-auto">{t('community.sub')}</p>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2 mb-6">
          <button
            onClick={() => setFilterHelp('')}
            className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterHelp === '' ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            Tümü
          </button>
          {(['feedback', 'collaboration', 'mentorship', 'code-review'] as HelpType[]).map((h) => (
            <button
              key={h}
              onClick={() => setFilterHelp(filterHelp === h ? '' : h)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition ${filterHelp === h ? 'bg-indigo-600 text-white' : 'bg-white border border-gray-200 text-gray-600 hover:bg-gray-50'}`}
            >
              {HELP_TYPE_ICONS[h]} {t(`community.help_types.${h}` as any)}
            </button>
          ))}
        </div>

        {/* Tag filter */}
        <div className="flex flex-wrap gap-2 mb-8">
          {HELP_TAGS.map((tag) => (
            <button
              key={tag}
              onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
              className={`px-2 py-1 rounded-lg text-xs transition ${filterTag === tag ? 'bg-indigo-100 text-indigo-700 font-medium' : 'bg-white border border-gray-100 text-gray-500 hover:bg-gray-50'}`}
            >
              #{tag}
            </button>
          ))}
        </div>

        {/* Projects grid */}
        {filtered.length === 0 ? (
          <div className="text-center py-20 text-gray-400">
            <div className="text-5xl mb-4">🌍</div>
            <p>Henüz paylaşılan proje yok. İlk sen paylaş!</p>
            {user && (
              <Link href="/dashboard" className="mt-4 inline-block text-indigo-600 font-medium hover:underline">
                Projeye git →
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map((p) => (
              <div key={p.id} className="bg-white rounded-2xl border border-gray-100 p-5 hover:shadow-md transition">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <PinoCharacter gender={p.ownerCharacter} mood="happy" noseSize={3} size={36} />
                    <div>
                      <span className="text-sm font-medium text-gray-700">{p.ownerName}</span>
                      <div className="text-xs text-gray-400">{p.lang.toUpperCase()}</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    👥 {p.helpersCount}
                  </div>
                </div>

                <h3 className="font-semibold text-gray-900 mb-1">{p.title}</h3>
                <p className="text-sm text-gray-500 mb-3 line-clamp-2">{p.description}</p>

                <div className="flex flex-wrap gap-2 mb-4">
                  {p.helpTypes.map((h) => (
                    <span key={h} className="text-xs bg-indigo-50 text-indigo-600 px-2 py-1 rounded-full">
                      {HELP_TYPE_ICONS[h]} {h}
                    </span>
                  ))}
                  {p.tags.map((tag) => (
                    <span key={tag} className="text-xs bg-gray-100 text-gray-500 px-2 py-1 rounded-full">
                      #{tag}
                    </span>
                  ))}
                </div>

                <button
                  onClick={() => user ? setSelectedProject(p) : window.location.href = '/auth/login'}
                  className="w-full py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 transition"
                >
                  {t('community.help')} +30 XP ⭐
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Help Modal */}
      {selectedProject && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md">
            <div className="flex items-center gap-3 mb-4">
              <PinoCharacter gender={selectedProject.ownerCharacter} mood="thinking" noseSize={3} size={50} />
              <div>
                <h2 className="font-semibold">{selectedProject.title}</h2>
                <p className="text-sm text-gray-400">{selectedProject.ownerName}</p>
              </div>
            </div>
            <textarea
              placeholder="Nasıl yardım edebilirsin? Mesajını yaz..."
              value={offerMsg}
              onChange={(e) => setOfferMsg(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-4 py-3 mb-4 outline-none focus:border-indigo-400 resize-none h-28 text-sm"
              autoFocus
            />
            <p className="text-xs text-indigo-600 mb-4">🎉 Yardım edersen +30 XP ve Pino/Pina'nın burnu küçülür!</p>
            <div className="flex gap-3">
              <button onClick={() => setSelectedProject(null)} className="flex-1 px-4 py-3 border border-gray-200 rounded-xl text-sm">İptal</button>
              <button
                onClick={sendHelp}
                disabled={!offerMsg.trim() || sending}
                className="flex-1 px-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium disabled:opacity-50"
              >
                {sending ? 'Gönderiliyor...' : 'Gönder & +30 XP Kazan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
