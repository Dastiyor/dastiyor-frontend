import { render, screen, within } from '@testing-library/react';
import ProviderProfilePage from '../page';
import { getPublicProfile } from '@/lib/professionals';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';

jest.mock('@/lib/professionals', () => ({ getPublicProfile: jest.fn() }));
jest.mock('@/components/reviews/ReviewList', () => ({ __esModule: true, default: () => <div data-testid="reviews" /> }));
jest.mock('next/navigation', () => ({ notFound: jest.fn(() => { throw new Error('NEXT_NOT_FOUND'); }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
jest.mock('@/lib/i18n/server', () => {
    const TJ: Record<string, string> = { 'Ремонт': 'Таъмир', 'Худжанд': 'Хуҷанд' };
    return {
        getServerTranslation: async () => ({
            t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
            tr: (v: string) => TJ[v] ?? v,
            locale: 'tj',
        }),
    };
});

const profile = {
    id: 'p1', fullName: 'Ali', avatar: null, bio: 'Plumber', skills: 'pipes', role: 'PROVIDER', createdAt: new Date('2025-01-01'),
    experienceYears: 5, city: 'Худжанд', categories: ['Ремонт'], isVerified: true,
    completedCount: 7, avgRating: 4.5, reviewCount: 2, ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 1, 5: 1 }, reviews: [],
    portfolio: [{ id: 'pr1', title: 'Kitchen', description: 'Tiles', images: ['https://x.public.blob.vercel-storage.com/a.jpg'], order: 0 }],
    tier: null,
};

const renderPage = async (overrides = {}) => {
    (getPublicProfile as jest.Mock).mockResolvedValue({ ...profile, ...overrides });
    render(await ProviderProfilePage({ params: Promise.resolve({ id: 'p1' }) }));
};

describe('Public provider profile', () => {
    beforeEach(() => {
        prismaMock.task.count.mockResolvedValue(8);
        prismaMock.response.count.mockResolvedValue(12);
    });

    it('404s for a missing user or a customer', async () => {
        (getPublicProfile as jest.Mock).mockResolvedValue(null);
        await expect(ProviderProfilePage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow('NEXT_NOT_FOUND');
        (getPublicProfile as jest.Mock).mockResolvedValue({ ...profile, role: 'CUSTOMER' });
        await expect(ProviderProfilePage({ params: Promise.resolve({ id: 'x' }) })).rejects.toThrow('NEXT_NOT_FOUND');
    });

    it('renders category in Tajik but links with the canonical value', async () => {
        await renderPage();
        const link = screen.getByRole('link', { name: 'Таъмир' });
        expect(link).toHaveAttribute('href', `/professionals?category=${encodeURIComponent('Ремонт')}`);
    });

    it('shows city, experience, verified mark and rating', async () => {
        await renderPage();
        expect(screen.getByText('Хуҷанд')).toBeInTheDocument();
        expect(screen.getByText('reviews_page.experienceMany:5')).toBeInTheDocument();
        expect(screen.getByText('reviews_page.verified')).toBeInTheDocument();
        expect(screen.getByText('4.5')).toBeInTheDocument();
    });

    it('uses the right plural for experience', async () => {
        await renderPage({ experienceYears: 1 });
        expect(screen.getByText('reviews_page.experienceOne:1')).toBeInTheDocument();
    });

    it('hides experience, city and verified when not set', async () => {
        await renderPage({ experienceYears: null, city: null, isVerified: false });
        expect(screen.queryByText(/experience/)).not.toBeInTheDocument();
        expect(screen.queryByText('reviews_page.verified')).not.toBeInTheDocument();
    });

    it('shows the portfolio with titles and photos', async () => {
        await renderPage();
        const section = screen.getByRole('region', { name: 'reviews_page.portfolio' });
        expect(within(section).getByText('Kitchen')).toBeInTheDocument();
        expect(within(section).getByRole('img', { name: 'Kitchen 1' })).toBeInTheDocument();
    });

    it('hides portfolio section when empty', async () => {
        await renderPage({ portfolio: [] });
        expect(screen.queryByRole('region', { name: 'reviews_page.portfolio' })).not.toBeInTheDocument();
    });

    it('shows tier badge only when tier is set', async () => {
        await renderPage();
        expect(screen.queryByText('subscription.premium')).not.toBeInTheDocument();
    });

    it('shows the tier badge for a paid provider', async () => {
        await renderPage({ tier: 'premium' });
        expect(screen.getByText('subscription.premium')).toBeInTheDocument();
    });
});
