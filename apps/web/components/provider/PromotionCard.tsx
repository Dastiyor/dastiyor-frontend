'use client';

import { useRef, useState } from 'react';
import { Rocket, Pin } from 'lucide-react';
import type { PromotionStatus } from '@dastiyor/types';
import { useTranslation } from '@/lib/i18n';
import { useHydrated } from '@/lib/useHydrated';

/** Dushanbe wall-clock time; the same digits in both locales, so server and browser agree. */
export function formatDushanbe(iso: string): string {
    return new Date(iso).toLocaleString('ru-RU', {
        timeZone: 'Asia/Dushanbe', day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit',
    });
}

const card: React.CSSProperties = {
    backgroundColor: 'white', padding: '20px', borderRadius: '16px', border: '1px solid var(--border)',
    marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '10px',
};
const button: React.CSSProperties = {
    alignSelf: 'flex-start', padding: '10px 18px', borderRadius: '10px', border: 'none',
    backgroundColor: 'var(--primary)', color: 'white', fontWeight: 600, cursor: 'pointer',
};
const muted: React.CSSProperties = { color: 'var(--text-light)', fontSize: '0.9rem' };

/**
 * Paid-plan promotions on the provider dashboard: credits left this period,
 * a 24-hour promotion, and for BUSINESS a 24-hour pin in one category.
 * Rendered only for a provider with an active plan (status.plan set).
 */
export default function PromotionCard({ initial }: { initial: PromotionStatus }) {
    const { t, tr, tError } = useTranslation();
    const hydrated = useHydrated();
    const [status, setStatus] = useState(initial);
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState<string | null>(null);
    // Uncontrolled: a choice made before hydration must still be the one sent.
    const categoryRef = useRef<HTMLSelectElement>(null);

    async function start(category?: string) {
        setBusy(true);
        setError(null);
        try {
            const res = await fetch('/api/promotions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(category ? { category } : {}),
            });
            const data = await res.json().catch(() => ({}));
            if (!res.ok) {
                const next = typeof data.nextFreeAt === 'string' ? ` ${t('promotions.nextSlot', { date: formatDushanbe(data.nextFreeAt) })}` : '';
                setError(`${tError(data.error) || t('common.somethingWentWrong')}${next}`);
                return;
            }
            setStatus(data.status);
        } catch {
            setError(t('common.somethingWentWrong'));
        } finally {
            setBusy(false);
        }
    }

    const outOfCredits = status.remaining <= 0;
    const disabled = !hydrated || busy || outOfCredits;
    const free = status.pinSlots.filter(s => !s.nextFreeAt);

    return (
        <section style={card} aria-labelledby="promotions-title">
            <h3 id="promotions-title" style={{ fontSize: '1.1rem', fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                <Rocket size={20} color="var(--primary)" aria-hidden /> {t('promotions.title')}
            </h3>
            <p style={muted}>{t('promotions.desc')}</p>
            <div style={{ fontWeight: 600 }}>{t('promotions.credits', { remaining: status.remaining, limit: status.limit })}</div>
            {status.periodEnd && <p style={muted}>{t('promotions.resets', { date: formatDushanbe(status.periodEnd) })}</p>}

            {status.promotion ? (
                <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                    {t('promotions.activeUntil', { date: formatDushanbe(status.promotion.endsAt) })}
                </div>
            ) : (
                <button type="button" style={{ ...button, opacity: disabled ? 0.6 : 1 }} disabled={disabled} onClick={() => start()}>
                    {t('promotions.promote')}
                </button>
            )}

            {status.canPin && (
                <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    <h4 style={{ fontWeight: 700, display: 'flex', gap: 8, alignItems: 'center' }}>
                        <Pin size={18} color="var(--primary)" aria-hidden /> {t('promotions.pinTitle')}
                    </h4>
                    <p style={muted}>{t('promotions.pinDesc')}</p>
                    {status.pin ? (
                        <div style={{ fontWeight: 600, color: 'var(--primary)' }}>
                            {t('promotions.pinnedUntil', { category: tr(status.pin.category ?? ''), date: formatDushanbe(status.pin.endsAt) })}
                        </div>
                    ) : status.pinSlots.length === 0 ? (
                        <p style={muted}>{t('promotions.noCategories')}</p>
                    ) : (
                        <>
                            <label style={{ display: 'flex', flexDirection: 'column', gap: 6, maxWidth: 360 }}>
                                <span style={muted}>{t('promotions.pinCategory')}</span>
                                <select ref={categoryRef} defaultValue={free[0]?.category ?? status.pinSlots[0].category}
                                    style={{ padding: '10px', borderRadius: 10, border: '1px solid var(--border)' }}>
                                    {status.pinSlots.map(s => (
                                        // The value stays the canonical Russian name; only the label is translated.
                                        <option key={s.category} value={s.category} disabled={!!s.nextFreeAt}>
                                            {s.nextFreeAt
                                                ? t('promotions.slotFull', { category: tr(s.category), date: formatDushanbe(s.nextFreeAt) })
                                                : tr(s.category)}
                                        </option>
                                    ))}
                                </select>
                            </label>
                            <button type="button" style={{ ...button, opacity: disabled || !free.length ? 0.6 : 1 }}
                                disabled={disabled || !free.length} onClick={() => start(categoryRef.current?.value)}>
                                {t('promotions.pin')}
                            </button>
                        </>
                    )}
                </div>
            )}

            {error && <p role="alert" style={{ color: '#DC2626', fontSize: '0.9rem' }}>{error}</p>}
        </section>
    );
}
