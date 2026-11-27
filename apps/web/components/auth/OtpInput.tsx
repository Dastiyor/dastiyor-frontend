'use client';

import { useState } from 'react';

export const OTP_LENGTH = 6;

/**
 * A 6-digit SMS code drawn as six boxes.
 *
 * It is one real <input> laid invisibly over the boxes, not six inputs: the
 * browser's one-time-code autofill (iOS "From Messages", Chrome on Android),
 * pasting a whole code, backspace and screen readers all work on a single
 * field. The boxes only draw what the field holds; the box the next digit
 * goes into is highlighted. `id` stays on the real input, so its <label> and
 * the e2e specs (#reg-code, #vp-code, #fp-code) keep working.
 */
export default function OtpInput({ id, value, onChange, autoFocus }: {
    id: string;
    value: string;
    onChange: (code: string) => void;
    autoFocus?: boolean;
}) {
    const [focused, setFocused] = useState(false);
    const active = Math.min(value.length, OTP_LENGTH - 1);

    return (
        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', gap: '8px' }}>
            {Array.from({ length: OTP_LENGTH }, (_, i) => {
                const isActive = focused && i === active;
                return (
                    <div
                        key={i}
                        aria-hidden="true"
                        style={{
                            width: '44px', height: '48px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            borderRadius: '10px',
                            border: isActive ? '2px solid var(--primary)' : '1px solid var(--border)',
                            backgroundColor: 'var(--white, #fff)',
                            fontSize: '1.25rem', fontWeight: 700, color: 'var(--text)',
                            fontVariantNumeric: 'tabular-nums',
                        }}
                    >
                        {value[i] ?? ''}
                    </div>
                );
            })}
            <input
                id={id}
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                maxLength={OTP_LENGTH}
                required
                autoFocus={autoFocus}
                value={value}
                onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, OTP_LENGTH))}
                onFocus={() => setFocused(true)}
                onBlur={() => setFocused(false)}
                style={{
                    // Covers the boxes so a click anywhere focuses it; its own text is never seen.
                    position: 'absolute', inset: 0, width: '100%', height: '100%',
                    opacity: 0, border: 'none', padding: 0, margin: 0,
                    // 16px stops iOS Safari zooming in on focus.
                    fontSize: '16px', cursor: 'text',
                }}
            />
        </div>
    );
}
