'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import { Locale, DEFAULT_LOCALE } from './types';
import ru from './locales/ru.json';
import tj from './locales/tj.json';

type TranslationDict = Record<string, unknown>;

import { localizeTerm } from './terms';

const translations: Record<Locale, TranslationDict> = { ru, tj };

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
    /** Localize a canonical (Russian) category/city/budget value for display. */
    tr: (value: string) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

function getNestedValue(obj: unknown, path: string): string | undefined {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[key];
    }
    return typeof current === 'string' ? current : undefined;
}

export function I18nProvider({ children, initialLocale, isAuthenticated = false }: { children: ReactNode; initialLocale?: Locale; isAuthenticated?: boolean }) {
    const [locale, setLocaleState] = useState<Locale>(initialLocale ?? DEFAULT_LOCALE);
    const router = useRouter();

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('dastiyor_locale', newLocale);
        document.documentElement.lang = newLocale;
        document.cookie = `dastiyor_locale=${newLocale};path=/;max-age=31536000;SameSite=Lax`;

        // document.cookie is synchronous, so the refresh below re-renders server
        // components against the locale just written. Without it every
        // getServerTranslation() string (page <h1>s, layouts) keeps the previous
        // language until the next full page load. refresh() only re-fetches the
        // RSC payload -- it does not remount this provider or call setLocale
        // again, so it cannot loop.
        router.refresh();

        // Mirror to the account. Notifications and emails are produced by other
        // people's actions, so the server needs the preference stored rather
        // than read off the request. Signed-out visitors have nothing to store
        // it against, and the cookie above already covers their session.
        if (isAuthenticated) {
            fetch('/api/profile/locale', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ locale: newLocale }),
            }).catch(() => {});
        }
    }, [isAuthenticated, router]);

    const t = useCallback((key: string, params?: Record<string, string | number>): string => {
        let value = getNestedValue(translations[locale], key)
            ?? getNestedValue(translations[DEFAULT_LOCALE], key)
            ?? key;

        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
            });
        }

        return value;
    }, [locale]);

    const tr = useCallback((value: string) => localizeTerm(value, locale), [locale]);

    return (
        <I18nContext.Provider value={{ locale, setLocale, t, tr }}>
            {children}
        </I18nContext.Provider>
    );
}

export function useTranslation() {
    const context = useContext(I18nContext);
    if (!context) {
        throw new Error('useTranslation must be used within I18nProvider');
    }
    return context;
}
