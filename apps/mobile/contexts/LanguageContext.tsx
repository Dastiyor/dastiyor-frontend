import { createContext, useContext, useEffect, useMemo, useState, ReactNode } from 'react';
import * as storage from '@/lib/storage';
import { api } from '@/lib/api-client';
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

/**
 * Mirror the choice to the server, which builds notifications and emails for
 * events other users trigger and so cannot read it off the request.
 *
 * Only when signed in: a 401 from this endpoint would trip the session-expired
 * handler and bounce a guest to the login screen on launch.
 */
async function syncLocale(locale: Locale) {
  const token = await storage.getItem('auth_token').catch(() => null);
  if (!token) return;
  await api.put('/api/profile/locale', { locale }).catch(() => {});
}

/**
 * Push the stored language to the account that just signed in.
 *
 * Picking a language happens on the login screen, i.e. signed out, where
 * syncLocale has no token to send. Without this the account kept whatever
 * locale it was last left with -- so notifications and emails arrived in the
 * wrong language no matter what the app was set to. Called from AuthContext
 * after every sign-in path.
 */
export async function syncStoredLocale() {
  const stored = await storage.getItem(STORAGE_KEY).catch(() => null);
  if (stored === 'ru' || stored === 'tj' || stored === 'en') {
    await syncLocale(stored);
  }
}

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>('ru');

  useEffect(() => {
    storage.getItem(STORAGE_KEY)
      .then((val) => {
        if (val === 'ru' || val === 'tj' || val === 'en') {
          setLocaleState(val);
          // Covers a language picked while signed out, then signed in later.
          void syncLocale(val);
        }
      })
      .catch(() => {});
  }, []);

  async function setLocale(next: Locale) {
    setLocaleState(next);
    await storage.setItem(STORAGE_KEY, next);
    // Notifications are built server-side for events another user triggers, so
    // the choice has to be stored there too. Best-effort: a signed-out user or
    // a failed call just leaves the server on its previous value.
    void syncLocale(next);
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
