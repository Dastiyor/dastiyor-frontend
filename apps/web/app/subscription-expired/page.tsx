import Link from 'next/link';
import { redirect } from 'next/navigation';
import { Clock, CreditCard, Sparkles, ArrowRight } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';

export default async function SubscriptionExpiredPage() {
    // Subscriptions are temporarily hidden — see lib/features.ts
    if (!SUBSCRIPTIONS_ENABLED) redirect('/');

    const { t } = await getServerTranslation();
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            background: 'linear-gradient(135deg, #FEF3C7 0%, #FDE68A 100%)'
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '600px'
            }}>
                <div style={{
                    width: '120px',
                    height: '120px',
                    backgroundColor: '#FEF3C7',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 32px',
                    border: '4px solid #FCD34D'
                }}>
                    <Clock size={56} color="#D97706" />
                </div>

                <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    marginBottom: '16px',
                    color: '#92400E'
                }}>
                    {t('systemPages.subscriptionExpiredTitle')}
                </h1>

                <p style={{
                    color: '#B45309',
                    fontSize: '1.1rem',
                    marginBottom: '32px',
                    lineHeight: '1.6'
                }}>
                    {t('systemPages.subscriptionExpiredText')}
                </p>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <Link
                        href="/subscription"
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            backgroundColor: '#6366F1',
                            color: 'white',
                            padding: '16px 32px',
                            borderRadius: '12px',
                            fontWeight: '700',
                            fontSize: '1.1rem',
                            textDecoration: 'none',
                            transition: 'background-color 0.2s',
                            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.3)'
                        }}
                    >
                        <CreditCard size={20} />
                        {t('systemPages.renewSubscription')}
                        <ArrowRight size={20} />
                    </Link>
                </div>

                {/* Benefits reminder */}
                <div style={{
                    marginTop: '48px',
                    padding: '32px',
                    backgroundColor: 'white',
                    borderRadius: '20px',
                    border: '1px solid #FCD34D',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '20px' }}>
                        <Sparkles size={24} color="#6366F1" />
                        <h3 style={{ fontWeight: '700', fontSize: '1.2rem', color: '#1F2937' }}>
                            {t('systemPages.subscriptionBenefits')}
                        </h3>
                    </div>

                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                        gap: '16px',
                        textAlign: 'left'
                    }}>
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '12px'
                        }}>
                            <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                                {t('systemPages.subBenefit1Title')}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                                {t('systemPages.subBenefit1Desc')}
                            </div>
                        </div>
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '12px'
                        }}>
                            <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                                {t('systemPages.subBenefit2Title')}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                                {t('systemPages.subBenefit2Desc')}
                            </div>
                        </div>
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '12px'
                        }}>
                            <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                                {t('systemPages.subBenefit3Title')}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                                {t('systemPages.subBenefit3Desc')}
                            </div>
                        </div>
                        <div style={{
                            padding: '16px',
                            backgroundColor: '#F9FAFB',
                            borderRadius: '12px'
                        }}>
                            <div style={{ fontWeight: '600', color: '#1F2937', marginBottom: '4px' }}>
                                {t('systemPages.subBenefit4Title')}
                            </div>
                            <div style={{ fontSize: '0.9rem', color: '#6B7280' }}>
                                {t('systemPages.subBenefit4Desc')}
                            </div>
                        </div>
                    </div>
                </div>

                {/* View tasks anyway */}
                <div style={{ marginTop: '24px' }}>
                    <Link
                        href="/tasks"
                        style={{
                            color: '#92400E',
                            textDecoration: 'underline',
                            fontSize: '0.95rem'
                        }}
                    >
                        {t('systemPages.browseWithoutSub')} →
                    </Link>
                </div>
            </div>
        </div>
    );
}
