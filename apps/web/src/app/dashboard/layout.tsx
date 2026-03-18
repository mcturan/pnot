'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useI18n } from '@/lib/i18n/context';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import { signOut } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
  }, [user, loading, router]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-xl font-bold text-indigo-600">PNOT</Link>
          <nav className="hidden md:flex items-center gap-4">
            <Link href="/dashboard" className="text-sm text-gray-500 hover:text-indigo-600 font-medium">
              {t('nav.projects')}
            </Link>
            <Link href="/community" className="text-sm text-gray-500 hover:text-indigo-600 font-medium">
              {t('nav.community')}
            </Link>
          </nav>
        </div>
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <img
            src={user.photoURL || ''}
            alt={user.displayName || ''}
            className="w-8 h-8 rounded-full border border-gray-200"
          />
          <button
            onClick={() => signOut().then(() => router.push('/'))}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            {t('nav.logout')}
          </button>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
