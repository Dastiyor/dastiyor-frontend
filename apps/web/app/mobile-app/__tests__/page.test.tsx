import { render, screen } from '@testing-library/react';
import MobileAppPage, { generateMetadata } from '../page';
import { APP_STORE_URL, GOOGLE_PLAY_URL } from '@/lib/app-stores';

jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
jest.mock('@/lib/i18n/server', () => ({
    getServerTranslation: async () => ({ t: (k: string) => k, tr: (v: string) => v, locale: 'ru' }),
}));

describe('/mobile-app', () => {
    it('links to both store listings', async () => {
        render(await MobileAppPage());
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
