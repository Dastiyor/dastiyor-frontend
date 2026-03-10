'use client';

import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';

type PaymentStatus = 'loading' | 'success' | 'failed' | 'pending';

export default function PaymentResultPage() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [status, setStatus] = useState<PaymentStatus>('loading');
    const [planName, setPlanName] = useState('');

    useEffect(() => {
        if (!orderId) {
            setStatus('failed');
            return;
        }

        // Poll payment status (webhook may not have arrived yet)
        let attempts = 0;
        const maxAttempts = 10;

        const checkStatus = async () => {
            try {
                const res = await fetch(`/api/payments/status?orderId=${orderId}`);
                const data = await res.json();

                if (data.status === 'COMPLETED') {
                    setStatus('success');
                    setPlanName(data.planName || '');
                    return true;
                } else if (data.status === 'FAILED' || data.status === 'CANCELLED') {
                    setStatus('failed');
                    return true;
                }
                return false;
            } catch {
                return false;
            }
        };

        const poll = async () => {
            const done = await checkStatus();
            if (!done && attempts < maxAttempts) {
                attempts++;
                setTimeout(poll, 2000);
            } else if (!done) {
                setStatus('pending');
            }
        };

        poll();
    }, [orderId]);

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: 'var(--secondary)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '24px',
                padding: '60px 48px',
                maxWidth: '500px',
                width: '100%',
                textAlign: 'center',
                boxShadow: '0 4px 24px rgba(0,0,0,0.06)',
            }}>
                {status === 'loading' && (
                    <>
                        <div style={{ fontSize: '4rem', marginBottom: '24px' }}>
                            <div style={{
                                width: '64px',
                                height: '64px',
                                border: '4px solid #e5e7eb',
                                borderTopColor: 'var(--primary)',
                                borderRadius: '50%',
                                margin: '0 auto',
                                animation: 'spin 1s linear infinite',
                            }} />
                        </div>
                        <h1 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '12px' }}>
                            Проверяем оплату...
                        </h1>
                        <p style={{ color: 'var(--text-light)' }}>
                            Пожалуйста, подождите. Это займет несколько секунд.
                        </p>
                    </>
                )}

                {status === 'success' && (
                    <>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: '#D1FAE5',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            fontSize: '2.5rem',
                        }}>
                            ✓
                        </div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '12px', color: '#166534' }}>
                            Оплата прошла успешно!
                        </h1>
                        <p style={{ color: 'var(--text-light)', marginBottom: '8px' }}>
                            {planName && `Подписка «${planName}» активирована.`}
                        </p>
                        <p style={{ color: 'var(--text-light)', marginBottom: '32px', fontSize: '0.9rem' }}>
                            Номер заказа: {orderId}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Link
                                href="/provider"
                                className="btn btn-primary"
                                style={{ padding: '14px 32px', borderRadius: '12px' }}
                            >
                                В личный кабинет
                            </Link>
                            <Link
                                href="/provider/payment-history"
                                className="btn btn-outline"
                                style={{ padding: '14px 32px', borderRadius: '12px' }}
                            >
                                История платежей
                            </Link>
                        </div>
                    </>
                )}

                {status === 'failed' && (
                    <>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: '#FEE2E2',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            fontSize: '2.5rem',
                        }}>
                            ✕
                        </div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '12px', color: '#991B1B' }}>
                            Оплата не прошла
                        </h1>
                        <p style={{ color: 'var(--text-light)', marginBottom: '32px' }}>
                            К сожалению, платёж не был обработан. Средства не списаны. Попробуйте ещё раз.
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Link
                                href="/subscription"
                                className="btn btn-primary"
                                style={{ padding: '14px 32px', borderRadius: '12px' }}
                            >
                                Попробовать снова
                            </Link>
                            <Link
                                href="/provider"
                                className="btn btn-outline"
                                style={{ padding: '14px 32px', borderRadius: '12px' }}
                            >
                                В личный кабинет
                            </Link>
                        </div>
                    </>
                )}

                {status === 'pending' && (
                    <>
                        <div style={{
                            width: '80px',
                            height: '80px',
                            borderRadius: '50%',
                            backgroundColor: '#FEF3C7',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px',
                            fontSize: '2.5rem',
                        }}>
                            ⏳
                        </div>
                        <h1 style={{ fontSize: '1.8rem', fontWeight: '700', marginBottom: '12px', color: '#92400E' }}>
                            Платёж обрабатывается
                        </h1>
                        <p style={{ color: 'var(--text-light)', marginBottom: '12px' }}>
                            Ваш платёж ещё обрабатывается. Подписка будет активирована автоматически после подтверждения.
                        </p>
                        <p style={{ color: 'var(--text-light)', marginBottom: '32px', fontSize: '0.9rem' }}>
                            Номер заказа: {orderId}
                        </p>
                        <Link
                            href="/provider"
                            className="btn btn-primary"
                            style={{ padding: '14px 32px', borderRadius: '12px' }}
                        >
                            В личный кабинет
                        </Link>
                    </>
                )}
            </div>

            <style>{`
                @keyframes spin {
                    to { transform: rotate(360deg); }
                }
            `}</style>
        </div>
    );
}
