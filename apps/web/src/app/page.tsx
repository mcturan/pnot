'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n/context';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PinoCharacter from '@/components/PinoCharacter';
import Link from 'next/link';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  const features = [
    { key: 'notes', icon: '📝' },
    { key: 'tasks', icon: '✅' },
    { key: 'collab', icon: '👥' },
    { key: 'community', icon: '🌍' },
  ] as const;

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100 sticky top-0 bg-white/95 backdrop-blur z-10">
        <span className="text-2xl font-bold text-indigo-600">PNOT</span>
        <div className="flex items-center gap-3">
          <Link
            href="/community"
            className="text-sm text-gray-500 hover:text-indigo-600 font-medium hidden sm:block"
          >
            {t('nav.community')}
          </Link>
          <LanguageSwitcher />
          <Link
            href="/auth/login"
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
          >
            {t('nav.login')}
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="max-w-5xl mx-auto px-6 py-20 flex flex-col md:flex-row items-center gap-12">
        {/* Characters */}
        <div className="flex gap-2 shrink-0">
          <div className="flex flex-col items-center">
            <PinoCharacter gender="pino" mood="working" noseSize={2} size={130} outfit="business" />
            <span className="text-xs text-gray-400 mt-1">Pino</span>
          </div>
          <div className="flex flex-col items-center">
            <PinoCharacter gender="pina" mood="excited" noseSize={2} size={130} outfit="student" />
            <span className="text-xs text-gray-400 mt-1">Pina</span>
          </div>
        </div>

        {/* Text */}
        <div>
          <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-5">
            📋 {t('landing.tagline')}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold text-gray-900 mb-5 leading-tight whitespace-pre-line">
            {t('landing.hero')}
          </h1>
          <p className="text-lg text-gray-500 mb-8">{t('landing.sub')}</p>
          <Link
            href="/auth/login"
            className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl text-lg font-semibold hover:bg-indigo-700 transition shadow-lg"
          >
            {t('landing.cta')} →
          </Link>
          <p className="text-sm text-gray-400 mt-4">{t('landing.free_hint')}</p>
        </div>
      </section>

      {/* Hook slogans */}
      <section className="bg-indigo-600 py-12">
        <div className="max-w-4xl mx-auto px-6 grid grid-cols-1 md:grid-cols-2 gap-8 text-center">
          <div>
            <p className="text-indigo-200 text-lg">{t('landing.hook1')}</p>
            <p className="text-white text-3xl font-bold mt-1">{t('landing.hook1_cta')}</p>
          </div>
          <div>
            <p className="text-indigo-200 text-lg">{t('landing.hook2')}</p>
            <p className="text-white text-3xl font-bold mt-1">{t('landing.hook2_cta')}</p>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((f) => (
            <div key={f.key} className="bg-gray-50 rounded-2xl p-6">
              <div className="text-4xl mb-4">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-2">{t(`feature.${f.key}.title` as any)}</h3>
              <p className="text-gray-500 text-sm">{t(`feature.${f.key}.desc` as any)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Pinocchio story section */}
      <section className="bg-amber-50 py-16">
        <div className="max-w-3xl mx-auto px-6 text-center">
          <div className="flex justify-center gap-6 mb-6">
            <PinoCharacter gender="pino" mood="thinking" noseSize={4} size={90} outfit="student" />
            <PinoCharacter gender="pina" mood="happy" noseSize={2} size={90} outfit="creative" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Pinocchio'nun burnu kısalıyor... 👃
          </h2>
          <p className="text-gray-600 mb-3">
            Pino ve Pina, proje notları aldıkça daha dürüst — burnları kısalıyor. Not yaz, görev tamamla, toplulukta yardım et — XP kazan ve karakterini geliştir.
          </p>
          <p className="text-gray-500 text-sm">
            Kıyafet değiştir. Onu besle. Onu büyüt. Ve o da sana destek olsun. 🎭
          </p>
        </div>
      </section>

      {/* Community CTA */}
      <section className="max-w-4xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          🌍 Global öğrenci & proje topluluğu
        </h2>
        <p className="text-gray-500 mb-8 max-w-xl mx-auto">
          Dünyanın her yerinden insanlarla projende işbirliği yap. Yardım et, XP kazan, karakterini büyüt.
        </p>
        <Link
          href="/community"
          className="px-8 py-4 border-2 border-indigo-600 text-indigo-600 rounded-xl font-semibold hover:bg-indigo-50 transition"
        >
          Topluluğa Gözat →
        </Link>
      </section>

      <footer className="border-t border-gray-100 py-8 text-center text-sm text-gray-400">
        <p>© 2026 PNOT · pnot.app · Pino & Pina ile yapıldı 🎭</p>
      </footer>
    </main>
  );
}
