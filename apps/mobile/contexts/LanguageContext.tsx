import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import * as storage from '@/lib/storage';
import { type Locale, type Translations, getTranslations } from '@/lib/i18n';

interface LanguageState {
  locale: Locale;
  t: Translations;
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

  return (
    <LanguageContext.Provider value={{ locale, t: getTranslations(locale), setLocale }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const ctx = useContext(LanguageContext);
  if (!ctx) throw new Error('useLanguage must be used within LanguageProvider');
  return ctx;
}
