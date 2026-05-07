import { cookies } from 'next/headers';
import { DEFAULT_LOCALE, type Locale } from './types';
import ru from './locales/ru.json';
import tj from './locales/tj.json';

type TranslationDict = Record<string, unknown>;

const translations: Record<Locale, TranslationDict> = { ru, tj };

function getNestedValue(obj: unknown, path: string): string | undefined {
    const keys = path.split('.');
    let current: unknown = obj;
    for (const key of keys) {
        if (current == null || typeof current !== 'object') return undefined;
        current = (current as Record<string, unknown>)[key];
    }
    return typeof current === 'string' ? current : undefined;
}

export async function getServerTranslation() {
    const cookieStore = await cookies();
    const raw = cookieStore.get('dastiyor_locale')?.value;
    const locale: Locale = (raw === 'ru' || raw === 'tj') ? raw : DEFAULT_LOCALE;

    function t(key: string, params?: Record<string, string | number>): string {
        let value = getNestedValue(translations[locale], key)
            ?? getNestedValue(translations[DEFAULT_LOCALE], key)
            ?? key;

        if (params) {
            Object.entries(params).forEach(([k, v]) => {
                value = value.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
            });
        }

        return value;
    }

    return { t, locale };
}
