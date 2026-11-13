import { render, screen } from '@testing-library/react';
import RecommendedProviders from '../RecommendedProviders';
import { getRecommendedProviders } from '@/lib/recommended-providers';

jest.mock('@/lib/recommended-providers', () => ({ getRecommendedProviders: jest.fn() }));
jest.mock('next/link', () => ({
    __esModule: true,
    default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a>,
}));
jest.mock('@/lib/i18n/server', () => {
    const TJ: Record<string, string> = { 'Худжанд': 'Хуҷанд' };
    return {
        getServerTranslation: async () => ({
            t: (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k),
            tr: (v: string) => TJ[v] ?? v,
            locale: 'tj',
        }),
    };
});

const recommend = getRecommendedProviders as jest.Mock;
const task = { id: 't1', userId: 'c1', category: 'Ремонт', city: 'Душанбе' };
const card = {
    id: 'p1', fullName: 'Ali Karimov', avatar: null, city: 'Худжанд', categories: ['Ремонт'], experienceYears: 5,
    isVerified: true, avgRating: 4.5, reviewCount: 3, completedCount: 9, tier: 'business' as const,
};
const renderBlock = async () => {
    const el = await RecommendedProviders({ task });
    return render(<>{el}</>);
};

describe('RecommendedProviders', () => {
    it('renders a card per provider linking to their profile', async () => {
        recommend.mockResolvedValue([card, { ...card, id: 'p2', fullName: 'Bobo', avatar: '/a.png', city: null, avgRating: null, isVerified: false, tier: null }]);
        await renderBlock();

        expect(recommend).toHaveBeenCalledWith(task);
        expect(screen.getByRole('heading', { name: 'recommended.title' })).toBeInTheDocument();
        expect(screen.getByRole('link', { name: /Ali Karimov/ })).toHaveAttribute('href', '/provider/p1');
        expect(screen.getByRole('link', { name: /Bobo/ })).toHaveAttribute('href', '/provider/p2');
        expect(screen.getByText('Хуҷанд')).toBeInTheDocument();
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.getByText('—')).toBeInTheDocument();
        expect(screen.getByText('TOP')).toBeInTheDocument();
        expect(screen.getAllByText('professionals.reviewsCount:3')).toHaveLength(2);
    });

    it('links to the directory filtered by the canonical category', async () => {
        recommend.mockResolvedValue([card]);
        await renderBlock();
        expect(screen.getByRole('link', { name: 'recommended.viewAll' }))
            .toHaveAttribute('href', `/professionals?category=${encodeURIComponent('Ремонт')}`);
    });

    it('renders nothing when there is no one to recommend', async () => {
        recommend.mockResolvedValue([]);
        const { container } = await renderBlock();
        expect(container).toBeEmptyDOMElement();
    });

    it('renders nothing when the lookup fails', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        recommend.mockRejectedValue(new Error('db down'));
        const { container } = await renderBlock();
        expect(container).toBeEmptyDOMElement();
    });
});
