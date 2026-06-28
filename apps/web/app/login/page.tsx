'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import { useTranslation } from '@/lib/i18n';

function EyeIcon({ open }: { open: boolean }) {
    return open ? (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
        </svg>
    ) : (
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
        </svg>
    );
}

function OAuthButtons({ role }: { role?: string }) {
    const { t } = useTranslation();
    const roleParam = role ? `?role=${role}` : '';
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
                href={`/api/auth/google${roleParam}`}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    padding: '11px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                    backgroundColor: '#fff', color: '#374151', fontSize: '0.95rem', fontWeight: '500',
                    textDecoration: 'none', transition: 'background 0.15s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                onMouseOut={(e) => (e.currentTarget.style.backgroundColor = '#fff')}
            >
                <svg width="18" height="18" viewBox="0 0 48 48" fill="none">
                    <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                    <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                    <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.31-8.16 2.31-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                {t('auth.continueWithGoogle')}
            </a>
            <a
                href={`/api/auth/apple${roleParam}`}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    padding: '11px 16px', borderRadius: '8px', border: '1px solid #000',
                    backgroundColor: '#000', color: '#fff', fontSize: '0.95rem', fontWeight: '500',
                    textDecoration: 'none', transition: 'opacity 0.15s',
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.85')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
            >
                <svg width="16" height="19" viewBox="0 0 814 1000" fill="white">
                    <path d="M788.1 340.9c-5.8 4.5-108.2 62.2-108.2 190.5 0 148.4 130.3 200.9 134.2 202.2-.6 3.2-20.7 71.9-68.7 141.9-42.8 61.6-87.5 123.1-155.5 123.1s-85.5-39.5-164-39.5c-76.5 0-103.7 40.8-165.9 40.8s-105-57.8-155.5-127.4C46 790.7 0 663 0 541.8c0-207.8 135.4-317.7 269-317.7 70.1 0 128.4 46.4 172.5 46.4 42.1 0 108.6-49 190.5-49 30.5 0 110.3 2.6 163.5 63.5zm-216.9-114.9c-10.4-57.4 29.6-116.2 72.1-152.7 51.2-43.5 105.5-68.1 147.9-68.1 0 43.7-19.8 97.7-55.4 134.5-36.6 38.1-90.1 68.7-164.6 86.3z"/>
                </svg>
                {t('auth.continueWithApple')}
            </a>
        </div>
    );
}

function OAuthDivider() {
    const { t } = useTranslation();
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '4px 0' }}>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
            <span style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>{t('auth.orDivider')}</span>
            <div style={{ flex: 1, height: '1px', backgroundColor: 'var(--border)' }} />
        </div>
    );
}

function LoginContent() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    const rawRedirect = searchParams.get('redirect') || '';
    // Validate redirect to prevent open redirect attacks — only allow same-origin paths
    const redirect = rawRedirect.startsWith('/') && !rawRedirect.startsWith('//') && !rawRedirect.includes('://') ? rawRedirect : '';
    const oauthError = searchParams.get('error');
    const titleKey = redirect === '/create-task' ? 'auth.loginToPostTask' : 'auth.welcomeBack';
    const subtitleKey = redirect === '/create-task' ? 'auth.loginToPostTaskSubtitle' : 'auth.loginSubtitle';

    useEffect(() => {
        fetch('/api/auth/me').then(res => {
            if (res.ok) return res.json();
        }).then(data => {
            if (data?.role) {
                router.replace(redirect || (data.role === 'PROVIDER' ? '/provider' : '/customer'));
            }
        }).catch(() => {});
    }, [router, redirect]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError('');

        const formData = new FormData(e.currentTarget);
        const data = {
            email: formData.get('email'),
            password: formData.get('password'),
        };

        try {
            const res = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Login failed');
            }

            const profileRes = await fetch('/api/profile');
            if (profileRes.ok) {
                const profileData = await profileRes.json();
                const role = profileData.user.role;

                if (role === 'PROVIDER') {
                    window.location.href = '/provider';
                } else if (role === 'CUSTOMER') {
                    window.location.href = '/customer';
                } else {
                    window.location.href = '/';
                }
            } else {
                window.location.href = '/';
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Login failed');
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <AuthLayout
            title={t(titleKey)}
            subtitle={t(subtitleKey)}
        >
            {(error || oauthError) && (
                <div style={{
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.9rem'
                }}>
                    {error || (oauthError === 'oauth_cancelled'
                        ? t('auth.oauthCancelled')
                        : oauthError === 'oauth_unavailable'
                            ? t('auth.oauthUnavailable')
                            : t('auth.oauthFailed'))}
                </div>
            )}

            <OAuthButtons />
            <OAuthDivider />

            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="login-email" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.emailLabel')}</label>
                    <input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        required
                        maxLength={254}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <label htmlFor="login-password" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.passwordLabel')}</label>
                        <Link href="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
                            {t('auth.forgotPassword')}
                        </Link>
                    </div>
                    <div style={{ position: 'relative' }}>
                        <input
                            id="login-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t('auth.passwordPlaceholder')}
                            required
                            style={{
                                width: '100%',
                                padding: '12px 44px 12px 16px',
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                fontSize: '1rem',
                                outline: 'none',
                                boxSizing: 'border-box',
                            }}
                        />
                        <button
                            type="button"
                            onClick={() => setShowPassword(!showPassword)}
                            aria-label={showPassword ? 'Скрыть пароль' : 'Показать пароль'}
                            style={{
                                position: 'absolute',
                                right: '12px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--text-light)',
                                padding: '4px',
                                display: 'flex',
                                alignItems: 'center',
                            }}
                        >
                            <EyeIcon open={showPassword} />
                        </button>
                    </div>
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '8px', opacity: isLoading ? 0.7 : 1 }}
                >
                    {isLoading ? t('auth.loggingIn') : t('common.login')}
                </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.95rem' }}>
                {t('auth.noAccount')}{' '}
                <Link href="/register" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                    {t('common.register')}
                </Link>
            </div>
        </AuthLayout>
    );
}

export default function LoginPage() {
    return (
        <Suspense>
            <LoginContent />
        </Suspense>
    );
}
