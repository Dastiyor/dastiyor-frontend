'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Lock, User } from 'lucide-react';
import FieldIcon, { FIELD_ICON_PADDING } from '@/components/auth/FieldIcon';
import { useTranslation } from '@/lib/i18n';
import { useHydrated } from '@/lib/useHydrated';
import { goToDashboard } from '@/lib/dashboard-redirect';

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

export default function PasswordLoginForm({ onError }: { onError: (message: string, code?: string) => void }) {
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const hydrated = useHydrated();
    const { t, tError } = useTranslation();

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        setIsLoading(true);
        onError('');

        const formData = new FormData(e.currentTarget);
        const data = {
            // A phone number or an email; the API tells them apart.
            identifier: String(formData.get('identifier') ?? '').trim(),
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
                onError(tError(json.error) || t('common.somethingWentWrong'), json.code);
                return;
            }

            await goToDashboard();
        } catch (err) {
            onError(err instanceof Error ? err.message : t('common.somethingWentWrong'));
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <form method="post" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label htmlFor="login-email" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.identifierLabel')}</label>
                {/* type="text": type="email" made the browser refuse a phone number,
                    though the API has always accepted one. The id stays for the e2e specs. */}
                <div style={{ position: 'relative' }}>
                    <FieldIcon icon={User} />
                    <input
                        id="login-email"
                        name="identifier"
                        type="text"
                        autoComplete="username"
                        autoCapitalize="none"
                        spellCheck={false}
                        placeholder={t('auth.identifierPlaceholder')}
                        required
                        maxLength={254}
                        style={{
                            width: '100%',
                            boxSizing: 'border-box',
                            padding: '12px 16px',
                            paddingLeft: FIELD_ICON_PADDING,
                            borderRadius: '8px',
                            border: '1px solid var(--border)',
                            fontSize: '1rem',
                            outline: 'none',
                            transition: 'border-color 0.2s',
                        }}
                    />
                </div>
                {/* The server takes +992 90 123 4567, 992901234567 or the 9 digits alone. */}
                <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>{t('auth.phoneFormatHint')}</span>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label htmlFor="login-password" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.passwordLabel')}</label>
                    <Link href="/forgot-password" style={{ fontSize: '0.85rem', color: 'var(--primary)' }}>
                        {t('auth.forgotPassword')}
                    </Link>
                </div>
                <div style={{ position: 'relative' }}>
                    <FieldIcon icon={Lock} />
                    <input
                        id="login-password"
                        name="password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder={t('auth.passwordPlaceholder')}
                        required
                        style={{
                            width: '100%',
                            padding: `12px 44px 12px ${FIELD_ICON_PADDING}`,
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
                        aria-label={showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
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
                disabled={!hydrated || isLoading}
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '8px', opacity: isLoading ? 0.7 : 1 }}
            >
                {isLoading ? t('auth.loggingIn') : t('common.login')}
            </button>
        </form>
    );
}
