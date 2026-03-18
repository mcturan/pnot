'use client';
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Lang, TranslationKey, translate, LANGUAGES } from './translations';

interface I18nContextType {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: TranslationKey) => string;
  isRTL: boolean;
}

const I18nContext = createContext<I18nContextType>({
  lang: 'en',
  setLang: () => {},
  t: (k) => k,
  isRTL: false,
});

function detectLang(): Lang {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem('pnot_lang') as Lang | null;
  if (saved && LANGUAGES[saved]) return saved;
  const browser = navigator.language.split('-')[0] as Lang;
  if (LANGUAGES[browser]) return browser;
  return 'en';
}

export function I18nProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>('en');

  useEffect(() => {
    setLangState(detectLang());
  }, []);

  function setLang(l: Lang) {
    setLangState(l);
    localStorage.setItem('pnot_lang', l);
    // RTL support
    document.documentElement.dir = LANGUAGES[l].rtl ? 'rtl' : 'ltr';
    document.documentElement.lang = l;
  }

  const isRTL = !!LANGUAGES[lang]?.rtl;

  return (
    <I18nContext.Provider value={{ lang, setLang, t: (k) => translate(k, lang), isRTL }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  return useContext(I18nContext);
}
