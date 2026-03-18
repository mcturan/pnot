'use client';
import { useState, useEffect } from 'react';
import PinoCharacter from './PinoCharacter';
import { useI18n } from '@/lib/i18n/context';

interface PinoHelperProps {
  gender?: 'pino' | 'pina';
  xp?: number;
  noteCount?: number;
  taskCount?: number;
}

function xpToNoseSize(xp: number): number {
  // Çok XP = kısa burun (dürüst Pinocchio)
  if (xp >= 500) return 1;
  if (xp >= 200) return 2;
  if (xp >= 50) return 3;
  if (xp >= 10) return 4;
  return 5;
}

const TIPS = [
  'char.tip_note',
  'char.tip_task',
  'char.greeting',
] as const;

export default function PinoHelper({ gender = 'pino', xp = 0, noteCount = 0, taskCount = 0 }: PinoHelperProps) {
  const { t } = useI18n();
  const [open, setOpen] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);
  const [mood, setMood] = useState<'happy' | 'thinking' | 'excited' | 'working'>('happy');
  const [bouncing, setBouncing] = useState(false);

  const noseSize = xpToNoseSize(xp);

  // Periyodik ipucu ve mood değişimi
  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length);
      const moods: typeof mood[] = ['happy', 'thinking', 'excited', 'working'];
      setMood(moods[Math.floor(Math.random() * moods.length)]);
      setBouncing(true);
      setTimeout(() => setBouncing(false), 600);
    }, 8000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Konuşma balonu */}
      {open && (
        <div className="bg-white border border-gray-100 rounded-2xl rounded-br-sm shadow-lg p-4 max-w-[220px] text-sm text-gray-700 animate-fade-in">
          <p>{t(TIPS[tipIndex])}</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <div className="flex items-center gap-1 text-xs text-indigo-600 bg-indigo-50 px-2 py-1 rounded-full">
              ⭐ {xp} XP
            </div>
            {noteCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
                📝 {noteCount}
              </div>
            )}
            {taskCount > 0 && (
              <div className="flex items-center gap-1 text-xs text-amber-600 bg-amber-50 px-2 py-1 rounded-full">
                ✅ {taskCount}
              </div>
            )}
          </div>
          {noseSize >= 4 && (
            <p className="text-xs text-gray-400 mt-2">Not yaz, burnum küçülsün! 👃</p>
          )}
        </div>
      )}

      {/* Karakter butonu */}
      <button
        onClick={() => setOpen(!open)}
        className={`transition-transform hover:scale-110 ${bouncing ? 'animate-bounce' : ''}`}
        title={gender === 'pino' ? 'Pino' : 'Pina'}
      >
        <PinoCharacter
          gender={gender}
          mood={mood}
          noseSize={noseSize}
          size={80}
          className="drop-shadow-lg"
        />
      </button>
    </div>
  );
}
