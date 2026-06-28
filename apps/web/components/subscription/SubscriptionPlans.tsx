'use client';
import { toast } from '@/components/ui/Toast';
import { useTranslation } from '@/lib/i18n';

import { useState } from 'react';

type Plan = {
    id: string;
    nameKey: string;
    price: number;
    periodKey: string;
    descriptionKey: string;
    featuresKeys: string[];
    color: string;
    popular?: boolean;
};

const plans: Plan[] = [
    {
        id: 'basic',
        nameKey: 'subscription.planBasicName',
        price: 99,
        periodKey: 'subscription.monthAbbr',
        descriptionKey: 'subscription.planBasicDesc',
        color: 'var(--primary)',
        featuresKeys: [
            'subscription.featureResponses15',
            'subscription.featureVisibilityImproved',
            'subscription.featureBadgeBasic',
            'subscription.featurePriorityStandard',
            'subscription.featureSupportEmail'
        ]
    },
    {
        id: 'standard',
        nameKey: 'subscription.planStandardName',
        price: 199,
        periodKey: 'subscription.monthAbbr',
        descriptionKey: 'subscription.planStandardDesc',
        color: 'var(--accent)',
        popular: true,
        featuresKeys: [
            'subscription.featureResponses50',
            'subscription.featureVisibilityPriority',
            'subscription.featureBadgeVerified',
            'subscription.featurePriorityHigh',
            'subscription.featureAnalyticsBasic',
            'subscription.featureSupportPriority'
        ]
    },
    {
        id: 'premium',
        nameKey: 'subscription.planPremiumName',
        price: 399,
        periodKey: 'subscription.monthAbbr',
        descriptionKey: 'subscription.planPremiumDesc',
        color: '#9333ea',
        featuresKeys: [
            'subscription.featureResponsesUnlimited',
            'subscription.featureVisibilityTop',
            'subscription.featureBadgePremium',
            'subscription.featurePriorityHighest',
            'subscription.featureAnalyticsFull',
            'subscription.featureManagerPersonal',
            'subscription.featureSupport247Phone'
        ]
    }
];

type Props = {
    currentPlan: string | null;
    userId: string;
};

export default function SubscriptionPlans({ currentPlan }: Props) {
    const [loading, setLoading] = useState<string | null>(null);
    const { t } = useTranslation();

    const handleSubscribe = async (planId: string) => {
        setLoading(planId);
        try {
            const res = await fetch('/api/subscription', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ plan: planId })
            });

            const data = await res.json();

            if (res.ok && data.paymentUrl) {
                // Redirect to SmartPay payment page
                toast.success(t('subscription.redirectingToast'));
                window.location.assign(data.paymentUrl);
            } else {
                toast.error(data.error || t('subscription.errorTryAgain'));
                setLoading(null);
            }
        } catch {
            toast.error(t('subscription.errorTryAgain'));
            setLoading(null);
        }
    };

    return (
        <div className="sub-plans-grid" style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '24px'
        }}>
            {plans.map((plan) => (
                <div
                    key={plan.id}
                    style={{
                        backgroundColor: 'white',
                        borderRadius: '24px',
                        padding: '32px',
                        border: plan.popular ? `2px solid ${plan.color}` : '1px solid var(--border)',
                        position: 'relative',
                        transform: plan.popular ? 'scale(1.05)' : 'scale(1)',
                        boxShadow: plan.popular ? '0 20px 40px rgba(0,0,0,0.1)' : '0 4px 12px rgba(0,0,0,0.02)'
                    }}
                >
                    {plan.popular && (
                        <div style={{
                            position: 'absolute',
                            top: '-12px',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: plan.color,
                            color: 'white',
                            padding: '6px 20px',
                            borderRadius: '20px',
                            fontSize: '0.85rem',
                            fontWeight: '600'
                        }}>
                            {t('subscription.bestSeller')}
                        </div>
                    )}

                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <h3 style={{
                            fontSize: '1.5rem',
                            fontWeight: '700',
                            color: plan.color,
                            marginBottom: '8px'
                        }}>
                            {t(plan.nameKey)}
                        </h3>
                        <p style={{ color: 'var(--text-light)', fontSize: '0.95rem' }}>
                            {t(plan.descriptionKey)}
                        </p>
                    </div>

                    <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                        <span style={{ fontSize: '3rem', fontWeight: '800', color: 'var(--text)' }}>
                            {plan.price}
                        </span>
                        <span style={{ fontSize: '1.2rem', color: 'var(--text-light)' }}> с.</span>
                        <div style={{ color: 'var(--text-light)', fontSize: '0.9rem' }}>
                            {t(plan.periodKey)}
                        </div>
                    </div>

                    <ul style={{ listStyle: 'none', padding: 0, marginBottom: '32px' }}>
                        {plan.featuresKeys.map((featureKey, idx) => (
                            <li key={idx} style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '10px 0',
                                borderBottom: idx < plan.featuresKeys.length - 1 ? '1px solid #f3f4f6' : 'none'
                            }}>
                                <span style={{ color: '#22c55e', fontSize: '1.1rem' }}>✓</span>
                                <span style={{ fontSize: '0.95rem', color: 'var(--text)' }}>{t(featureKey)}</span>
                            </li>
                        ))}
                    </ul>

                    {currentPlan === plan.id ? (
                        <button
                            disabled
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                border: '2px solid #22c55e',
                                backgroundColor: '#f0fdf4',
                                color: '#166534',
                                fontWeight: '600',
                                fontSize: '1rem',
                                cursor: 'default'
                            }}
                        >
                            ✓ {t('subscription.currentPlan')}
                        </button>
                    ) : (
                        <button
                            onClick={() => handleSubscribe(plan.id)}
                            disabled={loading !== null}
                            className="btn"
                            style={{
                                width: '100%',
                                padding: '16px',
                                borderRadius: '12px',
                                backgroundColor: plan.popular ? plan.color : 'transparent',
                                color: plan.popular ? 'white' : plan.color,
                                border: `2px solid ${plan.color}`,
                                fontWeight: '600',
                                fontSize: '1rem',
                                cursor: loading ? 'wait' : 'pointer',
                                transition: 'all 0.2s'
                            }}
                        >
                            {loading === plan.id ? t('subscription.redirecting') : t('subscription.pay')}
                        </button>
                    )}
                </div>
            ))}
            <style>{`
                @media (max-width: 900px) { .sub-plans-grid { grid-template-columns: repeat(2, 1fr) !important; } }
                @media (max-width: 480px) { .sub-plans-grid { grid-template-columns: 1fr !important; } }
            `}</style>
        </div>
    );
}
