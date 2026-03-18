'use client';
import { useState, useEffect } from 'react';
import PinoCharacter from './PinoCharacter';
import { CharacterGender } from '@pnot/shared';

export interface GuideStep {
  title:   string;
  body:    string;
  mood?:   'happy' | 'thinking' | 'excited' | 'working';
  emoji?:  string;
}

interface PinoGuideProps {
  tourId:    string;           // unique per page, stored in localStorage
  steps:     GuideStep[];
  gender?:   CharacterGender;
  autoShow?: boolean;          // show automatically on first visit (default: true)
  position?: 'center' | 'bottom-right' | 'bottom-left';
}

export default function PinoGuide({
  tourId,
  steps,
  gender = 'pino',
  autoShow = true,
  position = 'center',
}: PinoGuideProps) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (!autoShow) return;
    const seen = JSON.parse(localStorage.getItem('pnot_tours') || '[]') as string[];
    if (!seen.includes(tourId)) setVisible(true);
  }, [tourId, autoShow]);

  function dismiss() {
    const seen = JSON.parse(localStorage.getItem('pnot_tours') || '[]') as string[];
    if (!seen.includes(tourId)) {
      localStorage.setItem('pnot_tours', JSON.stringify([...seen, tourId]));
    }
    setVisible(false);
    setStep(0);
  }

  function next() {
    if (step < steps.length - 1) setStep(step + 1);
    else dismiss();
  }

  function prev() {
    if (step > 0) setStep(step - 1);
  }

  if (!visible || steps.length === 0) return null;

  const current = steps[step];
  const isLast  = step === steps.length - 1;

  const posClass = position === 'center'
    ? 'fixed inset-0 flex items-center justify-center'
    : position === 'bottom-right'
    ? 'fixed bottom-24 right-6'
    : 'fixed bottom-24 left-6';

  return (
    <div className={`${posClass} z-[60]`}>
      {/* Backdrop only for center */}
      {position === 'center' && (
        <div className="absolute inset-0 bg-black/30" onClick={dismiss} />
      )}

      <div className={`relative bg-white rounded-3xl shadow-2xl p-6 ${position === 'center' ? 'max-w-sm w-full mx-4' : 'max-w-xs w-72'}`}>
        {/* Close */}
        <button onClick={dismiss} className="absolute top-4 right-4 text-gray-300 hover:text-gray-500 text-xl leading-none">×</button>

        {/* Character */}
        <div className="flex items-end gap-4 mb-4">
          <div className="shrink-0">
            <PinoCharacter gender={gender} mood={current.mood || 'excited'} noseSize={2} size={80} outfit="casual" />
          </div>
          <div className="flex-1">
            <div className="bg-indigo-50 rounded-2xl rounded-bl-sm px-4 py-3">
              <p className="text-sm font-semibold text-indigo-700 mb-1">
                {current.emoji && <span className="mr-1">{current.emoji}</span>}
                {current.title}
              </p>
              <p className="text-sm text-gray-600 leading-relaxed">{current.body}</p>
            </div>
          </div>
        </div>

        {/* Progress dots */}
        {steps.length > 1 && (
          <div className="flex justify-center gap-1.5 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1.5 rounded-full transition-all ${i === step ? 'w-6 bg-indigo-500' : 'w-1.5 bg-gray-200'}`}
              />
            ))}
          </div>
        )}

        {/* Buttons */}
        <div className="flex gap-2">
          {step > 0 && (
            <button onClick={prev} className="px-4 py-2 border border-gray-200 rounded-xl text-sm text-gray-500 hover:bg-gray-50">
              ← Geri
            </button>
          )}
          <button
            onClick={next}
            className="flex-1 py-2 bg-indigo-600 text-white rounded-xl text-sm font-semibold hover:bg-indigo-700 transition"
          >
            {isLast ? 'Anladım! 🎉' : 'Devam →'}
          </button>
        </div>

        {/* Skip all */}
        {steps.length > 1 && !isLast && (
          <button onClick={dismiss} className="w-full text-center text-xs text-gray-300 hover:text-gray-400 mt-3">
            Turu atla
          </button>
        )}
      </div>
    </div>
  );
}

// ── Predefined tours ──────────────────────────────────────────────────────────
// Import and use these in each page

export const TOURS = {
  dashboard: (gender: CharacterGender): GuideStep[] => [
    {
      title: gender === 'pino' ? 'Merhaba, ben Pino!' : 'Merhaba, ben Pina!',
      body: 'Proje not defterine hoş geldin! Burası tüm projelerini görebileceğin ana sayfa.',
      mood: 'excited',
      emoji: '🎭',
    },
    {
      title: 'Proje oluştur',
      body: '"+ Yeni Proje" butonuna bas, bir isim ve emoji seç. İlk projen saniyeler içinde hazır!',
      mood: 'working',
      emoji: '📋',
    },
    {
      title: 'WhatsApp\'tan kaçış',
      body: 'Artık proje detayları mesaj akışında kaybolmayacak. Her şey burada, düzenli.',
      mood: 'happy',
      emoji: '🎉',
    },
  ],

  project: (gender: CharacterGender): GuideStep[] => [
    {
      title: 'Bu bir proje sayfası',
      body: 'Projeni sayfalara böl — "Genel", "Görevler", "Toplantı Notları" gibi. Her sayfa ayrı bir not defteri.',
      mood: 'thinking',
      emoji: '📁',
    },
    {
      title: 'Ekibini davet et',
      body: '"Üye Davet Et" butonuna bas, linki WhatsApp\'ta paylaş. Ekibiniz saniyede katılır.',
      mood: 'excited',
      emoji: '👥',
    },
    {
      title: 'Topluluğa aç',
      body: 'Destek lazımsa "Topluluğa Aç" ile projeyi paylaş. Dünyanın her yerinden insanlar yardım edebilir +XP kazanır!',
      mood: 'happy',
      emoji: '🌍',
    },
  ],

  pageView: (gender: CharacterGender): GuideStep[] => [
    {
      title: 'Not almak çok kolay',
      body: 'Alt kutucuğa yaz ve Enter\'a bas. Mesaj atmak kadar basit — ama çok daha organize!',
      mood: 'working',
      emoji: '✍️',
    },
    {
      title: 'Göreve dönüştür',
      body: '"Görev olarak ekle" kutusunu işaretle ya da bir notun altından "Göreve Dönüştür"e tıkla.',
      mood: 'thinking',
      emoji: '✅',
    },
    {
      title: 'Kanban görünümü',
      body: 'Üstteki "Kanban" sekmesine geç. Görevleri Yapılacak / Yapılıyor / Tamamlandı kolonlarında görürsün.',
      mood: 'excited',
      emoji: '📋',
    },
    {
      title: 'Yanıt zinciri',
      body: 'Bir notun altına yanıt ekleyebilirsin — WhatsApp\'taki gibi ama proje odaklı ve hiç kaybolmadan.',
      mood: 'happy',
      emoji: '💬',
    },
  ],

  classroom: (gender: CharacterGender): GuideStep[] => [
    {
      title: 'Hoş geldin, öğretmenim! 🎓',
      body: 'Bu senin sınıf yönetim alanın. Buradan sınıf oluşturabilir, öğrencileri ekleyebilir ve projeler atayabilirsin.',
      mood: 'excited',
      emoji: '🏫',
    },
    {
      title: 'Sınıf nasıl oluşturulur?',
      body: '"+ Yeni Sınıf" butonuna bas. Sınıfa bir isim ver, renk ve emoji seç. Her sınıfın özel bir katılım kodu olacak.',
      mood: 'working',
      emoji: '📝',
    },
    {
      title: 'Öğrenciler nasıl katılır?',
      body: 'Katılım kodunu öğrencilerine ver. Onlar kodu girerek sınıfa katılır — hepsi bu kadar!',
      mood: 'happy',
      emoji: '🔑',
    },
    {
      title: 'Gruplar ve projeler',
      body: 'Öğrencileri gruplara ayır, her gruba ayrı proje ata. Herkesin ne yaptığını buradan takip edebilirsin.',
      mood: 'thinking',
      emoji: '👥',
    },
  ],

  community: (gender: CharacterGender): GuideStep[] => [
    {
      title: 'Global Topluluk',
      body: 'Burası dünyanın her yerindeki PNOT kullanıcılarının birbirine yardım ettiği alan!',
      mood: 'excited',
      emoji: '🌍',
    },
    {
      title: 'Yardım et, XP kazan',
      body: 'Bir projeye yardım teklif edersen +30 XP kazanırsın. Bu, Pino\'nun burnunu kısaltır! 👃',
      mood: 'happy',
      emoji: '⭐',
    },
    {
      title: 'Projeyi paylaş',
      body: 'Kendi projene destek arıyorsan proje sayfasından "Topluluğa Aç" butonunu kullan.',
      mood: 'working',
      emoji: '🚀',
    },
  ],
};
