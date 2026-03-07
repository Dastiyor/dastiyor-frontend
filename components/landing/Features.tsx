'use client';
import { ShieldCheck, Lock, Headphones, CheckCircle, Shield, Zap } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function Features() {
    const { t } = useTranslation();
    return (
        <section style={{ padding: '100px 0', background: 'var(--white)' }}>
            <div className="container">
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '80px', alignItems: 'center' }}>

                    {/* Left Content */}
                    <div>
                        <span style={{ color: 'var(--primary)', fontWeight: '600' }}>{t('features.sectionLabel')}</span>
                        <h2 className="heading-lg" style={{ margin: '16px 0 24px' }}>
                            {t('features.titleMain')} <br />
                            <span style={{ color: 'var(--primary)' }}>{t('features.titleHighlight')}</span>
                        </h2>
                        <p style={{ color: 'var(--text-light)', fontSize: '1.1rem', marginBottom: '40px' }}>
                            {t('features.subtitle')}
                        </p>

                        <div style={{ display: 'flex', flexDirection: 'column', gap: '30px' }}>
                            {featureKeys.map((feature, index) => (
                                <div key={index} style={{ display: 'flex', gap: '20px' }}>
                                    <div style={{
                                        width: '50px',
                                        height: '50px',
                                        borderRadius: '50%',
                                        background: 'var(--primary-light)',
                                        color: 'var(--primary)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        flexShrink: 0,
                                        lineHeight: 0
                                    }}>
                                        {feature.icon}
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '1.1rem', fontWeight: '700', marginBottom: '8px' }}>{t(feature.titleKey)}</h4>
                                        <p style={{ color: 'var(--text-light)', lineHeight: '1.5' }}>{t(feature.descKey)}</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Right Image/Graphic area */}
                    <div style={{ position: 'relative' }}>
                        <div style={{
                            background: 'linear-gradient(135deg, #F0F9FF 0%, #E0F2FE 100%)',
                            borderRadius: '30px',
                            padding: '40px',
                            position: 'relative',
                            overflow: 'hidden'
                        }}>
                            <div className="glass-panel" style={{
                                padding: '24px',
                                marginBottom: '20px',
                                borderLeft: '4px solid #10B981',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'center'
                            }}>
                                <div style={{ background: '#D1FAE5', padding: '10px', borderRadius: '50%', color: '#10B981', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}><CheckCircle size={24} /></div>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{t('features.verifiedBadge')}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{t('features.verifiedBadgeDesc')}</div>
                                </div>
                            </div>

                            <div className="glass-panel" style={{
                                padding: '24px',
                                marginBottom: '20px',
                                borderLeft: '4px solid #3B82F6',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'center',
                                transform: 'translateX(20px)'
                            }}>
                                <div style={{ background: '#DBEAFE', padding: '10px', borderRadius: '50%', color: '#3B82F6', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}><Shield size={24} /></div>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{t('features.securePaymentsBadge')}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{t('features.securePaymentsBadgeDesc')}</div>
                                </div>
                            </div>

                            <div className="glass-panel" style={{
                                padding: '24px',
                                borderLeft: '4px solid #F59E0B',
                                display: 'flex',
                                gap: '16px',
                                alignItems: 'center'
                            }}>
                                <div style={{ background: '#FEF3C7', padding: '10px', borderRadius: '50%', color: '#F59E0B', display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 0 }}><Zap size={24} /></div>
                                <div>
                                    <div style={{ fontWeight: '600' }}>{t('features.fastResponses')}</div>
                                    <div style={{ fontSize: '0.9rem', color: 'var(--text-light)' }}>{t('features.fastResponsesDesc')}</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}

const featureKeys = [
    { titleKey: 'features.verifiedProviders', descKey: 'features.verifiedProvidersDesc', icon: <ShieldCheck size={28} /> },
    { titleKey: 'features.securePayments', descKey: 'features.securePaymentsDesc', icon: <Lock size={28} /> },
    { titleKey: 'features.support247', descKey: 'features.support247Desc', icon: <Headphones size={28} /> },
];
