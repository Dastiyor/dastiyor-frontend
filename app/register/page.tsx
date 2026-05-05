'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkPasswordStrength } from '@/lib/validation';
import { useTranslation } from '@/lib/i18n';

type Role = 'customer' | 'provider' | null;

export default function RegisterPage() {
    return (
        <Suspense>
            <RegisterContent />
        </Suspense>
    );
}

function RegisterContent() {
    const searchParams = useSearchParams();
    const typeParam = searchParams.get('type');
    const [role, setRole] = useState<Role>(
        typeParam === 'provider' ? 'provider' : typeParam === 'customer' ? 'customer' : null
    );
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const router = useRouter();
    const { t } = useTranslation();

    useEffect(() => {
        fetch('/api/auth/me').then(res => {
            if (res.ok) return res.json();
        }).then(data => {
            if (data?.role) {
                router.replace(data.role === 'PROVIDER' ? '/provider' : data.role === 'ADMIN' ? '/admin' : '/customer');
            }
        }).catch(() => {});
    }, [router]);

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        setError('');
        setPasswordFeedback([]);

        const formData = new FormData(e.currentTarget);
        const password = String(formData.get('password') || '');
        const { isStrong, feedback } = checkPasswordStrength(password);
        if (!isStrong || password.length < 8) {
            setPasswordFeedback(feedback.length ? feedback : ['Password must be at least 8 characters']);
            setIsLoading(false);
            return;
        }

        const data = {
            fullName: formData.get('fullName'),
            email: formData.get('email'),
            phone: formData.get('phone'),
            password,
            role
        };

        try {
            const res = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data),
            });

            if (!res.ok) {
                const json = await res.json();
                throw new Error(json.error || 'Registration failed');
            }

            // Use full page reload to ensure server components refresh
            // This ensures the Header component re-renders with the new auth state
            window.location.href = '/';
        } catch (err: any) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    }

    if (!role) {
        // ... role selection code (same as before) ...
        return (
            <div style={{
                minHeight: 'calc(100vh - 80px)', // Full height minus header
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                padding: '40px 20px',
                backgroundColor: 'var(--secondary)'
            }}>
                <div style={{ textAlign: 'center', marginBottom: '40px' }}>
                    <h1 className="heading-lg">{t('auth.joinDastiyor')}</h1>
                    <p style={{ color: 'var(--text-light)', fontSize: '1.1rem' }}>{t('auth.chooseRole')}</p>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    width: '100%',
                    maxWidth: '800px'
                }}>
                    {/* Customer Card */}
                    <button
                        onClick={() => setRole('customer')}
                        style={{
                            backgroundColor: 'var(--white)',
                            border: '2px solid transparent',
                            borderRadius: '16px',
                            padding: '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--primary)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        <div style={{
                            width: '80px',
                            height: '80px',
                            backgroundColor: '#e8f0fe',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--primary)',
                            fontSize: '2rem'
                        }}>
                            👤
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{t('auth.iWantToFind')}</h3>
                        <p style={{ color: 'var(--text-light)' }}>{t('auth.iWantToFindDesc')}</p>
                    </button>

                    {/* Provider Card */}
                    <button
                        onClick={() => setRole('provider')}
                        style={{
                            backgroundColor: 'var(--white)',
                            border: '2px solid transparent',
                            borderRadius: '16px',
                            padding: '40px',
                            textAlign: 'center',
                            cursor: 'pointer',
                            transition: 'all 0.2s',
                            boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            gap: '16px'
                        }}
                        onMouseOver={(e) => e.currentTarget.style.borderColor = 'var(--accent)'}
                        onMouseOut={(e) => e.currentTarget.style.borderColor = 'transparent'}
                    >
                        <div style={{
                            width: '80px',
                            height: '80px',
                            backgroundColor: '#fff3e0',
                            borderRadius: '50%',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--accent)',
                            fontSize: '2rem'
                        }}>
                            💼
                        </div>
                        <h3 style={{ fontSize: '1.5rem', fontWeight: '700' }}>{t('auth.iWantToWork')}</h3>
                        <p style={{ color: 'var(--text-light)' }}>{t('auth.iWantToWorkDesc')}</p>
                    </button>
                </div>

                <div style={{ marginTop: '40px' }}>
                    {t('auth.haveAccount')} <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>{t('common.login')}</Link>
                </div>
            </div>
        );
    }

    return (
        <AuthLayout
            title={role === 'customer' ? t('auth.signUpCustomer') : t('auth.signUpProvider')}
            subtitle={t('auth.createAccountSubtitle')}
        >
            <button
                onClick={() => setRole(null)}
                style={{
                    background: 'none',
                    border: 'none',
                    color: 'var(--text-light)',
                    marginBottom: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.9rem'
                }}
            >
                {t('auth.changeRole')}
            </button>

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
                    <label htmlFor="reg-fullName" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.fullName')}</label>
                    <input
                        id="reg-fullName"
                        name="fullName"
                        type="text"
                        placeholder={t('auth.fullNamePlaceholder')}
                        required
                        maxLength={100}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="reg-email" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.emailLabel')}</label>
                    <input
                        id="reg-email"
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
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="reg-phone" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.phone')}</label>
                    <input
                        id="reg-phone"
                        name="phone"
                        type="tel"
                        placeholder="+992 00 000 0000"
                        pattern="[+]?[0-9\s\-\(\)]{7,20}"
                        maxLength={20}
                        style={{
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="reg-password" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.passwordLabel')}</label>
                    <div style={{ position: 'relative' }}>
                        <input
                            id="reg-password"
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t('auth.passwordHint')}
                            required
                            minLength={8}
                            onChange={(e) => {
                                const p = e.target.value;
                                if (!p) { setPasswordFeedback([]); return; }
                                const { isStrong, feedback } = checkPasswordStrength(p);
                                setPasswordFeedback(isStrong ? [] : feedback);
                            }}
                            onBlur={(e) => {
                                const p = e.target.value;
                                if (!p) return;
                                const { isStrong, feedback } = checkPasswordStrength(p);
                                setPasswordFeedback(isStrong ? [] : feedback);
                            }}
                            style={{
                                width: '100%',
                                padding: '12px 44px 12px 16px',
                                borderRadius: '8px',
                                border: `1px solid ${passwordFeedback.length > 0 ? '#ef4444' : 'var(--border)'}`,
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
                            {showPassword ? (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" />
                                </svg>
                            ) : (
                                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" />
                                </svg>
                            )}
                        </button>
                    </div>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                        {t('auth.passwordHint')}
                    </span>
                    {passwordFeedback.length > 0 ? (
                        <ul style={{ margin: 0, paddingLeft: '18px', fontSize: '0.85rem', color: '#c62828' }}>
                            {passwordFeedback.map((msg, i) => (
                                <li key={i}>{msg}</li>
                            ))}
                        </ul>
                    ) : (
                        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '500' }}>
                            ✓ {t('auth.passwordStrong')}
                        </span>
                    )}
                </div>

                <button
                    type="submit"
                    disabled={isLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '8px', opacity: isLoading ? 0.7 : 1 }}
                >
                    {isLoading ? t('auth.creatingAccount') : t('auth.createAccount')}
                </button>
            </form>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '0.95rem' }}>
                {t('auth.haveAccount')}{' '}
                <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                    {t('common.login')}
                </Link>
            </div>
        </AuthLayout>
    );
}
