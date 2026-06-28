import Link from 'next/link';
import { getServerTranslation } from '@/lib/i18n/server';

export async function generateMetadata() {
    const { t } = await getServerTranslation();
    return {
        title: `${t('systemPages.mobileAppTitle')} | Dastiyor`,
        description: t('systemPages.mobileAppDesc'),
    };
}

export default async function MobileAppPage() {
    const { t } = await getServerTranslation();
    return (
        <div className="container" style={{ padding: '80px 20px', maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📱</div>
            <h1 className="heading-lg" style={{ marginBottom: '16px' }}>{t('systemPages.mobileAppTitle')}</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', lineHeight: '1.7', marginBottom: '40px' }}>
                {t('systemPages.mobileAppDesc')}
            </p>

            <div style={{
                padding: '32px',
                backgroundColor: 'var(--background)',
                borderRadius: '16px',
                border: '1px solid var(--border)',
                marginBottom: '40px'
            }}>
                <p style={{ fontWeight: '600', color: 'var(--text)', marginBottom: '8px' }}>{t('systemPages.mobileAppNotify')}</p>
                <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', lineHeight: '1.6' }}>
                    {t('systemPages.mobileAppNotifyDesc', { email: 'support[at]dastiyor.com' })}
                </p>
            </div>

            <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '24px' }}>
                {t('systemPages.mobileAppUseWeb')}
            </p>

            <Link href="/tasks" className="btn btn-primary" style={{ padding: '14px 32px', display: 'inline-block' }}>
                {t('systemPages.mobileAppGo')}
            </Link>
        </div>
    );
}
