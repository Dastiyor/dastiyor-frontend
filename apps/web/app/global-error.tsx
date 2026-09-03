'use client';

import { useEffect, useState } from 'react';

// ponytail: global-error replaces the root layout, so I18nProvider is gone and
// `t` is unavailable. Three strings inlined rather than pulling both locale
// JSONs (~128KB) into the crash bundle.
const STRINGS = {
    ru: {
        title: 'Что-то пошло не так',
        body: 'Произошла критическая ошибка. Попробуйте перезагрузить страницу.',
        reload: 'Перезагрузить',
    },
    tj: {
        title: 'Хатогӣ рух дод',
        body: 'Хатогии ҷиддӣ рух дод. Лутфан саҳифаро аз нав бор кунед.',
        reload: 'Аз нав бор кардан',
    },
} as const;

export default function GlobalError({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const [locale, setLocale] = useState<keyof typeof STRINGS>('ru');

    useEffect(() => {
        console.error(error);
    }, [error]);

    useEffect(() => {
        if (document.cookie.includes('dastiyor_locale=tj')) setLocale('tj');
    }, []);

    const s = STRINGS[locale];

    return (
        <html>
            <body style={{ margin: 0, fontFamily: 'sans-serif' }}>
                <div style={{
                    minHeight: '100vh',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '16px',
                    padding: '40px 20px',
                    textAlign: 'center',
                    backgroundColor: '#f9fafb',
                }}>
                    <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                        {s.title}
                    </h2>
                    <p style={{ color: '#6b7280', maxWidth: '400px' }}>
                        {s.body}
                    </p>
                    <button
                        onClick={reset}
                        style={{
                            padding: '10px 24px',
                            backgroundColor: '#2563eb',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '0.95rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        {s.reload}
                    </button>
                </div>
            </body>
        </html>
    );
}

