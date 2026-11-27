import type { Ref } from 'react';
import { localPhoneDigits } from '@/lib/phone-input';

/** A phone number behind a fixed +992 prefix; `value` is the nine local digits. */
export default function PhoneField({ id, ref, value, onChange }: {
    id: string;
    ref?: Ref<HTMLInputElement>;
    value: string;
    onChange: (digits: string) => void;
}) {
    return (
        <div style={{
            display: 'flex',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            overflow: 'hidden',
        }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '12px 14px',
                backgroundColor: '#f5f7fa',
                borderRight: '1px solid var(--border)',
                whiteSpace: 'nowrap',
                fontSize: '1rem',
                color: '#374151',
                fontWeight: '500',
                userSelect: 'none',
                flexShrink: 0,
            }}>
                🇹🇯 +992
            </div>
            <input
                id={id}
                ref={ref}
                type="tel"
                inputMode="numeric"
                placeholder="XX XXX XXXX"
                required
                minLength={9}
                autoComplete="tel"
                value={value}
                onChange={(e) => onChange(localPhoneDigits(e.target.value))}
                style={{
                    flex: 1,
                    padding: '12px 16px',
                    border: 'none',
                    fontSize: '1rem',
                    outline: 'none',
                    backgroundColor: 'transparent',
                    minWidth: 0,
                }}
            />
        </div>
    );
}
