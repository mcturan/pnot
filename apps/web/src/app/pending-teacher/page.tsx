'use client';
import { useRouter } from 'next/navigation';
import { useUserProfile } from '@/hooks/useUserProfile';
import { useEffect } from 'react';
import PinoCharacter from '@/components/PinoCharacter';

export default function PendingTeacherPage() {
  const { profile } = useUserProfile();
  const router = useRouter();

  useEffect(() => {
    if (profile?.teacherStatus === 'approved') router.push('/dashboard');
    if (profile?.teacherStatus === 'rejected')  router.push('/apply-teacher');
  }, [profile, router]);

  return (
    <main className="min-h-screen bg-indigo-50 flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md text-center">
        <PinoCharacter gender={profile?.character || 'pino'} mood="thinking" noseSize={3} size={120} outfit="student" className="mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-gray-900 mb-3">Başvurun İnceleniyor...</h1>
        <p className="text-gray-500 mb-4">
          Belgelerini inceliyoruz. Genellikle <strong>1-2 iş günü</strong> içinde geri dönüyoruz.
        </p>
        <div className="bg-indigo-50 rounded-2xl p-4 text-sm text-indigo-700 mb-6">
          📧 Onaylandığında <strong>{profile?.email}</strong> adresine bildirim gönderilecek.
        </div>
        <p className="text-xs text-gray-400 mb-6">
          Bu sürede normal kullanıcı olarak devam edebilirsin (5 ücretsiz proje).
        </p>
        <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
          Uygulamaya Dön
        </button>
      </div>
    </main>
  );
}
