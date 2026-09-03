import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import { Check, Crown, Zap, Star } from 'lucide-react';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function SubscriptionPage() {
    // Subscriptions are temporarily hidden — see lib/features.ts
    if (!SUBSCRIPTIONS_ENABLED) redirect('/provider');

    const { t } = await getServerTranslation();

    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    if (!token) {
        redirect('/login');
    }

    const payload = await verifyJWT(token);
    if (!payload || !payload.id) {
        redirect('/login');
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id as string },
        include: {
            subscription: true
        }
    });

    if (!user || user.role !== 'PROVIDER') {
        redirect('/access-denied');
    }

    const accentColor = 'var(--primary)';

    const daysLeft = user.subscription && user.subscription.isActive
        ? Math.ceil((new Date(user.subscription.endDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))
        : 0;

    const plans = [
        {
            name: t('subscription.basic'),
            price: '99',
            period: 'month',
            features: [
                t('subscription.featureResponses10'),
                t('subscription.featureVisibilityBasic'),
                t('subscription.featureSupportStandard'),
                t('subscription.featureTaskFeedAccess')
            ],
            current: user.subscription?.plan === 'basic'
        },
        {
            name: t('subscription.standard'),
            price: '199',
            period: 'month',
            popular: true,
            features: [
                t('subscription.featureResponses50'),
                t('subscription.featureVisibility3x'),
                t('subscription.featureSupportPriority'),
                t('subscription.featureFeaturedSearch'),
                t('subscription.featureAnalyticsDashboard')
            ],
            current: user.subscription?.plan === 'standard'
        },
        {
            name: t('subscription.premium'),
            price: '399',
            period: 'month',
            features: [
                t('subscription.featureResponsesUnlimited'),
                t('subscription.featureVisibility5x'),
                t('subscription.featureSupport247Premium'),
                t('subscription.featureVisibilityTop'),
                t('subscription.featureAnalyticsFull'),
                t('subscription.featureBadgeVerified')
            ],
            current: user.subscription?.plan === 'premium'
        }
    ];

    return (
        <>
            {/* Page Header */}
            <div style={{ marginBottom: '24px' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '700', color: '#1E293B', marginBottom: '6px' }}>
                    {t('provider.subscriptionPageTitle')}
                </h1>
                <p style={{ color: '#64748B', fontSize: '0.9rem' }}>
                    {t('provider.subscriptionPageDesc')}
                </p>
            </div>

            {/* Current Plan */}
            {user.subscription && user.subscription.isActive && (
                <div style={{
                    backgroundColor: 'white',
                    padding: '20px',
                    borderRadius: '16px',
                    border: '1px solid #E2E8F0',
                    marginBottom: '24px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <div style={{
                            width: '50px',
                            height: '50px',
                            borderRadius: '12px',
                            backgroundColor: accentColor,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <Crown size={24} color="white" />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '4px' }}>{t('provider.currentPlanLabel')}</div>
                            <div style={{ fontSize: '1.25rem', fontWeight: '700', color: '#1E293B' }}>
                                {user.subscription.plan === 'premium' ? t('subscription.premium') :
                                    user.subscription.plan === 'standard' ? t('subscription.standard') : t('subscription.basic')}
                            </div>
                        </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.8rem', color: '#64748B', marginBottom: '4px' }}>{t('provider.timeRemaining')}</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: '700', color: accentColor }}>{daysLeft} {t('provider.days')}</div>
                    </div>
                </div>
            )}

            {/* Plans */}
            <div className="sub-plans-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                {plans.map((plan) => (
                    <div
                        key={plan.name}
                        style={{
                            backgroundColor: 'white',
                            padding: '24px',
                            borderRadius: '16px',
                            border: plan.popular ? `2px solid ${accentColor}` : '1px solid #E2E8F0',
                            position: 'relative'
                        }}
                    >
                        {plan.popular && (
                            <div style={{
                                position: 'absolute',
                                top: '-12px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                backgroundColor: accentColor,
                                color: 'white',
                                padding: '4px 12px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                fontWeight: '600',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}>
                                <Star size={12} fill="white" />
                                {t('provider.mostPopular')}
                            </div>
                        )}

                        <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B', marginBottom: '8px' }}>
                            {plan.name}
                        </h3>

                        <div style={{ marginBottom: '20px' }}>
                            <span style={{ fontSize: '2rem', fontWeight: '700', color: '#1E293B' }}>{plan.price}</span>
                            <span style={{ color: '#64748B', fontSize: '0.9rem' }}> {t('common.somali')}/{t('subscription.monthAbbr')}</span>
                        </div>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '24px' }}>
                            {plan.features.map((feature, index) => (
                                <div key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: '#475569' }}>
                                    <Check size={16} color={accentColor} />
                                    {feature}
                                </div>
                            ))}
                        </div>

                        {plan.current ? (
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#F1F5F9',
                                color: '#64748B',
                                borderRadius: '8px',
                                textAlign: 'center',
                                fontWeight: '600',
                                fontSize: '0.9rem'
                            }}>
                                {t('provider.currentPlanBtn')}
                            </div>
                        ) : (
                            <Link
                                href="/subscription"
                                style={{
                                    display: 'block',
                                    padding: '12px',
                                    backgroundColor: plan.popular ? accentColor : 'white',
                                    color: plan.popular ? 'white' : accentColor,
                                    borderRadius: '8px',
                                    textAlign: 'center',
                                    fontWeight: '600',
                                    fontSize: '0.9rem',
                                    textDecoration: 'none',
                                    border: plan.popular ? 'none' : `1px solid ${accentColor}`
                                }}
                            >
                                {user.subscription?.isActive ? t('provider.switchPlan') : t('provider.getStarted')}
                            </Link>
                        )}
                    </div>
                ))}
            </div>

            {/* Benefits */}
            <div style={{ marginTop: '32px', backgroundColor: 'white', padding: '24px', borderRadius: '16px', border: '1px solid #E2E8F0' }}>
                <h3 style={{ fontSize: '1.1rem', fontWeight: '700', color: '#1E293B', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Zap size={20} color={accentColor} />
                    {t('provider.whyUpgrade')}
                </h3>
                <div className="sub-benefits-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '20px' }}>
                    <div>
                        <div style={{ fontWeight: '600', color: '#1E293B', marginBottom: '4px' }}>{t('provider.moreVisibility')}</div>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5' }}>
                            {t('provider.moreVisibilityDesc')}
                        </p>
                    </div>
                    <div>
                        <div style={{ fontWeight: '600', color: '#1E293B', marginBottom: '4px' }}>{t('provider.moreResponses')}</div>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5' }}>
                            {t('provider.moreResponsesDesc')}
                        </p>
                    </div>
                    <div>
                        <div style={{ fontWeight: '600', color: '#1E293B', marginBottom: '4px' }}>{t('provider.prioritySupport')}</div>
                        <p style={{ fontSize: '0.85rem', color: '#64748B', lineHeight: '1.5' }}>
                            {t('provider.prioritySupportDesc')}
                        </p>
                    </div>
                </div>
            <style>{`
            @media (max-width: 900px) { .sub-plans-grid { grid-template-columns: 1fr !important; } }
            @media (max-width: 640px) { .sub-benefits-grid { grid-template-columns: 1fr !important; } }
        `}</style>
        </div>
        </>
    );
}
