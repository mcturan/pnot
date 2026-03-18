'use client';
import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { useUserProfile } from '@/hooks/useUserProfile';
import { addNote, convertToTask } from '@/lib/notes';
import PinoCharacter from '@/components/PinoCharacter';
import { Note } from '@pnot/shared';
import Link from 'next/link';

interface ParsedNote { content: string; isTask: boolean; taskStatus?: string; }

export default function AIImportPage() {
  const { user } = useAuth();
  const { profile } = useUserProfile();
  const router = useRouter();
  const params = useSearchParams();
  const projectId = params.get('projectId') || '';
  const pageId    = params.get('pageId')    || '';

  const [text, setText]         = useState('');
  const [parsed, setParsed]     = useState<{ notes: ParsedNote[]; summary: string } | null>(null);
  const [parsing, setParsing]   = useState(false);
  const [saving, setSaving]     = useState(false);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [error, setError]       = useState('');
  const [mood, setMood]         = useState<'happy'|'thinking'|'excited'>('happy');

  async function handleParse() {
    if (!text.trim()) return;
    setParsing(true);
    setError('');
    setMood('thinking');
    try {
      const res = await fetch('/api/ai-import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
      });
      if (!res.ok) throw new Error('AI isteği başarısız');
      const data = await res.json();
      setParsed(data);
      setSelected(new Set(data.notes.map((_: ParsedNote, i: number) => i)));
      setMood('excited');
    } catch {
      setError('AI analizi başarısız. ANTHROPIC_API_KEY ayarlandı mı?');
      setMood('happy');
    } finally {
      setParsing(false);
    }
  }

  async function handleSave() {
    if (!user || !parsed || !projectId || !pageId) return;
    setSaving(true);
    const notesToSave = parsed.notes.filter((_, i) => selected.has(i));
    for (const note of notesToSave) {
      const id = await addNote(projectId, pageId, note.content, {
        uid: user.uid,
        displayName: user.displayName || 'User',
        photoURL: user.photoURL || '',
      });
      if (note.isTask) await convertToTask(projectId, pageId, id, true);
    }
    setSaving(false);
    router.push(`/dashboard/projects/${projectId}/${pageId}`);
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set((parsed?.notes || []).map((_, i) => i)) : new Set());
  }

  const gender = profile?.character || 'pino';

  return (
    <main className="max-w-3xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center gap-4 mb-8">
        <PinoCharacter gender={gender} mood={mood} noseSize={2} size={80} outfit="business" />
        <div>
          <h1 className="text-2xl font-bold text-gray-900">🤖 AI ile İçe Aktar</h1>
          <p className="text-gray-400 text-sm mt-1">
            WhatsApp veya Telegram sohbetini yapıştır. Pino notlara dönüştürsün!
          </p>
        </div>
      </div>

      {/* Page context */}
      {projectId && pageId ? (
        <div className="bg-indigo-50 rounded-2xl px-4 py-3 mb-6 text-sm text-indigo-700 flex items-center gap-2">
          📋 Notlar şu sayfaya kaydedilecek:
          <Link href={`/dashboard/projects/${projectId}/${pageId}`} className="font-medium underline">
            Sayfaya git
          </Link>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl px-4 py-3 mb-6 text-sm text-amber-700">
          ⚠️ Bu sayfayı bir proje sayfasından açmalısın. URL'ye <code>?projectId=...&pageId=...</code> ekli olmalı.
        </div>
      )}

      {/* Step 1: Paste */}
      <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">
        <h2 className="font-semibold text-gray-700 mb-3">1. Sohbeti Yapıştır</h2>
        <textarea
          placeholder={`WhatsApp veya Telegram sohbetini buraya yapıştır...\n\nÖrnek:\n[10:30, 15.03.2024] Ahmet: Frontend için React kullanacağız\n[10:31, 15.03.2024] Mehmet: Tamam, ayrıca backend için Node.js mi?\n[10:32, 15.03.2024] Ahmet: Evet. Veritabanı PostgreSQL olsun`}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="w-full border border-gray-200 rounded-xl px-4 py-3 outline-none focus:border-indigo-400 resize-none h-48 text-sm font-mono"
        />
        <div className="flex items-center justify-between mt-3">
          <span className="text-xs text-gray-400">{text.length} karakter</span>
          <button
            onClick={handleParse}
            disabled={!text.trim() || parsing || !projectId}
            className="px-6 py-2 bg-indigo-600 text-white rounded-xl text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
          >
            {parsing ? '🤖 Analiz ediliyor...' : '🤖 Analiz Et'}
          </button>
        </div>
        {error && <p className="text-red-500 text-sm mt-3">{error}</p>}
      </div>

      {/* Step 2: Review */}
      {parsed && (
        <div className="bg-white border border-gray-100 rounded-2xl p-6 mb-4">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-700">2. Notları İncele & Seç</h2>
            <div className="flex gap-2">
              <button onClick={() => toggleAll(true)}  className="text-xs text-indigo-600 hover:underline">Tümünü Seç</button>
              <span className="text-gray-300">|</span>
              <button onClick={() => toggleAll(false)} className="text-xs text-gray-400 hover:underline">Temizle</button>
            </div>
          </div>

          {/* Summary */}
          <div className="bg-indigo-50 rounded-xl p-4 mb-4 flex gap-3">
            <PinoCharacter gender={gender} mood="excited" noseSize={2} size={44} />
            <div>
              <p className="text-xs text-indigo-500 font-medium mb-1">Pino'nun özeti:</p>
              <p className="text-sm text-indigo-800">{parsed.summary}</p>
            </div>
          </div>

          <div className="space-y-2">
            {parsed.notes.map((note, i) => (
              <label key={i} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition ${
                selected.has(i) ? 'border-indigo-300 bg-indigo-50' : 'border-gray-100 hover:border-gray-200'
              }`}>
                <input
                  type="checkbox"
                  checked={selected.has(i)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    e.target.checked ? next.add(i) : next.delete(i);
                    setSelected(next);
                  }}
                  className="mt-0.5 rounded"
                />
                <div className="flex-1">
                  <p className="text-sm text-gray-800">{note.content}</p>
                  {note.isTask && (
                    <span className="text-xs bg-amber-100 text-amber-600 px-2 py-0.5 rounded-full mt-1 inline-block">
                      ✅ Görev
                    </span>
                  )}
                </div>
              </label>
            ))}
          </div>

          <div className="flex items-center justify-between mt-6 pt-4 border-t border-gray-50">
            <span className="text-sm text-gray-400">{selected.size} / {parsed.notes.length} not seçildi</span>
            <button
              onClick={handleSave}
              disabled={selected.size === 0 || saving || !projectId}
              className="px-6 py-3 bg-green-600 text-white rounded-xl font-medium hover:bg-green-700 disabled:opacity-50"
            >
              {saving ? 'Kaydediliyor...' : `${selected.size} Notu Kaydet →`}
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
