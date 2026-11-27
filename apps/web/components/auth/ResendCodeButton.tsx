'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n';
import { formatCountdown, useResendCooldown } from '@/lib/useResendCooldown';

/**
 * "Send the code again", shown under an SMS code field. It is disabled for 60
 * seconds after a code goes out ("Отправить код ещё раз через 0:42") and while
 * a resend is in flight, so nobody taps it five times and burns the server's
 * 3-per-15-minutes allowance. `onResend` sends the code, shows its own error,
 * and resolves true when a code went out; only then does the countdown restart.
 */
export default function ResendCodeButton({ onResend, disabled = false }: {
    onResend: () => Promise<boolean>;
    disabled?: boolean;
}) {
    const { t } = useTranslation();
    const { secondsLeft, restart } = useResendCooldown();
    const [sending, setSending] = useState(false);

    const handleClick = async () => {
        if (sending || secondsLeft > 0) return;
        setSending(true);
        try {
            if (await onResend()) restart();
        } finally {
            setSending(false);
        }
    };

    const label = sending
        ? t('auth.resendSending')
        : secondsLeft > 0
            ? t('auth.resendCodeIn', { time: formatCountdown(secondsLeft) })
            : t('auth.resendCode');

    const inactive = disabled || sending || secondsLeft > 0;
    return (
        <button
            type="button"
            onClick={handleClick}
            disabled={inactive}
            style={{
                background: 'none', border: 'none', fontSize: '0.9rem',
                color: inactive ? 'var(--text-light)' : 'var(--primary)',
                cursor: inactive ? 'default' : 'pointer',
                fontVariantNumeric: 'tabular-nums',
            }}
        >
            {label}
        </button>
    );
}
