'use client';

import { Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

function DevCheckoutContent() {
    const { t } = useTranslation();
    const searchParams = useSearchParams();
    const router = useRouter();
    const orderId = searchParams.get('orderId');
    const amount = searchParams.get('amount');
    const txId = searchParams.get('txId');

    const simulatePayment = async (status: 'success' | 'failed') => {
        await fetch('/api/webhooks/smartpay', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                transaction_id: txId,
                order_id: orderId,
                amount: Number(amount),
                currency: 'TJS',
                status,
                payment_method: 'dev_simulated',
                signature: '',
            }),
        });

        router.push(`/payment/result?orderId=${orderId}`);
    };

    return (
        <div style={{
            minHeight: '100vh',
            backgroundColor: '#1a1a2e',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
        }}>
            <div style={{
                backgroundColor: 'white',
                borderRadius: '16px',
                padding: '48px',
                maxWidth: '440px',
                width: '100%',
            }}>
                <div style={{
                    textAlign: 'center',
                    marginBottom: '32px',
                    padding: '12px',
                    backgroundColor: '#FEF3C7',
                    borderRadius: '8px',
                    fontSize: '0.85rem',
                    color: '#92400E',
                    fontWeight: '600',
                }}>
                    DEV MODE — SmartPay Simulator
                </div>

                <h2 style={{ fontSize: '1.5rem', fontWeight: '700', marginBottom: '24px', textAlign: 'center' }}>
                    {t('payment.subscriptionTitle')}
                </h2>

                <div style={{
                    padding: '20px',
                    backgroundColor: '#f9fafb',
                    borderRadius: '12px',
                    marginBottom: '32px',
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                        <span style={{ color: '#6b7280' }}>{t('payment.orderLabel')}</span>
                        <span style={{ fontWeight: '600' }}>{orderId}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span style={{ color: '#6b7280' }}>{t('payment.amountLabel')}</span>
                        <span style={{ fontWeight: '700', fontSize: '1.3rem' }}>{amount} TJS</span>
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <button
                        onClick={() => simulatePayment('success')}
                        style={{
                            padding: '16px',
                            backgroundColor: '#22c55e',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        {t('payment.paySuccess')}
                    </button>
                    <button
                        onClick={() => simulatePayment('failed')}
                        style={{
                            padding: '16px',
                            backgroundColor: '#ef4444',
                            color: 'white',
                            border: 'none',
                            borderRadius: '12px',
                            fontSize: '1rem',
                            fontWeight: '600',
                            cursor: 'pointer',
                        }}
                    >
                        {t('payment.payFailed')}
                    </button>
                </div>
            </div>
        </div>
    );
}

export function DevCheckoutPage() {
    return (
        <Suspense fallback={
            <div style={{ minHeight: '100vh', backgroundColor: '#1a1a2e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ color: 'white', fontSize: '1.2rem' }}>{/* loading */}...</div>
            </div>
        }>
            <DevCheckoutContent />
        </Suspense>
    );
}
