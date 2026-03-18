'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import PinoCharacter from '@/components/PinoCharacter';

export default function JoinClassPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const [code, setCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState('');

  async function handleJoin() {
    if (!code.trim()) return;
    setJoining(true);
    setError('');
    try {
      const fn = httpsCallable(functions, 'joinClassroom');
      const { data } = await fn({ inviteCode: code.trim().toUpperCase() });
      const { classroomId } = data as { classroomId: string };
      router.push(`/dashboard/classroom/${classroomId}`);
    } catch (e: unknown) {
      setError((e as Error).message || 'Geçersiz kod, tekrar dene.');
    } finally {
      setJoining(false);
    }
  }

  return (
    <main className="max-w-md mx-auto px-6 py-16 text-center">
      <PinoCharacter
        gender={profile?.character || 'pino'}
        mood="excited"
        noseSize={3}
        size={110}
        outfit="student"
        className="mx-auto mb-6"
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-2">Sınıfa Katıl</h1>
      <p className="text-gray-400 text-sm mb-8">
        Öğretmeninin verdiği kodu gir.
      </p>

      <div className="flex gap-3">
        <input
          placeholder="ABCD12"
          value={code}
          onChange={(e) => setCode(e.target.value.toUpperCase())}
          onKeyDown={(e) => e.key === 'Enter' && handleJoin()}
          maxLength={8}
          className="flex-1 border border-gray-200 rounded-xl px-4 py-4 text-center text-xl font-bold font-mono tracking-widest outline-none focus:border-indigo-400"
          autoFocus
        />
        <button
          onClick={handleJoin}
          disabled={!code.trim() || joining}
          className="px-6 py-4 bg-indigo-600 text-white rounded-xl font-semibold hover:bg-indigo-700 disabled:opacity-50"
        >
          {joining ? '...' : 'Katıl'}
        </button>
      </div>

      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </main>
  );
}
