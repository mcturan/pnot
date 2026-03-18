'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { uploadTeacherDoc } from '@/lib/classroom';
import PinoCharacter from '@/components/PinoCharacter';

export default function ApplyTeacherPage() {
  const { user, loading } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();

  const [form, setForm] = useState({ schoolName: '', subject: '', city: '' });
  const [idFile, setIdFile]           = useState<File | null>(null);
  const [credFile, setCredFile]       = useState<File | null>(null);
  const [submitting, setSubmitting]   = useState(false);
  const [done, setDone]               = useState(false);
  const [error, setError]             = useState('');

  useEffect(() => {
    if (!loading && !user) router.push('/auth/login');
    if (profile?.teacherStatus === 'approved') router.push('/dashboard');
    if (profile?.teacherStatus === 'pending')  router.push('/pending-teacher');
  }, [user, loading, profile, router]);

  async function handleSubmit() {
    if (!user || !form.schoolName || !form.subject || !idFile || !credFile) {
      setError('Lütfen tüm alanları doldurun ve iki belgeyi de yükleyin.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const [idUrl, credUrl] = await Promise.all([
        uploadTeacherDoc(user.uid, idFile, 'id'),
        uploadTeacherDoc(user.uid, credFile, 'credential'),
      ]);

      await setDoc(doc(db, 'teacherApplications', user.uid), {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        schoolName: form.schoolName,
        subject: form.subject,
        city: form.city,
        studentIdUrl: idUrl,
        documentUrl: credUrl,
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      // Update user doc with pending status
      await setDoc(doc(db, 'users', user.uid), { teacherStatus: 'pending' }, { merge: true });

      setDone(true);
    } catch (e) {
      setError('Bir hata oluştu, tekrar deneyin.');
    } finally {
      setSubmitting(false);
    }
  }

  if (done) {
    return (
      <main className="min-h-screen bg-indigo-50 flex items-center justify-center p-6">
        <div className="bg-white rounded-3xl shadow-xl p-10 max-w-md text-center">
          <PinoCharacter gender={profile?.character || 'pino'} mood="excited" noseSize={2} size={120} outfit="student" className="mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-3">Başvurun alındı! 🎉</h1>
          <p className="text-gray-500 mb-6">Belgelerini inceliyoruz. Genellikle 1-2 iş günü içinde geri dönüyoruz. Onaylandığında e-posta alacaksın.</p>
          <button onClick={() => router.push('/dashboard')} className="px-6 py-3 bg-indigo-600 text-white rounded-xl font-medium hover:bg-indigo-700">
            Uygulamaya Dön
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-gray-50 py-12 px-6">
      <div className="max-w-xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center gap-2 mb-4">
            <PinoCharacter gender="pino"  mood="working"  noseSize={2} size={80} outfit="student" />
            <PinoCharacter gender="pina"  mood="thinking" noseSize={2} size={80} outfit="business" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Öğretmen Başvurusu</h1>
          <p className="text-gray-400 mt-2 text-sm">
            Onaylandıktan sonra PNOT'u <strong>tamamen ücretsiz</strong> kullanırsın —
            sınırsız sınıf, proje ve öğrenci. 🎓
          </p>
        </div>

        <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
          {/* School */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Okul Adı *</label>
            <input
              value={form.schoolName}
              onChange={(e) => setForm({ ...form, schoolName: e.target.value })}
              placeholder="İstanbul Lisesi"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          {/* Subject */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ders / Alan *</label>
            <input
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
              placeholder="Matematik, Fizik, Bilgisayar..."
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400"
            />
          </div>
          {/* City */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Şehir</label>
            <input
              value={form.city}
              onChange={(e) => setForm({ ...form, city: e.target.value })}
              placeholder="İstanbul"
              className="w-full border border-gray-200 rounded-xl px-4 py-3 text-sm outline-none focus:border-indigo-400"
            />
          </div>

          {/* ID upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kimlik / Öğretmen Kartı Fotoğrafı *</label>
            <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition ${idFile ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}>
              <span className="text-2xl">{idFile ? '✅' : '🪪'}</span>
              <span className="text-sm text-gray-600">{idFile ? idFile.name : 'Dosya seç (jpg, png, pdf)'}</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => setIdFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          {/* Credential upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Okul Yazısı veya Öğretmen Belgesi *</label>
            <label className={`flex items-center gap-3 border-2 border-dashed rounded-xl px-4 py-4 cursor-pointer transition ${credFile ? 'border-green-300 bg-green-50' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50'}`}>
              <span className="text-2xl">{credFile ? '✅' : '📄'}</span>
              <span className="text-sm text-gray-600">{credFile ? credFile.name : 'Dosya seç (jpg, png, pdf)'}</span>
              <input type="file" accept=".jpg,.jpeg,.png,.pdf" className="hidden" onChange={(e) => setCredFile(e.target.files?.[0] || null)} />
            </label>
          </div>

          {error && <p className="text-red-500 text-sm">{error}</p>}

          <div className="bg-amber-50 rounded-xl p-4 text-xs text-amber-700">
            🔒 Belgeler yalnızca doğrulama için kullanılır. Onay sonrası sistemden silinir.
          </div>

          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="w-full py-4 bg-indigo-600 text-white rounded-2xl font-semibold text-lg hover:bg-indigo-700 transition disabled:opacity-50"
          >
            {submitting ? 'Yükleniyor...' : 'Başvuruyu Gönder 🎓'}
          </button>
        </div>
      </div>
    </main>
  );
}
