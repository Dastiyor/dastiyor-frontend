'use client';

import { useEffect } from 'react';

export default function Error({
    error,
    reset,
}: {
    error: Error & { digest?: string };
    reset: () => void;
}) {
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
                Что-то пошло не так
            </h2>
            <p style={{ color: '#6b7280', maxWidth: '400px' }}>
                Произошла непредвиденная ошибка. Попробуйте ещё раз.
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
                Попробовать снова
            </button>
        </div>
    );
}
