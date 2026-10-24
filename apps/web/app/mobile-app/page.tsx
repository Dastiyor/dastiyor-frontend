import Link from 'next/link';
import { getServerTranslation } from '@/lib/i18n/server';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/app-stores';

// The mobile app's "Share the app" sends people here, so this page is the download page.
const PAGE_URL = 'https://www.dastiyor.com/mobile-app';

export async function generateMetadata() {
    const { t } = await getServerTranslation();
    const title = `${t('systemPages.mobileAppTitle')} | Dastiyor`;
    const description = t('systemPages.mobileAppDesc');
    return {
        title,
        description,
        alternates: { canonical: PAGE_URL },
        // Setting openGraph here replaces the inherited one, image included, so name it again.
        openGraph: { title, description, url: PAGE_URL, siteName: 'Dastiyor', type: 'website', images: ['/opengraph-image'] },
        twitter: { card: 'summary_large_image', title, description, images: ['/opengraph-image'] },
    };
}

const storeButton: React.CSSProperties = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '220px',
    padding: '14px 24px',
    borderRadius: '12px',
    backgroundColor: '#111827',
    color: '#fff',
    fontWeight: 600,
    textDecoration: 'none',
};

export default async function MobileAppPage() {
    const { t } = await getServerTranslation();
    return (
        <div className="container" style={{ padding: '80px 20px', maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📱</div>
            <h1 className="heading-lg" style={{ marginBottom: '16px' }}>{t('systemPages.mobileAppTitle')}</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', lineHeight: '1.7', marginBottom: '32px' }}>
                {t('systemPages.mobileAppDesc')}
            </p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center', marginBottom: '48px' }}>
                <a href={APP_STORE_URL} style={storeButton} target="_blank" rel="noopener noreferrer">
                    {t('systemPages.mobileAppIos')}
                </a>
                <a href={GOOGLE_PLAY_URL} style={storeButton} target="_blank" rel="noopener noreferrer">
                    {t('systemPages.mobileAppAndroid')}
                </a>
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
