'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n/context';
import PinoCharacter from '@/components/PinoCharacter';
import { CharacterGender, CharacterOutfit } from '@pnot/shared';

const OUTFITS: { id: CharacterOutfit; label: { tr: string; en: string }; icon: string }[] = [
  { id: 'casual',   label: { tr: 'Günlük',      en: 'Casual'    }, icon: '😎' },
  { id: 'business', label: { tr: 'Beyaz Yaka',  en: 'Business'  }, icon: '💼' },
  { id: 'student',  label: { tr: 'Öğrenci',     en: 'Student'   }, icon: '🎓' },
  { id: 'creative', label: { tr: 'Yaratıcı',    en: 'Creative'  }, icon: '🎨' },
];

export default function SetupPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { lang } = useI18n();
  const [character, setCharacter] = useState<CharacterGender>('pino');
  const [outfit, setOutfit] = useState<CharacterOutfit>('casual');
  const [saving, setSaving] = useState(false);
  const [step, setStep] = useState<'character' | 'outfit'>('character');

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    await updateDoc(doc(db, 'users', user.uid), {
      character,
      characterOutfit: outfit,
      xp: 0,
      level: 1,
      streak: 0,
      noteCount: 0,
      taskCount: 0,
      helpGivenCount: 0,
    });
    router.push('/dashboard');
  }

  if (loading || !user) return null;

  const isEN = lang === 'en';

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-8 w-full max-w-lg text-center">

        {step === 'character' ? (
          <>
            <div className="text-3xl font-bold text-gray-900 mb-2">
              {isEN ? 'Choose your companion' : 'Yardımcını seç'}
            </div>
            <p className="text-gray-400 text-sm mb-8">
              {isEN
                ? 'Pino or Pina will guide you through your projects. Their nose shrinks as you earn XP!'
                : 'Pino ya da Pina, projelerinde sana rehberlik edecek. XP kazandıkça burnu küçülüyor!'}
            </p>

            <div className="flex justify-center gap-8 mb-10">
              {(['pino', 'pina'] as CharacterGender[]).map((g) => (
                <button
                  key={g}
                  onClick={() => setCharacter(g)}
                  className={`flex flex-col items-center p-4 rounded-2xl border-2 transition-all ${
                    character === g
                      ? 'border-indigo-500 bg-indigo-50 scale-105'
                      : 'border-gray-100 hover:border-indigo-200'
                  }`}
                >
                  <PinoCharacter gender={g} mood={character === g ? 'excited' : 'happy'} noseSize={5} size={110} outfit={outfit} />
                  <span className="mt-3 font-semibold text-gray-700 capitalize">{g}</span>
                  {character === g && <span className="text-xs text-indigo-500 mt-1">✓ Seçildi</span>}
                </button>
              ))}
            </div>

            <button
              onClick={() => setStep('outfit')}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-lg hover:bg-indigo-700 transition"
            >
              {isEN ? 'Next: Choose Outfit →' : 'Devam: Kıyafet Seç →'}
            </button>
          </>
        ) : (
          <>
            <button onClick={() => setStep('character')} className="text-sm text-gray-400 hover:text-gray-600 mb-4 block">
              ← {isEN ? 'Back' : 'Geri'}
            </button>

            <div className="text-3xl font-bold text-gray-900 mb-2">
              {isEN ? 'Pick an outfit' : 'Kıyafet seç'}
            </div>
            <p className="text-gray-400 text-sm mb-6">
              {isEN ? 'You can change this anytime from your profile.' : 'Profilden istediğin zaman değiştirebilirsin.'}
            </p>

            {/* Live preview */}
            <div className="flex justify-center mb-6">
              <PinoCharacter gender={character} mood="happy" noseSize={3} size={110} outfit={outfit} />
            </div>

            <div className="grid grid-cols-2 gap-3 mb-8">
              {OUTFITS.map((o) => (
                <button
                  key={o.id}
                  onClick={() => setOutfit(o.id)}
                  className={`flex items-center gap-3 p-4 rounded-2xl border-2 text-left transition ${
                    outfit === o.id
                      ? 'border-indigo-500 bg-indigo-50'
                      : 'border-gray-100 hover:border-indigo-200'
                  }`}
                >
                  <span className="text-2xl">{o.icon}</span>
                  <div>
                    <div className="font-medium text-gray-800">{isEN ? o.label.en : o.label.tr}</div>
                    {outfit === o.id && <div className="text-xs text-indigo-500">✓</div>}
                  </div>
                </button>
              ))}
            </div>

            <button
              onClick={handleSave}
              disabled={saving}
              className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-lg hover:bg-indigo-700 transition disabled:opacity-50"
            >
              {saving
                ? (isEN ? 'Setting up...' : 'Ayarlanıyor...')
                : (isEN ? "Let's go! 🎭" : 'Hadi başlayalım! 🎭')}
            </button>
          </>
        )}
      </div>
    </main>
  );
}
