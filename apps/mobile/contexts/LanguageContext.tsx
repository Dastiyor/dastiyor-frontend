import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as storage from '@/lib/storage';
import { type Locale, type Translations, getTranslations } from '@/lib/i18n';
import { localizeTerm } from '@/lib/terms';

interface LanguageState {
  locale: Locale;
  t: Translations;
  /** Localize a canonical (Russian) category/city value for display. */
  tr: (value: string) => string;
  setLocale: (locale: Locale) => Promise<void>;
}

const LanguageContext = createContext<LanguageState | null>(null);

const STORAGE_KEY = 'app_locale';

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ru');

  useEffect(() => {
    storage.getItem(STORAGE_KEY)
      .then((val) => { if (val === 'ru' || val === 'tj' || val === 'en') setLocaleState(val); })
      .catch(() => {});
  }, []);

  async function setLocale(next: Locale) {
    setLocaleState(next);
    await storage.setItem(STORAGE_KEY, next);
  }

  // Stable identity per locale so consumers' useMemo/useCallback deps don't thrash.
  const value = useMemo<LanguageState>(() => ({
    locale,
    t: getTranslations(locale),
    tr: (v: string) => localizeTerm(v, locale),
    setLocale,
  }), [locale]);

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
