'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import Link from 'next/link';

export default function LandingPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) router.push('/dashboard');
  }, [user, loading, router]);

  if (loading) return null;

  return (
    <main className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
        <span className="text-2xl font-bold text-indigo-600">PNOT</span>
        <Link
          href="/auth/login"
          className="px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition"
        >
          Giriş Yap
        </Link>
      </nav>

      {/* Hero */}
      <section className="max-w-4xl mx-auto px-6 py-24 text-center">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
          📋 Proje not defteri
        </div>
        <h1 className="text-5xl font-bold text-gray-900 mb-6 leading-tight">
          Proje detayları<br />
          <span className="text-indigo-600">WhatsApp'ta kaybolmasın</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 max-w-2xl mx-auto">
          Ekibinizle birlikte proje notları, görevler ve kararları tek bir yerde toplayın.
          Mesajlaşma uygulamalarındaki kaosun sonu.
        </p>
        <Link
          href="/auth/login"
          className="inline-flex items-center gap-2 px-8 py-4 bg-indigo-600 text-white rounded-xl text-lg font-semibold hover:bg-indigo-700 transition shadow-lg"
        >
          Ücretsiz Başla →
        </Link>
        <p className="text-sm text-gray-400 mt-4">5 proje ücretsiz • Kredi kartı gerekmez</p>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto px-6 pb-24 grid grid-cols-1 md:grid-cols-3 gap-8">
        {[
          { icon: '📝', title: 'Yapılandırılmış Notlar', desc: 'Projeler → Sayfalar → Notlar hiyerarşisi. Her şey yerli yerinde.' },
          { icon: '✅', title: 'Görev Takibi', desc: 'Notları göreve dönüştür, kişilere ata, teslim tarihi ekle.' },
          { icon: '👥', title: 'Gerçek Zamanlı İşbirliği', desc: 'Ekibinizle aynı anda çalışın. Değişiklikler anında görünür.' },
        ].map((f) => (
          <div key={f.title} className="bg-gray-50 rounded-2xl p-6">
            <div className="text-4xl mb-4">{f.icon}</div>
            <h3 className="font-semibold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm">{f.desc}</p>
          </div>
        ))}
      </section>
    </main>
  );
}
