import { Wrench, Clock, Mail } from 'lucide-react';
import { getServerTranslation } from '@/lib/i18n/server';

export default async function MaintenancePage() {
    const { t } = await getServerTranslation();
    return (
        <div style={{
            minHeight: '100vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: '40px 20px',
            background: 'linear-gradient(135deg, #EEF2FF 0%, #E0E7FF 100%)'
        }}>
            <div style={{
                textAlign: 'center',
                maxWidth: '550px'
            }}>
                {/* Animated wrench icon */}
                <div style={{
                    width: '140px',
                    height: '140px',
                    backgroundColor: 'white',
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 32px',
                    boxShadow: '0 20px 40px rgba(99, 102, 241, 0.2)',
                    animation: 'pulse 2s infinite'
                }}>
                    <Wrench size={64} color="#6366F1" />
                </div>

                <h1 style={{
                    fontSize: '2.5rem',
                    fontWeight: '800',
                    marginBottom: '16px',
                    color: '#1F2937'
                }}>
                    {t('systemPages.maintenanceTitle')}
                </h1>

                <p style={{
                    color: '#6B7280',
                    fontSize: '1.15rem',
                    marginBottom: '32px',
                    lineHeight: '1.7'
                }}>
                    {t('systemPages.maintenanceText')}
                </p>

                {/* Estimated time */}
                <div style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '12px',
                    backgroundColor: 'white',
                    padding: '16px 28px',
                    borderRadius: '50px',
                    boxShadow: '0 4px 14px rgba(0,0,0,0.05)',
                    marginBottom: '40px'
                }}>
                    <Clock size={24} color="#6366F1" />
                    <div style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: '0.85rem', color: '#6B7280' }}>{t('systemPages.estimatedTime')}</div>
                        <div style={{ fontWeight: '700', color: '#1F2937', fontSize: '1.1rem' }}>~ 30 {t('notifications.minutesAgo', { count: '' }).replace(' ', '')}</div>
                    </div>
                </div>

                {/* Status indicators */}
                <div style={{
                    backgroundColor: 'white',
                    padding: '28px',
                    borderRadius: '20px',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
                    marginBottom: '32px'
                }}>
                    <h3 style={{ fontWeight: '700', marginBottom: '20px', color: '#1F2937' }}>
                        {t('systemPages.systemStatus')}
                    </h3>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <StatusRow label={t('systemPages.website')} status="maintenance" operational={t('systemPages.operational')} maintenanceText={t('systemPages.maintenance')} unavailableText={t('systemPages.unavailable')} />
                        <StatusRow label={t('systemPages.api')} status="maintenance" operational={t('systemPages.operational')} maintenanceText={t('systemPages.maintenance')} unavailableText={t('systemPages.unavailable')} />
                        <StatusRow label={t('systemPages.database')} status="operational" operational={t('systemPages.operational')} maintenanceText={t('systemPages.maintenance')} unavailableText={t('systemPages.unavailable')} />
                        <StatusRow label={t('systemPages.payments')} status="operational" operational={t('systemPages.operational')} maintenanceText={t('systemPages.maintenance')} unavailableText={t('systemPages.unavailable')} />
                    </div>
                </div>

                {/* Contact */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px',
                    color: '#6B7280'
                }}>
                    <Mail size={18} />
                    <span>{t('systemPages.questions')} </span>
                    <a href="mailto:support@dastiyor.tj" style={{ color: '#6366F1', fontWeight: '600' }}>
                        support@dastiyor.tj
                    </a>
                </div>

                {/* CSS for pulse animation */}
                <style>{`
                    @keyframes pulse {
                        0%, 100% { transform: scale(1); }
                        50% { transform: scale(1.05); }
                    }
                `}</style>
            </div>
        </div>
    );
}

function StatusRow({ label, status, operational, maintenanceText, unavailableText }: { label: string; status: 'operational' | 'maintenance' | 'down'; operational: string; maintenanceText: string; unavailableText: string }) {
    const statusConfig = {
        operational: { color: '#10B981', bg: '#D1FAE5', text: operational },
        maintenance: { color: '#F59E0B', bg: '#FEF3C7', text: maintenanceText },
        down: { color: '#EF4444', bg: '#FEE2E2', text: unavailableText }
    };

    const config = statusConfig[status];

    return (
        <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: '12px 16px',
            backgroundColor: '#F9FAFB',
            borderRadius: '10px'
        }}>
            <span style={{ fontWeight: '500', color: '#374151' }}>{label}</span>
            <span style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: '20px',
                backgroundColor: config.bg,
                color: config.color,
                fontWeight: '600',
                fontSize: '0.85rem'
            }}>
                <span style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: config.color
                }} />
                {config.text}
            </span>
        </div>
    );
}
