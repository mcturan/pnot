'use client';
import { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { db, functions } from '@/lib/firebase';
import { httpsCallable } from 'firebase/functions';
import { useAuth } from '@/hooks/useAuth';
import { signInWithGoogle } from '@/lib/auth';
import { Invite } from '@pnot/shared';

export default function InvitePage() {
  const { token } = useParams<{ token: string }>();
  const { user, loading } = useAuth();
  const router = useRouter();
  const [invite, setInvite] = useState<Invite | null>(null);
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getDoc(doc(db, 'invites', token)).then((snap) => {
      if (snap.exists()) setInvite({ id: snap.id, ...snap.data() } as Invite);
      else setError('Davet geçersiz veya süresi dolmuş.');
    });
  }, [token]);

  async function handleJoin() {
    if (!user) {
      await signInWithGoogle();
      return;
    }
    setJoining(true);
    try {
      const fn = httpsCallable(functions, 'acceptInvite');
      const result = await fn({ token });
      const { projectId } = result.data as { projectId: string };
      router.push(`/dashboard/projects/${projectId}`);
    } catch (e: unknown) {
      setError((e as Error).message || 'Katılım başarısız');
      setJoining(false);
    }
  }

  if (loading) return null;

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-5xl mb-4">😕</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </main>
    );
  }

  if (!invite) return null;

  return (
    <main className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-10 w-full max-w-md text-center">
        <div className="text-5xl mb-4">{invite.projectEmoji}</div>
        <h1 className="text-xl font-bold text-gray-900 mb-1">{invite.projectName}</h1>
        <p className="text-gray-400 text-sm mb-8">
          <strong>{invite.createdByName}</strong> seni bu projeye davet etti.
        </p>

        <button
          onClick={handleJoin}
          disabled={joining}
          className="w-full px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700 transition disabled:opacity-50"
        >
          {joining ? 'Katılıyor...' : user ? 'Projeye Katıl' : 'Google ile Giriş Yap & Katıl'}
        </button>

        {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
      </div>
    </main>
  );
}
