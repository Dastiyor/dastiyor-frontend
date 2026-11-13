import { render, screen, within } from '@testing-library/react';
import type { ProviderAnalytics } from '@dastiyor/types';
import ProviderAnalyticsPage from '../page';
import { formatMinutes, pct } from '../AnalyticsSections';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { getProviderAnalytics } from '@/lib/provider-analytics';

let mockToken: string | undefined = 'tok';
let mockSubscriptionsEnabled = false;
jest.mock('next/headers', () => ({ cookies: async () => ({ get: () => (mockToken ? { value: mockToken } : undefined) }) }));
jest.mock('next/navigation', () => ({ redirect: jest.fn((to: string) => { throw new Error(`REDIRECT ${to}`); }) }));
jest.mock('next/link', () => ({ __esModule: true, default: ({ children, href, ...rest }: { children: React.ReactNode; href: string }) => <a href={href} {...rest}>{children}</a> }));
jest.mock('@/lib/auth', () => ({ verifyJWT: jest.fn(async (t: string) => (t === 'tok' ? { id: 'p1' } : null)) }));
jest.mock('@/lib/features', () => ({ get SUBSCRIPTIONS_ENABLED() { return mockSubscriptionsEnabled; } }));
jest.mock('@/lib/provider-analytics', () => ({ getProviderAnalytics: jest.fn() }));
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

const daily = Array.from({ length: 30 }, (_, i) => ({ date: `2026-11-${String(i + 1).padStart(2, '0')}`, views: i === 29 ? 4 : i % 3 }));
const FULL: ProviderAnalytics = {
    plan: 'business',
    viewsTrackedSince: '2026-11-13',
    profile: {
        views7: 9, views30: 33, daily,
        sources: { directory: 10, task: 5, search: 3, direct: 15 },
        responses: 12, hired: 3, conversion: 25,
    },
    advanced: {
        you: { views30: 33, responses30: 4, conversion30: 25 },
        peers: { count: 7, views30: 11.5, responses30: 2, conversion30: null },
        byCategory: [{ name: 'Ремонт', views: 3 }],
        byCity: [],
    },
    responses: {
        sent: 12, viewed: null, hired: 3, conversion: 25,
        byCategory: [{ name: 'Ремонт', sent: 12, hired: 3, conversion: 25 }],
        avgResponseMinutes: 95,
        monthly: [{ month: '2026-10', sent: 5, hired: 1 }, { month: '2026-11', sent: 7, hired: 2 }],
    },
    locked: [],
};
const LOCKED: ProviderAnalytics = {
    plan: 'free', viewsTrackedSince: '2026-11-13', profile: null, advanced: null, responses: null,
    locked: [{ section: 'profile', plan: 'pro_plus' }, { section: 'advanced', plan: 'business' }, { section: 'responses', plan: 'business' }],
};

const renderPage = async (data: ProviderAnalytics, range?: string) => {
    (getProviderAnalytics as jest.Mock).mockResolvedValue(data);
    render(await ProviderAnalyticsPage({ searchParams: Promise.resolve(range ? { range } : {}) }));
};

describe('Provider analytics page', () => {
    beforeEach(() => {
        mockToken = 'tok';
        mockSubscriptionsEnabled = false;
        prismaMock.user.findUnique.mockResolvedValue({ id: 'p1', role: 'PROVIDER', categories: [], subscription: null } as never);
    });

    it('redirects without a session or for a customer', async () => {
        mockToken = undefined;
        await expect(ProviderAnalyticsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT /login');
        mockToken = 'tok';
        prismaMock.user.findUnique.mockResolvedValue({ id: 'p1', role: 'CUSTOMER', categories: [], subscription: null } as never);
        await expect(ProviderAnalyticsPage({ searchParams: Promise.resolve({}) })).rejects.toThrow('REDIRECT /access-denied');
    });

    it('says when view counting started and shows the plan', async () => {
        await renderPage(LOCKED);
        expect(screen.getByText('analytics.trackedSince:13.11.2026')).toBeInTheDocument();
        expect(screen.getByText(/analytics.yourPlan:FREE/)).toBeInTheDocument();
    });

    it('FREE sees three locked sections pointing to the app while web checkout is off', async () => {
        await renderPage(LOCKED);
        expect(screen.getByText('analytics.locked.title:PRO+')).toBeInTheDocument();
        expect(screen.getAllByText('analytics.locked.title:BUSINESS')).toHaveLength(2);
        expect(screen.getAllByRole('link', { name: 'analytics.locked.appCta' })[0]).toHaveAttribute('href', '/mobile-app');
        expect(screen.queryByRole('link', { name: 'analytics.locked.cta' })).not.toBeInTheDocument();
    });

    it('links to the plans page when web checkout is on', async () => {
        mockSubscriptionsEnabled = true;
        await renderPage(LOCKED);
        expect(screen.getAllByRole('link', { name: 'analytics.locked.cta' })[0]).toHaveAttribute('href', '/subscription');
    });

    it('BUSINESS sees every section, with categories translated', async () => {
        await renderPage(FULL);
        expect(screen.getByText(/analytics.yourPlan:BUSINESS/)).toBeInTheDocument();
        const profile = screen.getByRole('region', { name: /analytics.profile.title/ });
        expect(within(profile).getByText('33')).toBeInTheDocument();
        expect(within(profile).getByRole('img', { name: 'analytics.profile.chartLabel' }).children).toHaveLength(30);
        expect(within(profile).getByText('25%')).toBeInTheDocument();

        const advanced = screen.getByRole('region', { name: /analytics.advanced.title/ });
        expect(within(advanced).getByText('analytics.advanced.peers:7')).toBeInTheDocument();
        expect(within(advanced).getByText('11.5')).toBeInTheDocument();
        expect(within(advanced).getByText('Таъмир')).toBeInTheDocument();
        expect(within(advanced).getByText('analytics.advanced.breakdownEmpty')).toBeInTheDocument();

        const responses = screen.getByRole('region', { name: /analytics.responses.title/ });
        expect(within(responses).getByText('analytics.responses.viewedNotTracked')).toBeInTheDocument();
        expect(within(responses).getByText('analytics.responses.hours:1,35')).toBeInTheDocument();
        expect(within(responses).getByText('11.2026')).toBeInTheDocument();
        expect(screen.queryByText(/analytics.locked.title/)).not.toBeInTheDocument();
    });

    it('the 7-day range shows a week of bars', async () => {
        await renderPage(FULL, '7');
        expect(screen.getByRole('img', { name: 'analytics.profile.chartLabel' }).children).toHaveLength(7);
        expect(screen.getByRole('link', { name: 'analytics.profile.range7' })).toHaveAttribute('aria-current', 'page');
    });

    it('handles no peers, no views and no responses', async () => {
        await renderPage({
            ...FULL,
            profile: { ...FULL.profile!, daily: daily.map(d => ({ ...d, views: 0 })), sources: { directory: 0, task: 0, search: 0, direct: 0 }, conversion: null },
            advanced: { ...FULL.advanced!, peers: null },
            responses: { ...FULL.responses!, sent: 0, byCategory: [], avgResponseMinutes: null, conversion: null, monthly: [{ month: '2026-11', sent: 0, hired: 0 }] },
        });
        expect(screen.getByText('analytics.advanced.noPeers')).toBeInTheDocument();
        expect(screen.getByText('analytics.responses.empty')).toBeInTheDocument();
    });
});

describe('formatting', () => {
    const t = (k: string, p?: Record<string, string | number>) => (p ? `${k}:${Object.values(p).join(',')}` : k);
    it('formats durations and percentages', () => {
        expect(formatMinutes(45, t)).toBe('analytics.responses.minutes:45');
        expect(formatMinutes(125, t)).toBe('analytics.responses.hours:2,5');
        expect(formatMinutes(1500, t)).toBe('analytics.responses.days:1,1');
        expect(pct(null, t)).toBe('analytics.noValue');
        expect(pct(12.5, t)).toBe('12.5%');
    });
});
