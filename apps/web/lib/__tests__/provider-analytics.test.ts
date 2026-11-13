/** @jest-environment node */
import { prismaMock } from '../../__tests__/mocks/prisma';
import { canSee, getProviderAnalytics, localDay, rate, startOfLocalDay } from '../provider-analytics';

// 15:00 in Dushanbe.
const NOW = new Date('2026-11-13T10:00:00Z');
const user = { id: 'p1', categories: ['Ремонт'] };

const view = (iso: string, source = 'DIRECT', category: string | null = null, city: string | null = null) =>
    ({ createdAt: new Date(iso), source, category, city });

beforeEach(() => {
    prismaMock.profileView.findFirst.mockResolvedValue({ createdAt: new Date('2026-11-12T20:00:00Z') } as never);
    prismaMock.profileView.findMany.mockResolvedValue([]);
    prismaMock.profileView.count.mockResolvedValue(0);
    prismaMock.response.count.mockResolvedValue(0);
    prismaMock.response.findMany.mockResolvedValue([]);
    prismaMock.user.findMany.mockResolvedValue([]);
});

describe('helpers', () => {
    it('works in Dushanbe days', () => {
        expect(localDay(new Date('2026-11-12T19:30:00Z'))).toBe('2026-11-13');
        expect(startOfLocalDay(NOW).toISOString()).toBe('2026-11-12T19:00:00.000Z');
        expect(startOfLocalDay(NOW, 29).toISOString()).toBe('2026-10-14T19:00:00.000Z');
    });

    it('rate is a one-decimal percentage, null with no base', () => {
        expect(rate(1, 3)).toBe(33.3);
        expect(rate(0, 0)).toBeNull();
    });

    it('gates sections by plan', () => {
        expect(canSee('profile', null)).toBe(false);
        expect(canSee('profile', 'pro')).toBe(false);
        expect(canSee('profile', 'pro_plus')).toBe(true);
        expect(canSee('advanced', 'pro_plus')).toBe(false);
        expect(canSee('responses', 'business')).toBe(true);
    });
});

describe('getProviderAnalytics', () => {
    it('FREE and PRO get no sections, all listed as locked with the plan that unlocks them', async () => {
        for (const plan of [null, 'pro' as const]) {
            const r = await getProviderAnalytics(user, plan, NOW);
            expect(r).toEqual({
                plan: plan ?? 'free',
                viewsTrackedSince: '2026-11-13',
                profile: null, advanced: null, responses: null,
                locked: [
                    { section: 'profile', plan: 'pro_plus' },
                    { section: 'advanced', plan: 'business' },
                    { section: 'responses', plan: 'business' },
                ],
            });
        }
        expect(prismaMock.profileView.findMany).not.toHaveBeenCalled();
        expect(prismaMock.response.findMany).not.toHaveBeenCalled();
    });

    it('tracked-since falls back to today before the first view', async () => {
        prismaMock.profileView.findFirst.mockResolvedValue(null);
        expect((await getProviderAnalytics(user, null, NOW)).viewsTrackedSince).toBe('2026-11-13');
    });

    it('PRO+ gets profile analytics: 7/30-day views, daily series, sources and conversion', async () => {
        prismaMock.profileView.findMany.mockResolvedValue([
            view('2026-11-13T05:00:00Z', 'DIRECTORY'),
            view('2026-11-12T20:00:00Z', 'SEARCH'), // 13th local
            view('2026-11-12T10:00:00Z', 'TASK'),
            view('2026-10-20T10:00:00Z', 'DIRECT'),
            view('2026-10-20T11:00:00Z', 'LEGACY'),
        ] as never);
        prismaMock.response.count.mockResolvedValueOnce(10).mockResolvedValueOnce(3);

        const r = await getProviderAnalytics(user, 'pro_plus', NOW);

        expect(prismaMock.profileView.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { providerId: 'p1', createdAt: { gte: new Date('2026-10-14T19:00:00Z') } },
        }));
        expect(r.profile).toMatchObject({
            views7: 3, views30: 5,
            sources: { directory: 1, search: 1, task: 1, direct: 2 },
            responses: 10, hired: 3, conversion: 30,
        });
        expect(r.profile!.daily).toHaveLength(30);
        expect(r.profile!.daily[0]).toEqual({ date: '2026-10-15', views: 0 });
        expect(r.profile!.daily[29]).toEqual({ date: '2026-11-13', views: 2 });
        expect(r.profile!.daily.find(d => d.date === '2026-10-20')!.views).toBe(2);
        expect(r.advanced).toBeNull();
        expect(r.responses).toBeNull();
        expect(r.locked.map(l => l.section)).toEqual(['advanced', 'responses']);
    });

    it('BUSINESS gets the comparison with peers and the category/city breakdown', async () => {
        prismaMock.profileView.findMany.mockResolvedValue([
            view('2026-11-13T05:00:00Z', 'TASK', 'Ремонт', 'Душанбе'),
            view('2026-11-12T05:00:00Z', 'DIRECTORY', 'Ремонт', null),
            view('2026-11-11T05:00:00Z', 'DIRECTORY', 'Уборка', 'Худжанд'),
            view('2026-11-10T05:00:00Z', 'DIRECTORY', 'Электрик', 'Бохтар'),
        ] as never);
        // all-time responses, hired; then 30-day responses, hired; then peers' responses, hired
        prismaMock.response.count
            .mockResolvedValueOnce(20).mockResolvedValueOnce(5)
            .mockResolvedValueOnce(4).mockResolvedValueOnce(1)
            .mockResolvedValueOnce(30).mockResolvedValueOnce(6);
        prismaMock.user.findMany.mockResolvedValue([{ id: 'a' }, { id: 'b' }, { id: 'c' }] as never);
        prismaMock.profileView.count.mockResolvedValue(10);

        const r = await getProviderAnalytics(user, 'business', NOW);

        expect(prismaMock.user.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: { role: 'PROVIDER', id: { not: 'p1' }, categories: { hasSome: ['Ремонт'] } },
        }));
        expect(r.advanced).toEqual({
            you: { views30: 4, responses30: 4, conversion30: 25 },
            peers: { count: 3, views30: 3.3, responses30: 10, conversion30: 20 },
            byCategory: [{ name: 'Ремонт', views: 2 }, { name: 'Уборка', views: 1 }, { name: 'Электрик', views: 1 }],
            byCity: [{ name: 'Бохтар', views: 1 }, { name: 'Душанбе', views: 1 }, { name: 'Худжанд', views: 1 }],
        });
        expect(r.locked).toEqual([]);
    });

    it('has no peers without categories or when nobody shares them', async () => {
        const none = await getProviderAnalytics({ id: 'p1', categories: [] }, 'business', NOW);
        expect(none.advanced!.peers).toBeNull();
        expect(prismaMock.user.findMany).not.toHaveBeenCalled();

        const alone = await getProviderAnalytics(user, 'business', NOW);
        expect(alone.advanced!.peers).toBeNull();
        expect(alone.advanced!.you.conversion30).toBeNull();
    });

    it('BUSINESS gets response statistics', async () => {
        const resp = (status: string, created: string, category: string, posted: string) =>
            ({ status, createdAt: new Date(created), task: { category, createdAt: new Date(posted) } });
        prismaMock.response.findMany.mockResolvedValue([
            resp('ACCEPTED', '2026-11-10T10:30:00Z', 'Ремонт', '2026-11-10T10:00:00Z'),
            resp('PENDING', '2026-11-01T12:00:00Z', 'Ремонт', '2026-11-01T10:00:00Z'),
            resp('COMPLETED', '2026-10-05T10:00:00Z', 'Уборка', '2026-10-05T09:00:00Z'),
            resp('REJECTED', '2026-01-05T10:00:00Z', 'Уборка', '2026-01-05T10:30:00Z'), // clock skew: counts as 0
        ] as never);

        const r = await getProviderAnalytics(user, 'business', NOW);

        expect(r.responses).toEqual({
            sent: 4, viewed: null, hired: 2, conversion: 50,
            byCategory: [
                { name: 'Ремонт', sent: 2, hired: 1, conversion: 50 },
                { name: 'Уборка', sent: 2, hired: 1, conversion: 50 },
            ],
            avgResponseMinutes: Math.round((30 + 120 + 60 + 0) / 4),
            monthly: [
                { month: '2026-06', sent: 0, hired: 0 },
                { month: '2026-07', sent: 0, hired: 0 },
                { month: '2026-08', sent: 0, hired: 0 },
                { month: '2026-09', sent: 0, hired: 0 },
                { month: '2026-10', sent: 1, hired: 1 },
                { month: '2026-11', sent: 2, hired: 1 },
            ],
        });
    });

    it('response statistics with no responses', async () => {
        const r = await getProviderAnalytics(user, 'business', NOW);
        expect(r.responses).toMatchObject({ sent: 0, hired: 0, conversion: null, avgResponseMinutes: null, byCategory: [] });
    });
});
