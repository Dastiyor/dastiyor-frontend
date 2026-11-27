import Link from 'next/link';
import { headers } from 'next/headers';
import { getServerTranslation } from '@/lib/i18n/server';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/app-stores';
import { detectPlatform } from '@/lib/device';

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

const primaryStoreButton: React.CSSProperties = {
    ...storeButton,
    minWidth: '260px',
    padding: '18px 28px',
    fontSize: '1.1rem',
};

const smallLink: React.CSSProperties = { color: 'var(--primary)', fontWeight: 600 };

/**
 * One store per device, chosen on the server from the User-Agent so the right
 * button is there before hydration. Visitors on Android were picking the App
 * Store button; a phone now sees only its own store, with the other kept as a
 * small link for a wrong guess (an iPad reports itself as a Mac). A computer
 * gets a QR code of this same page, which then picks the store on the phone.
 */
export default async function MobileAppPage() {
    const { t } = await getServerTranslation();
    const platform = detectPlatform((await headers()).get('user-agent'));

    const ios = { href: APP_STORE_URL, label: t('systemPages.mobileAppIos') };
    const android = { href: GOOGLE_PLAY_URL, label: t('systemPages.mobileAppAndroid') };
    const [primary, secondary] = platform === 'ios' ? [ios, android] : [android, ios];

    return (
        <div className="container" style={{ padding: '80px 20px', maxWidth: '600px', textAlign: 'center' }}>
            <div style={{ fontSize: '64px', marginBottom: '24px' }}>📱</div>
            <h1 className="heading-lg" style={{ marginBottom: '16px' }}>{t('systemPages.mobileAppTitle')}</h1>
            <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', lineHeight: '1.7', marginBottom: '32px' }}>
                {t('systemPages.mobileAppDesc')}
            </p>

            {platform === 'desktop' ? (
                <div style={{ marginBottom: '48px' }}>
                    <img
                        src="/mobile-app-qr.svg"
                        alt={t('systemPages.mobileAppScanQr')}
                        width={200}
                        height={200}
                        style={{ display: 'block', margin: '0 auto 12px', background: '#fff', borderRadius: '12px', padding: '8px' }}
                    />
                    <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '24px' }}>
                        {t('systemPages.mobileAppScanQr')}
                    </p>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', justifyContent: 'center' }}>
                        <a href={ios.href} style={storeButton} target="_blank" rel="noopener noreferrer">{ios.label}</a>
                        <a href={android.href} style={storeButton} target="_blank" rel="noopener noreferrer">{android.label}</a>
                    </div>
                </div>
            ) : (
                <div style={{ marginBottom: '48px' }}>
                    <a href={primary.href} style={primaryStoreButton} data-testid="primary-store">{primary.label}</a>
                    <p style={{ color: 'var(--text-light)', fontSize: '0.9rem', marginTop: '16px' }}>
                        {t('systemPages.mobileAppOtherStore')}{' '}
                        <a href={secondary.href} style={smallLink}>{secondary.label}</a>
                    </p>
                </div>
            )}

            <p style={{ color: 'var(--text-light)', fontSize: '0.95rem', marginBottom: '24px' }}>
                {t('systemPages.mobileAppUseWeb')}
            </p>

            <Link href="/tasks" className="btn btn-primary" style={{ padding: '14px 32px', display: 'inline-block' }}>
                {t('systemPages.mobileAppGo')}
            </Link>
        </div>
    );
}
