'use client';
import Link from 'next/link';
import { useState } from 'react';
import { FileText, MessageSquare, Handshake, Search, UserCheck, Wallet } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function HowItWorks() {
    const [activeTab, setActiveTab] = useState<'customer' | 'provider'>('customer');
    const { t } = useTranslation();

    return (
        <section style={{ padding: '100px 0', backgroundColor: '#F9FAFB' }}>
            <div className="container">
                <div style={{ textAlign: 'center', marginBottom: '50px' }}>
                    <span style={{
                        color: 'var(--primary)',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        fontSize: '0.85rem'
                    }}>{t('howItWorks.sectionLabel')}</span>
                    <h2 className="heading-lg" style={{ marginTop: '12px', marginBottom: '40px' }}>{t('howItWorks.title')}</h2>

                    {/* Tabs */}
                    <div style={{
                        display: 'inline-flex',
                        position: 'relative',
                        marginBottom: '40px'
                    }}>
                        <div style={{
                            borderBottom: '2px solid #E5E7EB',
                            position: 'absolute',
                            bottom: 0,
                            left: 0,
                            right: 0,
                            zIndex: 0
                        }}></div>

                        <button
                            onClick={() => setActiveTab('customer')}
                            style={{
                                padding: '16px 32px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'customer' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === 'customer' ? 'var(--text)' : 'var(--text-light)',
                                fontWeight: activeTab === 'customer' ? '700' : '500',
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                position: 'relative',
                                zIndex: 1
                            }}
                        >
                            {t('howItWorks.forCustomers')}
                        </button>
                        <button
                            onClick={() => setActiveTab('provider')}
                            style={{
                                padding: '16px 32px',
                                background: 'transparent',
                                border: 'none',
                                borderBottom: activeTab === 'provider' ? '2px solid var(--primary)' : '2px solid transparent',
                                color: activeTab === 'provider' ? 'var(--text)' : 'var(--text-light)',
                                fontWeight: activeTab === 'provider' ? '700' : '500',
                                fontSize: '1.1rem',
                                cursor: 'pointer',
                                transition: 'all 0.3s',
                                position: 'relative',
                                zIndex: 1
                            }}
                        >
                            {t('howItWorks.forProviders')}
                        </button>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))',
                    gap: '30px',
                    position: 'relative'
                }}>
                    {activeTab === 'customer' ? (
                        customerStepKeys.map((step, index) => (
                            <StepCard key={`customer-${index}`} step={{ title: t(step.titleKey), description: t(step.descKey), icon: step.icon, color: step.color }} index={index} />
                        ))
                    ) : (
                        providerStepKeys.map((step, index) => (
                            <StepCard key={`provider-${index}`} step={{ title: t(step.titleKey), description: t(step.descKey), icon: step.icon, color: step.color }} index={index} />
                        ))
                    )}
                </div>

                <div style={{ textAlign: 'center', marginTop: '50px' }}>
                    <Link
                        href={activeTab === 'customer' ? "/create-task" : "/register"}
                        className="btn btn-primary"
                        style={{ padding: '14px 40px' }}
                    >
                        {activeTab === 'customer' ? t('howItWorks.createTaskFree') : t('howItWorks.becomeProvider')}
                    </Link>
                </div>
            </div>
        </section>
    );
}

function StepCard({ step, index }: { step: any, index: number }) {
    return (
        <div className="glass-panel" style={{
            padding: '40px 30px',
            textAlign: 'center',
            position: 'relative',
            zIndex: 1,
            transition: 'all 0.3s ease',
            border: '1px solid var(--border)',
            backgroundColor: 'white',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
        }}>
            <div style={{
                width: '80px',
                height: '80px',
                borderRadius: '50%',
                background: `linear-gradient(135deg, ${step.color}15 0%, ${step.color}25 100%)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '2.5rem',
                margin: '0 auto 24px',
                color: step.color
            }}>
                {step.icon}
            </div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: '700', marginBottom: '16px' }}>
                {index + 1}. {step.title}
            </h3>
            <p style={{ color: 'var(--text-light)', lineHeight: '1.6', fontSize: '1.05rem' }}>
                {step.description}
            </p>
        </div>
    );
}

const customerStepKeys = [
    { titleKey: 'howItWorks.customerStep1', descKey: 'howItWorks.customerStep1Desc', icon: <FileText size={36} />, color: "var(--primary)" },
    { titleKey: 'howItWorks.customerStep2', descKey: 'howItWorks.customerStep2Desc', icon: <MessageSquare size={36} />, color: "#F59E0B" },
    { titleKey: 'howItWorks.customerStep3', descKey: 'howItWorks.customerStep3Desc', icon: <Handshake size={36} />, color: "#10B981" },
];

const providerStepKeys = [
    { titleKey: 'howItWorks.providerStep1', descKey: 'howItWorks.providerStep1Desc', icon: <UserCheck size={36} />, color: "var(--primary)" },
    { titleKey: 'howItWorks.providerStep2', descKey: 'howItWorks.providerStep2Desc', icon: <Search size={36} />, color: "#F59E0B" },
    { titleKey: 'howItWorks.providerStep3', descKey: 'howItWorks.providerStep3Desc', icon: <Wallet size={36} />, color: "#10B981" },
];
