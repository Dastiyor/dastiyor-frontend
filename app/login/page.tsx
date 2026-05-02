'use client';

import { useState, Suspense } from 'react';
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

function LoginContent() {
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const searchParams = useSearchParams();
    const { t } = useTranslation();

    const redirect = searchParams.get('redirect') || '';
    const titleKey = redirect === '/create-task' ? 'auth.loginToPostTask' : 'auth.welcomeBack';
    const subtitleKey = redirect === '/create-task' ? 'auth.loginToPostTaskSubtitle' : 'auth.loginSubtitle';

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
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <AuthLayout
            title={t(titleKey)}
            subtitle={t(subtitleKey)}
        >
            {error && (
                <div style={{
                    backgroundColor: '#ffebee',
                    color: '#c62828',
                    padding: '12px',
                    borderRadius: '8px',
                    marginBottom: '20px',
                    fontSize: '0.9rem'
                }}>
                    {error}
                </div>
            )}

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
