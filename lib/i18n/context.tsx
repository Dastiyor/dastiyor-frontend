'use client';

import { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { Locale, DEFAULT_LOCALE } from './types';
import ru from './locales/ru.json';
import tj from './locales/tj.json';

type TranslationDict = Record<string, unknown>;

const translations: Record<Locale, TranslationDict> = { ru, tj };

interface I18nContextType {
    locale: Locale;
    setLocale: (locale: Locale) => void;
    t: (key: string, params?: Record<string, string | number>) => string;
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

export function I18nProvider({ children }: { children: ReactNode }) {
    const [locale, setLocaleState] = useState<Locale>(() => {
        if (typeof window === 'undefined') return DEFAULT_LOCALE;
        const saved = localStorage.getItem('dastiyor_locale') as Locale | null;
        return (saved === 'ru' || saved === 'tj') ? saved : DEFAULT_LOCALE;
    });

    const setLocale = useCallback((newLocale: Locale) => {
        setLocaleState(newLocale);
        localStorage.setItem('dastiyor_locale', newLocale);
        document.documentElement.lang = newLocale;
    }, []);

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

    return (
        <I18nContext.Provider value={{ locale, setLocale, t }}>
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
