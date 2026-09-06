'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import { useTranslation } from '@/lib/i18n';

/** Same shape the login form accepts, so anything you can log in with you can recover with. */
function looksLikePhone(value: string): boolean {
    const stripped = value.replace(/[\s\-()]/g, '');
    return /^\+?992[0-9]{9}$/.test(stripped) || /^[0-9]{9}$/.test(stripped);
}

export default function ForgotPasswordPage() {
    const { t, tError } = useTranslation();
    const [identifier, setIdentifier] = useState('');
    const [loading, setLoading] = useState(false);
    // 'ask' → 'sent' for an email link; 'ask' → 'code' → 'done' for a phone,
    // whose accounts have no reachable address to mail a link to.
    const [step, setStep] = useState<'ask' | 'sent' | 'code' | 'done'>('ask');
    const [code, setCode] = useState('');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');

    const inputStyle: React.CSSProperties = {
        padding: '12px 16px',
        borderRadius: '8px',
        border: '1px solid var(--border)',
        fontSize: '1rem',
        outline: 'none',
        width: '100%',
        boxSizing: 'border-box',
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');

        const byPhone = looksLikePhone(identifier);

        try {
            const res = await fetch(
                byPhone ? '/api/auth/forgot-password/mobile' : '/api/auth/forgot-password',
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ identifier: identifier.trim(), email: identifier.trim() }),
                }
            );

            const data = await res.json();

            if (res.ok) {
                setStep(byPhone ? 'code' : 'sent');
            } else {
                setError(tError(data.error) || t('common.somethingWentWrong'));
            }
        } catch {
            setError(t('auth.networkError'));
        } finally {
            setLoading(false);
        }
    };

    const handleReset = async (e: React.FormEvent) => {
        e.preventDefault();
        if (password !== confirm) {
            setError(t('auth.passwordsDoNotMatch'));
            return;
        }
        setLoading(true);
        setError('');

        try {
            const res = await fetch('/api/auth/reset-password/mobile', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ identifier: identifier.trim(), code, password }),
            });
            const data = await res.json();

            if (res.ok) {
                setStep('done');
            } else {
                setError(tError(data.error) || t('common.somethingWentWrong'));
            }
        } catch {
            setError(t('auth.networkError'));
        } finally {
            setLoading(false);
        }
    };

    const errorBox = error ? (
        <div style={{
            backgroundColor: '#fee2e2',
            color: '#b91c1c',
            padding: '12px 16px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '0.9rem'
        }}>
            {error}
        </div>
    ) : null;

    if (step === 'sent') {
        return (
            <AuthLayout title={t('auth.emailSentTitle')} subtitle={t('auth.resetLinkSent')}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '24px' }}>📧</div>
                    <p style={{ color: 'var(--text-light)', marginBottom: '24px', lineHeight: '1.6', fontSize: '0.9rem' }}>
                        {t('auth.linkValid')}
                    </p>
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                        <button onClick={() => setStep('ask')} className="btn btn-outline">
                            {t('auth.tryAgain')}
                        </button>
                        <Link href="/login" className="btn btn-primary">
                            {t('common.login')}
                        </Link>
                    </div>
                </div>
            </AuthLayout>
        );
    }

    if (step === 'done') {
        return (
            <AuthLayout title={t('auth.resetSuccessTitle')} subtitle={t('auth.resetSuccessDesc')}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: '4rem', marginBottom: '24px' }}>✅</div>
                    <Link href="/login" className="btn btn-primary">
                        {t('auth.goToLogin')}
                    </Link>
                </div>
            </AuthLayout>
        );
    }

    if (step === 'code') {
        return (
            <AuthLayout title={t('auth.resetPassword')} subtitle={t('auth.resetPasswordSubtitle')}>
                {errorBox}
                <form onSubmit={handleReset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
                        {t('auth.verifyPhoneCodeSent', { phone: identifier.trim() })}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="fp-code" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                            {t('auth.verifyPhoneCodeLabel')}
                        </label>
                        <input
                            id="fp-code"
                            type="text"
                            inputMode="numeric"
                            autoComplete="one-time-code"
                            placeholder={t('auth.verifyPhoneCodePlaceholder')}
                            required
                            value={code}
                            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="fp-password" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                            {t('auth.newPassword')}
                        </label>
                        <input
                            id="fp-password"
                            type="password"
                            autoComplete="new-password"
                            placeholder={t('auth.passwordHint')}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="fp-confirm" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                            {t('auth.confirmPassword')}
                        </label>
                        <input
                            id="fp-confirm"
                            type="password"
                            autoComplete="new-password"
                            placeholder={t('auth.confirmPasswordPlaceholder')}
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            style={inputStyle}
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading || code.length < 6}
                        className="btn btn-primary"
                        style={{ width: '100%', opacity: loading || code.length < 6 ? 0.7 : 1 }}
                    >
                        {loading ? t('auth.resetting') : t('auth.resetPasswordBtn')}
                    </button>
                    <button
                        type="button"
                        onClick={() => { setStep('ask'); setCode(''); setError(''); }}
                        style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        {t('auth.verifyPhoneChangeNumber')}
                    </button>
                </form>
            </AuthLayout>
        );
    }

    return (
        <AuthLayout title={t('auth.forgotPasswordTitle')} subtitle={t('auth.forgotPasswordSubtitleShort')}>
            {errorBox}

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="fp-identifier" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                        {t('auth.forgotPasswordIdentifierLabel')}
                    </label>
                    <input
                        id="fp-identifier"
                        type="text"
                        autoComplete="username"
                        value={identifier}
                        onChange={(e) => setIdentifier(e.target.value)}
                        placeholder={t('auth.forgotPasswordIdentifierPlaceholder')}
                        required
                        style={inputStyle}
                    />
                </div>

                <button
                    type="submit"
                    disabled={loading}
                    className="btn btn-primary"
                    style={{ width: '100%', opacity: loading ? 0.7 : 1 }}
                >
                    {loading ? t('auth.sending') : t('auth.sendResetLink')}
                </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.95rem' }}>
                <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                    ← {t('auth.backToLogin')}
                </Link>
            </div>
        </AuthLayout>
    );
}
