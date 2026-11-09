'use client';
import { useState } from 'react';
import Link from 'next/link';
import { toast } from '@/components/ui/Toast';
import { useTranslation } from '@/lib/i18n';
import { PLANS, PLAN_FEATURES, PLAN_RULES, TIER_ORDER, type PlanId, type PlanTier } from '@/lib/plans';

const COLOR: Record<PlanTier, string> = {
    free: '#64748B',
    pro: '#2563EB',
    pro_plus: '#7C3AED',
    business: '#B45309',
};
const POPULAR: PlanTier = 'pro_plus';

type Props = {
    /** The active paid plan; null = FREE. */
    currentPlan: PlanId | null;
    /** Signed-out visitors get a sign-in link instead of a pay button. */
    signedIn?: boolean;
};

/** FREE, PRO, PRO+ and BUSINESS side by side, with SmartPay checkout and the general rules. */
export default function SubscriptionPlans({ currentPlan, signedIn = true }: Props) {
    const [loading, setLoading] = useState<string | null>(null);
    const { t, tError } = useTranslation();

    const handleSubscribe = async (planId: PlanId) => {
        setLoading(planId);
        try {
            const res = await fetch('/api/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId }),
            });
            const data = await res.json();
            if (res.ok && data.paymentUrl) {
                toast.success(t('subscription.redirectingToast'));
                window.location.assign(data.paymentUrl);
            } else {
                toast.error(tError(data.error) || t('subscription.errorTryAgain'));
                setLoading(null);
            }
        } catch {
            toast.error(t('subscription.errorTryAgain'));
            setLoading(null);
        }
    };

    const isCurrent = (tier: PlanTier) => signedIn && (tier === 'free' ? currentPlan === null : currentPlan === tier);

    return (
        <>
            <div className="sub-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '20px', alignItems: 'start' }}>
                {TIER_ORDER.map((tier) => {
                    const color = COLOR[tier];
                    const popular = tier === POPULAR;
                    const plan = tier === 'free' ? null : PLANS[tier];
                    return (
                        <div
                            key={tier}
                            data-testid={`plan-${tier}`}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '20px',
                                padding: '28px 22px',
                                border: popular ? `2px solid ${color}` : '1px solid var(--border)',
                                position: 'relative',
                                boxShadow: popular ? '0 20px 40px rgba(0,0,0,0.08)' : '0 4px 12px rgba(0,0,0,0.02)',
                            }}
                        >
                            {popular && (
                                <div style={{
                                    position: 'absolute', top: '-12px', left: '50%', transform: 'translateX(-50%)',
                                    backgroundColor: color, color: 'white', padding: '4px 16px', borderRadius: '20px',
                                    fontSize: '0.8rem', fontWeight: 600, whiteSpace: 'nowrap',
                                }}>
                                    {t('subscription.bestSeller')}
                                </div>
                            )}

                            <h3 style={{ fontSize: '1.35rem', fontWeight: 800, color, marginBottom: '4px', textAlign: 'center' }}>
                                {plan ? plan.name : 'FREE'}
                            </h3>
                            <div style={{ textAlign: 'center', fontSize: '0.8rem', color: 'var(--text-light)', marginBottom: '16px' }}>
                                {plan ? t('plans.badge', { badge: plan.badge }) : t('plans.noBadge')}
                            </div>

                            <div style={{ textAlign: 'center', marginBottom: '20px', fontVariantNumeric: 'tabular-nums' }}>
                                <span style={{ fontSize: '2.4rem', fontWeight: 800, color: 'var(--text)' }}>{plan ? plan.price : 0}</span>
                                <span style={{ fontSize: '1rem', color: 'var(--text-light)' }}> TJS</span>
                                <div style={{ color: 'var(--text-light)', fontSize: '0.85rem' }}>{t('plans.per30Days')}</div>
                            </div>

                            <ul style={{ listStyle: 'none', padding: 0, marginBottom: '24px' }}>
                                {PLAN_FEATURES[tier].map((key) => (
                                    <li key={key} style={{ display: 'flex', alignItems: 'flex-start', gap: '10px', padding: '7px 0', fontSize: '0.9rem', color: 'var(--text)' }}>
                                        <span style={{ color: '#22c55e' }} aria-hidden>✓</span>
                                        <span>{t(`plans.f.${key}`)}</span>
                                    </li>
                                ))}
                            </ul>

                            {isCurrent(tier) ? (
                                <div style={{
                                    padding: '14px', borderRadius: '12px', border: '2px solid #22c55e', backgroundColor: '#f0fdf4',
                                    color: '#166534', fontWeight: 600, textAlign: 'center',
                                }}>
                                    ✓ {t('subscription.currentPlan')}
                                </div>
                            ) : tier === 'free' ? null : !signedIn ? (
                                <Link href="/login?redirect=/subscription" className="btn" style={{
                                    display: 'block', textAlign: 'center', padding: '14px', borderRadius: '12px',
                                    border: `2px solid ${color}`, color: popular ? 'white' : color,
                                    backgroundColor: popular ? color : 'transparent', fontWeight: 600,
                                }}>
                                    {t('plans.signInToSubscribe')}
                                </Link>
                            ) : (
                                <button
                                    onClick={() => handleSubscribe(tier)}
                                    disabled={loading !== null}
                                    className="btn"
                                    style={{
                                        width: '100%', padding: '14px', borderRadius: '12px',
                                        backgroundColor: popular ? color : 'transparent', color: popular ? 'white' : color,
                                        border: `2px solid ${color}`, fontWeight: 600, fontSize: '1rem',
                                        cursor: loading ? 'wait' : 'pointer',
                                    }}
                                >
                                    {loading === tier ? t('subscription.redirecting') : t('subscription.pay')}
                                </button>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ marginTop: '40px', backgroundColor: 'white', borderRadius: '20px', padding: '28px', border: '1px solid var(--border)' }}>
                <h2 style={{ fontSize: '1.15rem', fontWeight: 700, marginBottom: '12px' }}>{t('plans.rulesTitle')}</h2>
                <ul style={{ paddingLeft: '20px', color: 'var(--text-light)', lineHeight: 1.8 }}>
                    {PLAN_RULES.map((key) => <li key={key}>{t(`plans.rules.${key}`)}</li>)}
                </ul>
            </div>

            <style>{`
                @media (max-width: 1024px) { .sub-plans-grid { grid-template-columns: repeat(2, 1fr) !important; } }
                @media (max-width: 560px) { .sub-plans-grid { grid-template-columns: 1fr !important; } }
            `}</style>
        </>
    );
}
