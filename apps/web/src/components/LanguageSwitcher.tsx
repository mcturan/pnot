'use client';
import { useState, useRef, useEffect } from 'react';
import { useI18n } from '@/lib/i18n/context';
import { LANGUAGES, Lang } from '@/lib/i18n/translations';

export default function LanguageSwitcher() {
  const { lang, setLang } = useI18n();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function close(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 px-3 py-1.5 rounded-lg hover:bg-gray-100 transition"
      >
        <span>{LANGUAGES[lang].flag}</span>
        <span className="hidden sm:inline">{LANGUAGES[lang].name}</span>
        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-1 bg-white border border-gray-100 rounded-xl shadow-lg py-1 z-50 min-w-[160px] max-h-72 overflow-y-auto">
          {(Object.entries(LANGUAGES) as [Lang, typeof LANGUAGES[Lang]][]).map(([code, info]) => (
            <button
              key={code}
              onClick={() => { setLang(code); setOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-2 text-sm hover:bg-gray-50 transition text-left ${lang === code ? 'text-indigo-600 font-medium' : 'text-gray-700'}`}
            >
              <span>{info.flag}</span>
              <span>{info.name}</span>
              {lang === code && <span className="ml-auto text-indigo-400">✓</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
