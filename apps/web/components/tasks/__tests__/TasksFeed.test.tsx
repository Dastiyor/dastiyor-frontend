import { render, screen, act, fireEvent } from '@testing-library/react';
import TasksFeed from '../TasksFeed';

let search = new URLSearchParams();
jest.mock('next/navigation', () => ({ useSearchParams: () => search }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href }: { children: React.ReactNode; href: string }) => <a href={href}>{children}</a> }));
jest.mock('@/lib/i18n', () => {
    const i18n = { t: (k: string) => k, tr: (v: string) => v, tError: (m: string) => m, locale: 'ru' };
    return { useTranslation: () => i18n };
});

beforeEach(() => {
    search = new URLSearchParams();
    global.fetch = jest.fn(async () => ({ ok: true, json: async () => ({ tasks: [], pagination: { hasMore: false } }) })) as unknown as typeof fetch;
});

describe('TasksFeed empty state', () => {
    it('asks a customer to post the first task in the category they opened', async () => {
        search = new URLSearchParams('category=Дизайн');
        render(<TasksFeed viewerRole="CUSTOMER" />);
        const link = await screen.findByText('tasks.emptyCreateFirst');
        expect(link.closest('a')).toHaveAttribute('href', `/create-task?category=${encodeURIComponent('Дизайн')}`);
        expect(screen.queryByText('tasks.oneOffHint')).toBeNull();
    });

    it('offers a paid provider new-task alerts and says the site is for one-off tasks', async () => {
        render(<TasksFeed viewerRole="PROVIDER" providerHasTaskAlerts />);
        expect((await screen.findByText('tasks.emptyGetNotified')).closest('a')).toHaveAttribute('href', '/provider/profile#task-alerts');
        expect(screen.getByText('tasks.oneOffHint')).toBeInTheDocument();
        expect(screen.queryByText('tasks.emptyCreateFirst')).toBeNull();
    });

    it('gives a guest both ways in', async () => {
        render(<TasksFeed />);
        expect((await screen.findByText('tasks.emptyCreateFirst')).closest('a')).toHaveAttribute('href', '/create-task');
        expect(screen.getByText('tasks.emptyGuestProvider').closest('a')).toHaveAttribute('href', '/register?type=provider');
        expect(screen.getByText('tasks.oneOffHint')).toBeInTheDocument();
    });

    it('sends a FREE provider to the whole feed, and only names the plans that have alerts', async () => {
        search = new URLSearchParams('category=Дизайн');
        render(<TasksFeed viewerRole="PROVIDER" />);
        expect((await screen.findByText('tasks.emptySeeAllTasks')).closest('a')).toHaveAttribute('href', '/tasks');
        expect(screen.getByText('tasks.alertsPaidOnly')).toBeInTheDocument();
        expect(screen.queryByText('tasks.emptyGetNotified')).toBeNull();
    });

    it('has no "see all" for a FREE provider already on the whole feed', async () => {
        render(<TasksFeed viewerRole="PROVIDER" />);
        expect(await screen.findByText('tasks.alertsPaidOnly')).toBeInTheDocument();
        expect(screen.queryByText('tasks.emptySeeAllTasks')).toBeNull();
    });
});

describe('TasksFeed server-rendered first page', () => {
    const task = {
        id: 's1', title: 'Починить кран', category: 'Ремонт', budget: '100 TJS', city: 'Душанбе',
        postedAt: '2026-11-01T10:00:00.000Z', description: '',
    };

    it('shows it without asking the API', () => {
        render(<TasksFeed initial={{ tasks: [task], hasMore: false }} />);
        expect(screen.getByText('Починить кран')).toBeInTheDocument();
        expect(global.fetch).not.toHaveBeenCalled();
    });

    it('asks the API for the second page', async () => {
        render(<TasksFeed initial={{ tasks: [task], hasMore: true }} />);
        await act(async () => { fireEvent.click(screen.getByText('tasks.loadMore')); });
        expect(global.fetch).toHaveBeenCalledWith(expect.stringContaining('page=2&limit=6'), expect.anything());
    });
});
