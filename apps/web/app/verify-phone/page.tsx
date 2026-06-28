'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import AuthLayout from '@/components/auth/AuthLayout';
import { useTranslation } from '@/lib/i18n';

function VerifyPhoneContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    const rawRedirect = searchParams.get('redirect') || '/';
    // Only allow same-site relative redirects
    const redirectTo = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') ? rawRedirect : '/';

    const [step, setStep] = useState<'phone' | 'code'>('phone');
    const [phoneLocal, setPhoneLocal] = useState('');
    const [code, setCode] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fullPhone = phoneLocal ? `+992${phoneLocal}` : '';

    async function sendCode(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return;
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-send', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, type: 'PHONE_VERIFY' }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t('auth.oauthFailed'));
            setStep('code');
        } catch (err: any) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    }

    async function verifyCode(e: React.FormEvent) {
        e.preventDefault();
        if (loading) return;
        setError('');
        setLoading(true);
        try {
            const res = await fetch('/api/auth/verify-phone', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ phone: fullPhone, code }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || t('auth.oauthFailed'));
            // Full reload so server components pick up the verified state
            window.location.href = redirectTo;
        } catch (err: any) {
            setError(err.message);
            setLoading(false);
        }
    }

    const inputStyle: React.CSSProperties = {
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        fontSize: '1rem',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    };

    return (
        <AuthLayout title={t('auth.verifyPhoneTitle')} subtitle={t('auth.verifyPhoneSubtitle')}>
            {error && (
                <div style={{
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.9rem',
                }}>
                    {error}
                </div>
            )}

            {step === 'phone' ? (
                <form onSubmit={sendCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="vp-phone" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                            {t('auth.verifyPhoneNumberLabel')}
                        </label>
                        <div style={{ display: 'flex', borderRadius: '8px', border: '1px solid var(--border)', overflow: 'hidden' }}>
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '6px', padding: '12px 14px',
                                backgroundColor: '#f5f7fa', borderRight: '1px solid var(--border)', whiteSpace: 'nowrap',
                                fontSize: '1rem', color: '#374151', fontWeight: '500', userSelect: 'none', flexShrink: 0,
                            }}>
                                🇹🇯 +992
                            </div>
                            <input
                                id="vp-phone"
                                type="tel"
                                inputMode="numeric"
                                placeholder="XX XXX XXXX"
                                required
                                value={phoneLocal}
                                onChange={(e) => setPhoneLocal(e.target.value.replace(/\D/g, '').slice(0, 9))}
                                style={{ ...inputStyle, border: 'none', flex: 1, minWidth: 0 }}
                            />
                        </div>
                    </div>
                    <button
                        type="submit"
                        disabled={loading || phoneLocal.length < 9}
                        className="btn btn-primary"
                        style={{ width: '100%', opacity: loading || phoneLocal.length < 9 ? 0.7 : 1 }}
                    >
                        {loading ? t('auth.verifyPhoneSending') : t('auth.verifyPhoneSendCode')}
                    </button>
                </form>
            ) : (
                <form onSubmit={verifyCode} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
                        {t('auth.verifyPhoneCodeSent', { phone: fullPhone })}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="vp-code" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                            {t('auth.verifyPhoneCodeLabel')}
                        </label>
                        <input
                            id="vp-code"
                            type="text"
                            inputMode="numeric"
                            placeholder={t('auth.verifyPhoneCodePlaceholder')}
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            style={inputStyle}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || code.length < 6}
                        className="btn btn-primary"
                        style={{ width: '100%', opacity: loading || code.length < 6 ? 0.7 : 1 }}
                    >
                        {loading ? t('auth.verifyPhoneVerifying') : t('auth.verifyPhoneVerify')}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setStep('phone'); setCode(''); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        {t('auth.verifyPhoneChangeNumber')}
                    </button>
                </form>
            )}
        </AuthLayout>
    );
}

export default function VerifyPhonePage() {
    return (
        <Suspense>
            <VerifyPhoneContent />
        </Suspense>
    );
}
