'use client';

import { useState } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import { useRouter } from 'next/navigation';
import { checkPasswordStrength } from '@/lib/validation';
import { useTranslation } from '@/lib/i18n';

type Role = 'customer' | 'provider' | null;

export default function RegisterPage() {
    const [role, setRole] = useState<Role>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [passwordFeedback, setPasswordFeedback] = useState<string[]>([]);
    const router = useRouter();
    const { t } = useTranslation();

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
                    <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.fullName')}</label>
                    <input
                        name="fullName"
                        type="text"
                        placeholder={t('auth.fullNamePlaceholder')}
                        required
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
                    <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.emailLabel')}</label>
                    <input
                        name="email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        required
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
                    <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.phone')}</label>
                    <input
                        name="phone"
                        type="tel"
                        placeholder="+992 00 000 0000"
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
                    <label style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.passwordLabel')}</label>
                    <input
                        name="password"
                        type="password"
                        placeholder={t('auth.passwordHint')}
                        required
                        minLength={8}
                        onChange={(e) => {
                            const p = e.target.value;
                            if (!p) {
                                setPasswordFeedback([]);
                                return;
                            }
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
                            padding: '12px 16px',
                            borderRadius: '8px',
                            border: `1px solid ${passwordFeedback.length > 0 ? '#ef4444' : 'var(--border)'}`,
                            fontSize: '1rem',
                            outline: 'none',
                        }}
                    />
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
                    className={`btn ${role === 'provider' ? 'btn-accent' : 'btn-primary'}`}
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
