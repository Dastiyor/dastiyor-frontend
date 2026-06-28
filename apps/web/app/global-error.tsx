'use client';

import { useEffect } from 'react';

export default function GlobalError({
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
                        Something went wrong
                    </h2>
                    <p style={{ color: '#6b7280', maxWidth: '400px' }}>
                        A critical error occurred. Please try reloading the page.
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
                        Reload
                    </button>
                </div>
            </body>
        </html>
    );
}

