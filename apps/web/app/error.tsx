'use client';

import { useEffect } from 'react';
import { useTranslation } from '@/lib/i18n';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
    const { t } = useTranslation();

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div style={{
            minHeight: '60vh',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '16px',
            padding: '40px 20px',
            textAlign: 'center',
        }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#111827' }}>
                {t('systemPages.errTitle')}
            </h2>
            <p style={{ color: '#6b7280', maxWidth: '400px' }}>
                {t('systemPages.errText')}
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
                {t('systemPages.retryBtn')}
            </button>
        </div>
    );
}
