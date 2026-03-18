'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/hooks/useAuth';
import { signOut } from '@/lib/auth';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();

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
      {/* Top bar */}
      <header className="bg-white border-b border-gray-100 px-6 py-3 flex items-center justify-between sticky top-0 z-10">
        <Link href="/dashboard" className="text-xl font-bold text-indigo-600">PNOT</Link>
        <div className="flex items-center gap-3">
          <img
            src={user.photoURL || ''}
            alt={user.displayName || ''}
            className="w-8 h-8 rounded-full"
          />
          <button
            onClick={() => signOut().then(() => router.push('/'))}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            Çıkış
          </button>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
