'use client';

import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

/**
 * The profile forms' phone row. The number only changes through SMS
 * (/verify-phone, which saves it as verified), so here it is read-only with a
 * link there; PUT /api/profile refuses any other number.
 */
export default function PhoneField({ phone, returnTo }: { phone: string; returnTo: string }) {
    const { t } = useTranslation();
    return (
        <div>
            <label htmlFor="profile-phone" style={{ display: 'block', marginBottom: '8px', fontWeight: '500', color: '#1E293B' }}>
                {t('profile.phoneLabel')}
            </label>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                <input
                    id="profile-phone"
                    type="tel"
                    value={phone}
                    readOnly
                    placeholder="—"
                    style={{
                        flex: 1,
                        minWidth: 0,
                        padding: '14px 16px',
                        borderRadius: '12px',
                        border: '1px solid #E2E8F0',
                        background: '#F8FAFC',
                        color: '#475569',
                        fontSize: '1rem',
                        outline: 'none',
                    }}
                />
                <Link
                    href={`/verify-phone?redirect=${encodeURIComponent(returnTo)}`}
                    className="btn btn-outline"
                    style={{ whiteSpace: 'nowrap' }}
                >
                    {phone ? t('profile.phoneChange') : t('profile.phoneAdd')}
                </Link>
            </div>
            <p style={{ margin: '6px 0 0', fontSize: '0.85rem', color: '#64748B' }}>{t('profile.phoneChangeHint')}</p>
        </div>
    );
}
