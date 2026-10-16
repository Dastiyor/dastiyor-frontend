import { render, screen } from '@testing-library/react';
import ProfessionalsPage from '../page';
import { searchProfessionals } from '@/lib/professionals';

jest.mock('@/lib/professionals', () => ({
    ...jest.requireActual('@/lib/professionals'),
    searchProfessionals: jest.fn(),
}));
jest.mock('@/lib/categories', () => ({ getCategories: jest.fn(async () => ['Ремонт']) }));
jest.mock('../Filters', () => ({ __esModule: true, default: () => <div data-testid="filters" /> }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a> }));
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

const card = {
    id: 'p1', fullName: 'Ali Karimov', avatar: null, city: 'Худжанд', categories: ['Ремонт'], experienceYears: 5,
    isVerified: true, avgRating: 4.5, reviewCount: 3, completedCount: 9, tier: null,
};
const search = searchProfessionals as jest.Mock;
const renderPage = async (sp: Record<string, string> = {}) =>
    render(await ProfessionalsPage({ searchParams: Promise.resolve(sp) }));

describe('/professionals page', () => {
    beforeEach(() => search.mockResolvedValue({ items: [card], total: 41, page: 1, limit: 20 }));

    it('card links to /provider/id', async () => {
        await renderPage();
        expect(screen.getByRole('link', { name: /Ali Karimov/ })).toHaveAttribute('href', '/provider/p1');
    });

    it('shows the card facts with translated city and categories', async () => {
        await renderPage();
        expect(screen.getByText('Хуҷанд')).toBeInTheDocument();
        expect(screen.getByText('Таъмир')).toBeInTheDocument();
        expect(screen.getByText('4.5')).toBeInTheDocument();
        expect(screen.queryByText('Душанбе')).not.toBeInTheDocument();
    });

    it('shows total', async () => {
        await renderPage();
        expect(screen.getByText('professionals.found:41')).toBeInTheDocument();
    });

    it('passes the parsed query to the search', async () => {
        await renderPage({ category: 'Ремонт', sort: 'reviews', page: '2', limit: '999' });
        expect(search).toHaveBeenCalledWith(expect.objectContaining({ category: 'Ремонт', sort: 'reviews', page: 2, limit: 20 }));
    });

    it('paginates with the filters kept', async () => {
        search.mockResolvedValue({ items: [card], total: 41, page: 2, limit: 20 });
        await renderPage({ category: 'Ремонт', page: '2' });
        expect(screen.getByRole('link', { name: 'professionals.prev' })).toHaveAttribute('href', `/professionals?category=${encodeURIComponent('Ремонт')}`);
        expect(screen.getByRole('link', { name: 'professionals.next' })).toHaveAttribute('href', `/professionals?category=${encodeURIComponent('Ремонт')}&page=3`);
    });

    it('has no next link on the last page', async () => {
        search.mockResolvedValue({ items: [card], total: 41, page: 3, limit: 20 });
        await renderPage({ page: '3' });
        expect(screen.queryByRole('link', { name: 'professionals.next' })).not.toBeInTheDocument();
    });

    it('empty state when nothing matches', async () => {
        search.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
        await renderPage({ q: 'zzz' });
        expect(screen.getByText('professionals.noResults')).toBeInTheDocument();
    });

    it('invites providers to register when there are none at all', async () => {
        search.mockResolvedValue({ items: [], total: 0, page: 1, limit: 20 });
        await renderPage();
        expect(screen.getByRole('link', { name: 'professionals.registerAsProvider' })).toHaveAttribute('href', '/register');
    });
});
