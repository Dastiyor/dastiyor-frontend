'use client';

import { useTranslation } from '@/lib/i18n';
import type { Locale } from '@/lib/i18n';

export default function LanguageSwitcher() {
    const { t, locale, setLocale } = useTranslation();

    const nextLocale: Locale = locale === 'ru' ? 'tj' : 'ru';
    const nextLabel = t(`languageSwitcher.${nextLocale}`);
    const nextFlag = locale === 'ru' ? '🇹🇯' : '🇷🇺';

    // A link rather than a button so that a tap before hydration still switches
    // language, through /api/locale. Once hydrated, the click is handled in place.
    return (
        <a
            href={`/api/locale?set=${nextLocale}`}
            rel="nofollow"
            onClick={(e) => {
                e.preventDefault();
                setLocale(nextLocale);
            }}
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '6px 12px',
                borderRadius: '8px',
                border: '1px solid #E5E7EB',
                backgroundColor: 'transparent',
                color: '#374151',
                fontWeight: '600',
                fontSize: '0.85rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                whiteSpace: 'nowrap',
                textDecoration: 'none',
            }}
        >
            <span style={{ fontSize: '1rem' }}>{nextFlag}</span>
            {nextLabel}
        </a>
    );
}
