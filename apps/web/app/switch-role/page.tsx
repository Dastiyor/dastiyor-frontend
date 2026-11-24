'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslation } from '@/lib/i18n';

type Role = 'CUSTOMER' | 'PROVIDER';

interface Preview {
    role: Role;
    target: Role;
    openTasks: number;
    pendingResponses: number;
    blocker: string | null;
}

/**
 * Switch the signed-in account between customer and provider, for people who
 * picked the wrong role at signup. Linked from both profile pages and from the
 * "this looks like an ad" warning on the task form.
 */
export default function SwitchRolePage() {
    const { t, tError } = useTranslation();
    const router = useRouter();
    const [preview, setPreview] = useState<Preview | null>(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        fetch('/api/account/role')
            .then(async (res) => {
                if (res.status === 401) {
                    router.replace('/login?redirect=/switch-role');
                    return;
                }
                const json = await res.json();
                if (!res.ok) throw new Error(tError(json.error) || t('common.somethingWentWrong'));
                setPreview(json);
            })
            .catch((err) => setError(err instanceof Error ? err.message : String(err)));
    }, [router, t, tError]);

    async function handleSwitch() {
        if (!preview || busy) return;
        setBusy(true);
        setError('');
        try {
            const res = await fetch('/api/account/role', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: preview.target }),
            });
            const json = await res.json();
            if (!res.ok) throw new Error(tError(json.error) || t('common.somethingWentWrong'));
            // Full load: the header and layouts read the role from the new cookie.
            window.location.href = preview.target === 'PROVIDER' ? '/provider' : '/customer';
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            setBusy(false);
        }
    }

    const toProvider = preview?.target === 'PROVIDER';
    const backHref = preview?.role === 'PROVIDER' ? '/provider/profile' : '/customer/profile';

    return (
        <main style={{ backgroundColor: 'var(--secondary)', minHeight: 'calc(100vh - 80px)', padding: '40px 16px' }}>
            <div style={{
                maxWidth: '560px', margin: '0 auto', backgroundColor: 'var(--white)', borderRadius: '16px',
                border: '1px solid var(--border)', padding: '32px 24px', boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
            }}>
                <h1 className="heading-lg" style={{ fontSize: '1.75rem', marginBottom: '8px' }}>{t('switchRole.title')}</h1>

                {!preview && !error && <p style={{ color: 'var(--text-light)' }}>{t('common.loading')}</p>}

                {preview && (
                    <>
                        <p style={{ color: 'var(--text-light)', marginBottom: '24px' }}>
                            {t('switchRole.current', {
                                role: preview.role === 'PROVIDER' ? t('profile.roleProvider') : t('profile.roleCustomer'),
                            })}
                        </p>

                        <div style={{
                            border: `2px solid ${toProvider ? 'var(--accent)' : 'var(--primary)'}`,
                            borderRadius: '12px', padding: '20px', marginBottom: '20px',
                        }}>
                            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, margin: '0 0 8px' }}>
                                {toProvider ? t('switchRole.toProviderTitle') : t('switchRole.toCustomerTitle')}
                            </h2>
                            <p style={{ color: 'var(--text-light)', margin: 0 }}>
                                {toProvider ? t('switchRole.toProviderDesc') : t('switchRole.toCustomerDesc')}
                            </p>
                        </div>

                        {!preview.blocker && preview.openTasks > 0 && (
                            <p style={warningStyle}>{t('switchRole.openTasksWarning', { count: String(preview.openTasks) })}</p>
                        )}
                        {!preview.blocker && preview.pendingResponses > 0 && (
                            <p style={warningStyle}>{t('switchRole.pendingResponsesWarning', { count: String(preview.pendingResponses) })}</p>
                        )}
                        {preview.blocker && <p style={errorStyle}>{tError(preview.blocker)}</p>}
                    </>
                )}

                {error && <p style={errorStyle}>{error}</p>}

                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', marginTop: '8px' }}>
                    {preview && !preview.blocker && (
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleSwitch}
                            disabled={busy}
                            style={{ opacity: busy ? 0.7 : 1 }}
                        >
                            {busy ? t('switchRole.switching') : t('switchRole.confirm')}
                        </button>
                    )}
                    <Link href={backHref} className="btn btn-outline">{t('switchRole.back')}</Link>
                </div>
            </div>
        </main>
    );
}

const warningStyle = {
    backgroundColor: '#FFF7ED', color: '#9A3412', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '16px',
} as const;

const errorStyle = {
    backgroundColor: '#ffebee', color: '#c62828', padding: '12px', borderRadius: '8px', fontSize: '0.9rem', marginBottom: '16px',
} as const;
