'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams, redirect } from 'next/navigation';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';

type PaymentStatus = 'loading' | 'success' | 'failed' | 'pending';

function PaymentResultContent() {
    const searchParams = useSearchParams();
    const orderId = searchParams.get('orderId');
    const [status, setStatus] = useState<PaymentStatus>('loading');
    const [planName, setPlanName] = useState('');
    const { t } = useTranslation();

    useEffect(() => {
        if (!orderId) {
            setStatus('failed');
            return;
        }

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
                            {t('payment.checkingPayment')}
                        </h1>
                        <p style={{ color: 'var(--text-light)' }}>
                            {t('payment.pleaseWait')}
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
                            {t('payment.successTitle')}
                        </h1>
                        <p style={{ color: 'var(--text-light)', marginBottom: '8px' }}>
                            {planName && t('payment.subscriptionActivated', { name: planName })}
                        </p>
                        <p style={{ color: 'var(--text-light)', marginBottom: '32px', fontSize: '0.9rem' }}>
                            {t('payment.orderNumber')} {orderId}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Link
                                href="/provider"
                                className="btn btn-primary"
                                style={{ padding: '14px 32px', borderRadius: '12px' }}
                            >
                                {t('payment.toDashboard')}
                            </Link>
                            <Link
                                href="/provider/payment-history"
                                className="btn btn-outline"
                                style={{ padding: '14px 32px', borderRadius: '12px' }}
                            >
                                {t('payment.paymentHistory')}
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
                            {t('payment.failedTitle')}
                        </h1>
                        <p style={{ color: 'var(--text-light)', marginBottom: '32px' }}>
                            {t('payment.failedDesc')}
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                            <Link
                                href="/subscription"
                                className="btn btn-primary"
                                style={{ padding: '14px 32px', borderRadius: '12px' }}
                            >
                                {t('payment.tryAgain')}
                            </Link>
                            <Link
                                href="/provider"
                                className="btn btn-outline"
                                style={{ padding: '14px 32px', borderRadius: '12px' }}
                            >
                                {t('payment.toDashboard')}
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
                            {t('payment.pendingTitle')}
                        </h1>
                        <p style={{ color: 'var(--text-light)', marginBottom: '12px' }}>
                            {t('payment.pendingDesc')}
                        </p>
                        <p style={{ color: 'var(--text-light)', marginBottom: '32px', fontSize: '0.9rem' }}>
                            {t('payment.orderNumber')} {orderId}
                        </p>
                        <Link
                            href="/provider"
                            className="btn btn-primary"
                            style={{ padding: '14px 32px', borderRadius: '12px' }}
                        >
                            {t('payment.toDashboard')}
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

export default function PaymentResultPage() {
    // Subscriptions are temporarily hidden — see lib/features.ts
    if (!SUBSCRIPTIONS_ENABLED) redirect('/');

    return (
        <Suspense fallback={
            <div style={{
                minHeight: '100vh',
                backgroundColor: 'var(--secondary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <div style={{
                    width: '64px',
                    height: '64px',
                    border: '4px solid #e5e7eb',
                    borderTopColor: 'var(--primary)',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite',
                }} />
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
            </div>
        }>
            <PaymentResultContent />
        </Suspense>
    );
}
