'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import AuthLayout from '@/components/auth/AuthLayout';
import LanguageSwitcher from '@/components/LanguageSwitcher';
import RoleCards, { type SignupRole } from '@/components/auth/RoleCards';
import { useRouter, useSearchParams } from 'next/navigation';
import { checkPasswordStrength } from '@/lib/validation';
import ResendCodeButton from '@/components/auth/ResendCodeButton';
import OtpInput from '@/components/auth/OtpInput';
import PhoneField from '@/components/auth/PhoneField';
import { localPhoneDigits } from '@/lib/phone-input';
import FieldIcon, { FIELD_ICON_PADDING } from '@/components/auth/FieldIcon';
import { Lock, User } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';
import { useAdoptTypedValue, useHydrated } from '@/lib/useHydrated';

/** Without a role yet, each button leads to the role choice first: the server would default to customer. */
function OAuthButtons({ role }: { role: Role }) {
    const { t } = useTranslation();
    const href = (provider: 'google' | 'apple') =>
        role ? `/api/auth/${provider}?role=${role}` : `/register?via=${provider}`;
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <a
                href={href('google')}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    padding: '11px 16px', borderRadius: '8px', border: '1px solid var(--border)',
                    backgroundColor: '#fff', color: '#374151', fontSize: '0.95rem', fontWeight: '500',
                    textDecoration: 'none',
                }}
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
                href={href('apple')}
                style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px',
                    padding: '11px 16px', borderRadius: '8px', border: '1px solid #000',
                    backgroundColor: '#000', color: '#fff', fontSize: '0.95rem', fontWeight: '500',
                    textDecoration: 'none',
                }}
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

type Role = SignupRole | null;

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
    // A link such as "become a provider" carries the role, and then it is not
    // asked. Otherwise it is the last step: form, SMS code, role.
    const role: Role = typeParam === 'provider' ? 'provider' : typeParam === 'customer' ? 'customer' : null;
    const viaParam = searchParams.get('via');
    // Google / Apple chosen before a role: ask it, then go there.
    const via = !role && (viaParam === 'google' || viaParam === 'apple') ? viaParam : null;
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState('');
    const [password, setPassword] = useState('');
    // An empty field is neither strong nor broken, so it gets no verdict at all.
    const passwordCheck = password ? checkPasswordStrength(password) : null;
    const passwordFeedback = passwordCheck && !passwordCheck.isStrong ? passwordCheck.feedback : [];
    const [showPassword, setShowPassword] = useState(false);
    const [phoneLocal, setPhoneLocal] = useState('');
    const hydrated = useHydrated();
    const phoneRef = useRef<HTMLInputElement>(null);
    const passwordRef = useRef<HTMLInputElement>(null);
    useAdoptTypedValue(phoneRef, value => setPhoneLocal(localPhoneDigits(value)));
    useAdoptTypedValue(passwordRef, setPassword);
    // The form as submitted, held while the SMS code is being entered. The
    // account is only created once the code comes back with it.
    const [pending, setPending] = useState<{ fullName: string; email: string; phone: string } | null>(null);
    const [step, setStep] = useState<'form' | 'code' | 'role'>('form');
    // From verify-check: proof the number passed its code, sent with the role.
    const [ticket, setTicket] = useState<{ phone: string; value: string } | null>(null);
    const [code, setCode] = useState('');
    const router = useRouter();
    const { t, tError } = useTranslation();

    useEffect(() => {
        fetch('/api/auth/me').then(res => {
            if (res.ok) return res.json();
        }).then(data => {
            if (data?.role) {
                router.replace(data.role === 'PROVIDER' ? '/provider' : '/customer');
            }
        }).catch(() => {});
    }, [router]);

    async function sendCode(phone: string) {
        const res = await fetch('/api/auth/verify-send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ phone, type: 'REGISTRATION' }),
        });
        if (!res.ok) {
            const json = await res.json();
            throw new Error(tError(json.error) || t('common.somethingWentWrong'));
        }
    }

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isLoading) return;
        setError('');

        const formData = new FormData(e.currentTarget);
        // passwordFeedback is derived from `password`, so the list under the
        // field is already showing exactly what is missing.
        // The password is optional; one that was typed still has to pass.
        if (passwordCheck && !passwordCheck.isStrong) return;

        const data = {
            fullName: String(formData.get('fullName') ?? ''),
            email: String(formData.get('email') ?? ''),
            phone: `+992${phoneLocal}`,
        };

        // Came back from the role step to fix something: the number is already
        // confirmed, so no second SMS.
        if (!role && ticket?.phone === data.phone) {
            setPending(data);
            setStep('role');
            return;
        }

        setIsLoading(true);
        try {
            await sendCode(data.phone);
            setPending(data);
            setCode('');
            setStep('code');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        } finally {
            setIsLoading(false);
        }
    }

    /** ResendCodeButton disables itself while this runs and for 60 s after it succeeds. */
    async function handleResend(): Promise<boolean> {
        if (!pending) return false;
        setError('');
        try {
            await sendCode(pending.phone);
            return true;
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
            return false;
        }
    }

    async function post(url: string, body: object) {
        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
        return { ok: res.ok, status: res.status, json: await res.json() };
    }

    function signedUp() {
        // Use full page reload to ensure server components refresh
        // This ensures the Header component re-renders with the new auth state
        window.location.href = '/';
    }

    async function handleVerify(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isLoading || !pending) return;
        setError('');
        setIsLoading(true);

        try {
            // With the role known the code creates the account. Without it, check
            // the code now, so a typo is caught here and not after the role.
            const res = role
                ? await post('/api/auth/register', { ...pending, password: password || undefined, role, code })
                : await post('/api/auth/verify-check', { phone: pending.phone, code, type: 'REGISTRATION' });

            if (!res.ok || (!role && !res.json.ticket)) {
                throw new Error(tError(res.json.error) || t('common.somethingWentWrong'));
            }
            if (role) return signedUp();

            setTicket({ phone: pending.phone, value: res.json.ticket });
            setStep('role');
        } catch (err) {
            setError(err instanceof Error ? err.message : String(err));
        }
        setIsLoading(false);
    }

    async function handlePickRole(picked: SignupRole) {
        if (isLoading || !pending || !ticket) return;
        setError('');
        setIsLoading(true);

        try {
            const res = await post('/api/auth/register', {
                ...pending, password: password || undefined, role: picked, ticket: ticket.value,
            });
            if (res.ok) return signedUp();

            setError(tError(res.json.error) || t('common.somethingWentWrong'));
            // The form was turned down (email taken, say): back to it to fix that.
            // A server or rate-limit error keeps the role step, to try again.
            if (res.status === 400) {
                // An expired confirmation needs a new code.
                if (res.json.error === 'Неверный или просроченный код') setTicket(null);
                setStep('form');
            }
        } catch {
            setError(t('auth.networkError'));
        }
        setIsLoading(false);
    }

    // A role link followed from the role step makes the choice itself.
    const view = via ? 'oauth' : step === 'role' && role ? 'form' : step;

    return (
        <AuthLayout
            title={t(role === 'customer' ? 'auth.signUpCustomer' : role === 'provider' ? 'auth.signUpProvider' : 'auth.joinDastiyor')}
            subtitle={t(view === 'role' || view === 'oauth' ? 'auth.chooseRole' : 'auth.createAccountSubtitle')}
        >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '12px', marginBottom: '20px' }}>
                {role || via ? (
                    <Link
                        href="/register"
                        style={{ color: 'var(--text-light)', fontSize: '0.9rem', textDecoration: 'none' }}
                    >
                        {t(via ? 'common.back' : 'auth.changeRole')}
                    </Link>
                ) : <span />}
                <LanguageSwitcher />
            </div>

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

            {view === 'oauth' ? (
                <RoleCards hrefFor={(picked) => `/api/auth/${via}?role=${picked}`} />
            ) : view === 'role' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ margin: 0, textAlign: 'center', color: '#059669', fontWeight: 600 }}>
                        ✓ {t('auth.phoneConfirmedLastStep')}
                    </p>
                    <RoleCards onPick={handlePickRole} disabled={isLoading} />
                    <button
                        type="button"
                        onClick={() => { setStep('form'); setError(''); }}
                        disabled={isLoading}
                        style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        {t('common.back')}
                    </button>
                </div>
            ) : view === 'code' && pending ? (
                <form onSubmit={handleVerify} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
                        {t('auth.verifyPhoneCodeSent', { phone: pending.phone })}
                    </p>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        <label htmlFor="reg-code" style={{ fontWeight: '500', fontSize: '0.9rem' }}>
                            {t('auth.verifyPhoneCodeLabel')}
                        </label>
                        <OtpInput id="reg-code" value={code} onChange={setCode} autoFocus />
                    </div>
                    <button
                        type="submit"
                        disabled={isLoading || code.length < 6}
                        className="btn btn-primary"
                        style={{ width: '100%', opacity: isLoading || code.length < 6 ? 0.7 : 1 }}
                    >
                        {role
                            ? t(isLoading ? 'auth.creatingAccount' : 'auth.createAccount')
                            : t(isLoading ? 'auth.verifyPhoneVerifying' : 'auth.verifyPhoneVerify')}
                    </button>
                    <ResendCodeButton onResend={handleResend} disabled={isLoading} />
                    <button
                        type="button"
                        onClick={() => { setStep('form'); setCode(''); setError(''); }}
                        disabled={isLoading}
                        style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        {t('auth.verifyPhoneChangeNumber')}
                    </button>
                </form>
            ) : (
            <>
            <form method="post" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="reg-fullName" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.fullName')}</label>
                    <div style={{ position: 'relative' }}>
                        <FieldIcon icon={User} />
                        <input
                            id="reg-fullName"
                            name="fullName"
                            type="text"
                            placeholder={t('auth.fullNamePlaceholder')}
                            defaultValue={pending?.fullName}
                            required
                            maxLength={100}
                            style={{
                                width: '100%',
                                boxSizing: 'border-box',
                                padding: '12px 16px',
                                paddingLeft: FIELD_ICON_PADDING,
                                borderRadius: '8px',
                                border: '1px solid var(--border)',
                                fontSize: '1rem',
                                outline: 'none',
                            }}
                        />
                    </div>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="reg-email" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.emailLabel')} <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>({t('auth.optional')})</span></label>
                    <input
                        id="reg-email"
                        name="email"
                        type="email"
                        placeholder={t('auth.emailPlaceholder')}
                        defaultValue={pending?.email}
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
                    <PhoneField id="reg-phone" ref={phoneRef} value={phoneLocal} onChange={setPhoneLocal} />
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="reg-password" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.passwordLabel')} <span style={{ color: 'var(--text-light)', fontWeight: 400 }}>({t('auth.optional')})</span></label>
                    <div style={{ position: 'relative' }}>
                        <FieldIcon icon={Lock} />
                        <input
                            id="reg-password"
                            ref={passwordRef}
                            name="password"
                            type={showPassword ? 'text' : 'password'}
                            placeholder={t('auth.passwordHint')}
                            minLength={8}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            style={{
                                width: '100%',
                                padding: `12px 44px 12px ${FIELD_ICON_PADDING}`,
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
                                <li key={i}>{tError(msg)}</li>
                            ))}
                        </ul>
                    ) : password ? (
                        <span style={{ fontSize: '0.8rem', color: '#059669', fontWeight: '500' }}>
                            ✓ {t('auth.passwordStrong')}
                        </span>
                    ) : null}
                </div>

                <button
                    type="submit"
                    disabled={!hydrated || isLoading}
                    className="btn btn-primary"
                    style={{ width: '100%', marginTop: '8px', opacity: isLoading ? 0.7 : 1 }}
                >
                    {isLoading ? t('auth.verifyPhoneSending') : t('auth.createAccount')}
                </button>
            </form>

            <div style={{ marginTop: '24px' }}>
                <OAuthDivider />
                <div style={{ marginTop: '12px' }}>
                    <OAuthButtons role={role} />
                </div>
            </div>
            </>
            )}

            <div style={{ marginTop: '20px', textAlign: 'center', fontSize: '0.95rem' }}>
                {t('auth.haveAccount')}{' '}
                <Link href="/login" style={{ color: 'var(--primary)', fontWeight: '600' }}>
                    {t('common.login')}
                </Link>
            </div>
        </AuthLayout>
    );
}
