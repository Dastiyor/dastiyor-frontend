import { render, screen } from '@testing-library/react';
import MobileAppPage, { generateMetadata } from '../page';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/app-stores';

let userAgent: string | null = null;
jest.mock('next/headers', () => ({
    headers: async () => ({ get: (name: string) => (name === 'user-agent' ? userAgent : null) }),
}));
jest.mock('@/components/LanguageSwitcher', () => ({ __esModule: true, default: () => <span>language-switcher</span> }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
jest.mock('@/lib/i18n/server', () => ({
    getServerTranslation: async () => ({ t: (k: string) => k, tr: (v: string) => v, locale: 'ru' }),
}));

const ANDROID = 'Mozilla/5.0 (Linux; Android 14; Pixel 7) Mobile Safari/537.36';
const IPHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_1 like Mac OS X) Mobile/15E148';
const DESKTOP = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0 Safari/537.36';

describe('/mobile-app', () => {
    it('gives three reasons with a screenshot each, and a language switch', async () => {
        userAgent = ANDROID;
        render(await MobileAppPage());
        expect(screen.getAllByRole('img').map((img) => img.getAttribute('src')))
            .toEqual(['/app/offers.jpg', '/app/home.jpg', '/app/chat.jpg']);
        expect(screen.getByText('systemPages.mobileAppReason1')).toBeInTheDocument();
        expect(screen.getByText('language-switcher')).toBeInTheDocument();
    });

    it('gives an Android phone one Google Play button, App Store only as a small link', async () => {
        userAgent = ANDROID;
        render(await MobileAppPage());
        expect(screen.getByTestId('primary-store')).toHaveAttribute('href', GOOGLE_PLAY_URL);
        expect(screen.getByText('systemPages.mobileAppIos').closest('a')).toHaveAttribute('href', APP_STORE_URL);
        expect(screen.queryByRole('img', { name: 'systemPages.mobileAppScanQr' })).toBeNull();
    });

    it('gives an iPhone one App Store button', async () => {
        userAgent = IPHONE;
        render(await MobileAppPage());
        expect(screen.getByTestId('primary-store')).toHaveAttribute('href', APP_STORE_URL);
        expect(screen.getByText('systemPages.mobileAppAndroid').closest('a')).toHaveAttribute('href', GOOGLE_PLAY_URL);
    });

    it('shows a computer a QR code and both stores', async () => {
        userAgent = DESKTOP;
        render(await MobileAppPage());
        expect(screen.getByRole('img', { name: 'systemPages.mobileAppScanQr' })).toHaveAttribute('src', '/mobile-app-qr.svg');
        expect(screen.queryByTestId('primary-store')).toBeNull();
        expect(screen.getByText('systemPages.mobileAppIos').closest('a')).toHaveAttribute('href', APP_STORE_URL);
        expect(screen.getByText('systemPages.mobileAppAndroid').closest('a')).toHaveAttribute('href', GOOGLE_PLAY_URL);
    });

    it('previews as itself when shared, not as the home page', async () => {
        const meta = await generateMetadata();
        expect(meta.openGraph.url).toBe('https://www.dastiyor.com/mobile-app');
        expect(meta.openGraph.description).toBe('systemPages.mobileAppDesc');
        expect(meta.openGraph.images).toEqual(['/opengraph-image']);
    });
});
