'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useI18n } from '@/lib/i18n/context';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import PinoCharacter from '@/components/PinoCharacter';
import PinoHelper from '@/components/PinoHelper';
import { signOut } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading: authLoading } = useAuth();
  const { profile, loading: profileLoading } = useUserProfile();
  const router = useRouter();
  const { t } = useI18n();

  useEffect(() => {
    if (authLoading || profileLoading) return;
    if (!user) { router.push('/auth/login'); return; }
    // First time: no character set → onboarding
    if (profile && !profile.character) router.push('/setup');
  }, [user, profile, authLoading, profileLoading, router]);

  if (authLoading || profileLoading || !user) {
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
          {/* Mini Pinocchio + XP */}
          <Link href="/dashboard/profile" className="flex items-center gap-2 hover:bg-gray-50 rounded-xl px-2 py-1 transition">
            <PinoCharacter
              gender={profile?.character || 'pino'}
              mood="happy"
              noseSize={profile ? (profile.xp >= 500 ? 1 : profile.xp >= 200 ? 2 : profile.xp >= 50 ? 3 : profile.xp >= 10 ? 4 : 5) : 5}
              size={32}
              outfit={profile?.characterOutfit || 'casual'}
            />
            <div className="hidden sm:flex flex-col items-start">
              <span className="text-xs font-semibold text-gray-700">Lv.{profile?.level || 1}</span>
              <span className="text-xs text-indigo-500">{profile?.xp || 0} XP</span>
            </div>
          </Link>
          <button
            onClick={() => signOut().then(() => router.push('/'))}
            className="text-sm text-gray-400 hover:text-gray-600"
          >
            {t('nav.logout')}
          </button>
        </div>
      </header>

      <div className="flex-1">{children}</div>

      {/* Floating Pino/Pina helper */}
      <PinoHelper
        gender={profile?.character || 'pino'}
        xp={profile?.xp || 0}
        noteCount={profile?.noteCount || 0}
        taskCount={profile?.taskCount || 0}
      />
    </div>
  );
}
