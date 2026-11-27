'use client';

import { useRef, useState } from 'react';
import OtpInput from '@/components/auth/OtpInput';
import PhoneField from '@/components/auth/PhoneField';
import ResendCodeButton from '@/components/auth/ResendCodeButton';
import { useTranslation } from '@/lib/i18n';
import { useAdoptTypedValue, useHydrated } from '@/lib/useHydrated';
import { localPhoneDigits } from '@/lib/phone-input';
import { goToDashboard } from '@/lib/dashboard-redirect';

/** Phone number, then the SMS code. No password. */
export default function CodeLoginForm({ onError }: { onError: (message: string, code?: string) => void }) {
    const [phone, setPhone] = useState('');
    const [step, setStep] = useState<'phone' | 'code'>('phone');
    const [code, setCode] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const hydrated = useHydrated();
    const phoneRef = useRef<HTMLInputElement>(null);
    useAdoptTypedValue(phoneRef, value => setPhone(localPhoneDigits(value)));
    const { t, tError } = useTranslation();
    const fullPhone = `+992${phone}`;

    /** True when the request succeeded; otherwise the error is already shown. */
    async function post(url: string, body: object): Promise<boolean> {
        onError('');
        try {
            const res = await fetch(url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
            });
            if (res.ok) return true;
            const json = await res.json();
            onError(tError(json.error) || t('common.somethingWentWrong'), json.code);
        } catch {
            onError(t('auth.networkError'));
        }
        return false;
    }

    const sendCode = () => post('/api/auth/verify-send', { phone: fullPhone, type: 'LOGIN' });

    async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
        e.preventDefault();
        if (isLoading) return;
        setIsLoading(true);
        if (step === 'phone') {
            if (await sendCode()) {
                setCode('');
                setStep('code');
            }
        } else if (await post('/api/auth/login/code', { phone: fullPhone, code })) {
            // Stays busy while the dashboard loads.
            await goToDashboard();
            return;
        }
        setIsLoading(false);
    }

    const incomplete = step === 'phone' ? phone.length < 9 : code.length < 6;

    return (
        <form method="post" onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {step === 'phone' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <label htmlFor="login-phone" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.phone')}</label>
                    <PhoneField id="login-phone" ref={phoneRef} value={phone} onChange={setPhone} />
                </div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', margin: 0 }}>
                        {t('auth.verifyPhoneCodeSent', { phone: fullPhone })}
                    </p>
                    <label htmlFor="login-code" style={{ fontWeight: '500', fontSize: '0.9rem' }}>{t('auth.verifyPhoneCodeLabel')}</label>
                    <OtpInput id="login-code" value={code} onChange={setCode} autoFocus />
                </div>
            )}

            <button
                type="submit"
                disabled={!hydrated || isLoading || incomplete}
                className="btn btn-primary"
                style={{ width: '100%', opacity: isLoading || incomplete ? 0.7 : 1 }}
            >
                {step === 'phone'
                    ? t(isLoading ? 'auth.verifyPhoneSending' : 'auth.getCode')
                    : t(isLoading ? 'auth.loggingIn' : 'common.login')}
            </button>

            {step === 'code' && (
                <>
                    <ResendCodeButton onResend={sendCode} disabled={isLoading} />
                    <button
                        type="button"
                        onClick={() => { setStep('phone'); setCode(''); onError(''); }}
                        disabled={isLoading}
                        style={{ background: 'none', border: 'none', color: 'var(--text-light)', fontSize: '0.9rem', cursor: 'pointer' }}
                    >
                        {t('auth.verifyPhoneChangeNumber')}
                    </button>
                </>
            )}
        </form>
    );
}
