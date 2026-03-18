'use client';
import { useState } from 'react';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useI18n } from '@/lib/i18n/context';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PinoCharacter from '@/components/PinoCharacter';
import { CharacterOutfit, CharacterGender, xpToLevel } from '@pnot/shared';

const OUTFITS: { id: CharacterOutfit; icon: string; label: string }[] = [
  { id: 'casual',   icon: '😎', label: 'Günlük'     },
  { id: 'business', icon: '💼', label: 'Beyaz Yaka' },
  { id: 'student',  icon: '🎓', label: 'Öğrenci'    },
  { id: 'creative', icon: '🎨', label: 'Yaratıcı'   },
];

function XPBar({ xp, level }: { xp: number; level: number }) {
  // XP needed for next level: (level^2) * 50
  const thisLevelXP = ((level - 1) ** 2) * 50;
  const nextLevelXP = (level ** 2) * 50;
  const progress = Math.min(((xp - thisLevelXP) / (nextLevelXP - thisLevelXP)) * 100, 100);

  return (
    <div>
      <div className="flex justify-between text-xs text-gray-400 mb-1">
        <span>Seviye {level}</span>
        <span>{xp} / {nextLevelXP} XP</span>
      </div>
      <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full transition-all duration-700"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

function StatCard({ icon, value, label }: { icon: string; value: number; label: string }) {
  return (
    <div className="bg-gray-50 rounded-2xl p-4 text-center">
      <div className="text-2xl mb-1">{icon}</div>
      <div className="text-2xl font-bold text-gray-900">{value}</div>
      <div className="text-xs text-gray-400 mt-1">{label}</div>
    </div>
  );
}

export default function ProfilePage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const { t, lang } = useI18n();
  const [saving, setSaving] = useState(false);
  const [previewOutfit, setPreviewOutfit] = useState<CharacterOutfit | null>(null);
  const [previewGender, setPreviewGender] = useState<CharacterGender | null>(null);

  if (!user || !profile) {
    return <div className="flex items-center justify-center h-64 text-gray-400">Yükleniyor...</div>;
  }

  const noseSize = profile.xp >= 500 ? 1 : profile.xp >= 200 ? 2 : profile.xp >= 50 ? 3 : profile.xp >= 10 ? 4 : 5;
  const outfit = previewOutfit || profile.characterOutfit || 'casual';
  const gender = previewGender || profile.character || 'pino';

  async function saveCharacter() {
    if (!user) return;
    setSaving(true);
    await updateDoc(doc(db, 'users', user.uid), {
      ...(previewOutfit && { characterOutfit: previewOutfit }),
      ...(previewGender && { character: previewGender }),
    });
    setPreviewOutfit(null);
    setPreviewGender(null);
    setSaving(false);
  }

  const hasChanges = previewOutfit !== null || previewGender !== null;

  return (
    <main className="max-w-2xl mx-auto px-6 py-8">
      <h1 className="text-2xl font-bold text-gray-900 mb-8">{t('nav.profile')}</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left — Character */}
        <div className="bg-white rounded-2xl border border-gray-100 p-6">
          <h2 className="font-semibold text-gray-700 mb-4">Karakterin</h2>

          {/* Big character preview */}
          <div className="flex justify-center mb-4">
            <PinoCharacter gender={gender} mood="happy" noseSize={noseSize} size={140} outfit={outfit} />
          </div>

          <div className="text-center mb-4">
            <span className="text-lg font-bold text-gray-800 capitalize">{gender}</span>
            <span className="text-gray-400 mx-2">·</span>
            <span className="text-sm text-gray-500">{OUTFITS.find(o => o.id === outfit)?.label}</span>
          </div>

          {/* Gender switch */}
          <div className="flex gap-2 mb-4">
            {(['pino', 'pina'] as CharacterGender[]).map((g) => (
              <button
                key={g}
                onClick={() => setPreviewGender(g === profile.character && !previewGender ? null : g)}
                className={`flex-1 py-2 rounded-xl text-sm font-medium transition ${
                  gender === g ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {g === 'pino' ? '👦 Pino' : '👧 Pina'}
              </button>
            ))}
          </div>

          {/* Outfit selection */}
          <div className="grid grid-cols-2 gap-2">
            {OUTFITS.map((o) => (
              <button
                key={o.id}
                onClick={() => setPreviewOutfit(o.id === profile.characterOutfit && !previewOutfit ? null : o.id)}
                className={`flex items-center gap-2 p-3 rounded-xl text-sm transition ${
                  outfit === o.id ? 'bg-indigo-50 border-2 border-indigo-400 text-indigo-700' : 'bg-gray-50 border-2 border-transparent text-gray-600 hover:bg-gray-100'
                }`}
              >
                <span>{o.icon}</span><span>{o.label}</span>
              </button>
            ))}
          </div>

          {hasChanges && (
            <button
              onClick={saveCharacter}
              disabled={saving}
              className="w-full mt-4 py-3 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition"
            >
              {saving ? 'Kaydediliyor...' : 'Kaydet ✓'}
            </button>
          )}
        </div>

        {/* Right — XP & Stats */}
        <div className="flex flex-col gap-4">
          {/* XP card */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-700">XP & Seviye</h2>
              <div className="flex items-center gap-1.5 bg-amber-50 px-3 py-1 rounded-full">
                <span className="text-amber-500">🔥</span>
                <span className="text-sm font-semibold text-amber-600">{profile.streak} gün seri</span>
              </div>
            </div>
            <XPBar xp={profile.xp} level={profile.level || 1} />

            {/* Nose progress */}
            <div className="mt-4 p-3 bg-gray-50 rounded-xl">
              <div className="flex items-center justify-between text-xs text-gray-500 mb-1">
                <span>Burun boyu</span>
                <span>{noseSize === 1 ? '⭐ Kısa (Usta!)' : noseSize === 2 ? '😊 Oldukça kısa' : noseSize === 3 ? '😐 Orta' : noseSize === 4 ? '😬 Uzun' : '😱 Çok uzun!'}</span>
              </div>
              <div className="h-2 bg-amber-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-amber-400 rounded-full transition-all"
                  style={{ width: `${((5 - noseSize) / 4) * 100}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1">
                {noseSize >= 4 ? 'Daha fazla not yaz, burnunu küçült! 👃' : 'Harika gidiyorsun! 🌟'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="bg-white rounded-2xl border border-gray-100 p-6">
            <h2 className="font-semibold text-gray-700 mb-4">İstatistikler</h2>
            <div className="grid grid-cols-3 gap-3">
              <StatCard icon="📝" value={profile.noteCount || 0} label="Not" />
              <StatCard icon="✅" value={profile.taskCount || 0} label="Görev" />
              <StatCard icon="🤝" value={profile.helpGivenCount || 0} label="Yardım" />
            </div>
          </div>

          {/* XP rewards reference */}
          <div className="bg-indigo-50 rounded-2xl p-5">
            <h3 className="text-sm font-semibold text-indigo-700 mb-3">XP Kazan</h3>
            <div className="space-y-2">
              {[
                { icon: '📝', label: 'Not yaz', xp: '+5' },
                { icon: '✅', label: 'Görevi tamamla', xp: '+15' },
                { icon: '🤝', label: 'Toplulukta yardım et', xp: '+30' },
                { icon: '🌅', label: 'Her gün giriş yap', xp: '+10' },
                { icon: '🌍', label: 'Projeyi paylaş', xp: '+25' },
              ].map((r) => (
                <div key={r.label} className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">{r.icon} {r.label}</span>
                  <span className="text-indigo-600 font-semibold">{r.xp} XP</span>
                </div>
              ))}
            </div>
          </div>

          {/* Language */}
          <div className="bg-white rounded-2xl border border-gray-100 p-5">
            <h2 className="font-semibold text-gray-700 mb-3">Dil / Language</h2>
            <LanguageSwitcher />
          </div>
        </div>
      </div>
    </main>
  );
}
