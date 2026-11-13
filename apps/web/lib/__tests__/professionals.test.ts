/** @jest-environment node */
import { prismaMock } from '../../__tests__/mocks/prisma';
import { searchProfessionals, getActiveTier, parseSearchParams } from '../professionals';
import type { Prisma } from '@prisma/client';

let mockSubscriptionsEnabled = false;
jest.mock('@/lib/features', () => ({
    get SUBSCRIPTIONS_ENABLED() { return mockSubscriptionsEnabled; },
}));

type Sql = Prisma.Sql;
const rowsCall = () => prismaMock.$queryRaw.mock.calls[0][0] as unknown as Sql;
const countCall = () => prismaMock.$queryRaw.mock.calls[1][0] as unknown as Sql;
const flat = (sql: Sql) => sql.sql.replace(/\s+/g, ' ');

const row = {
    id: 'u1', fullName: 'Ali', avatar: null, city: 'Душанбе', categories: ['Ремонт'], experienceYears: 5,
    isVerified: true, avgRating: 4.5, reviewCount: 2, completedCount: 7, tier: 'premium',
};

describe('searchProfessionals', () => {
    beforeEach(() => {
        mockSubscriptionsEnabled = false;
        prismaMock.$queryRaw.mockResolvedValueOnce([row] as never).mockResolvedValueOnce([{ total: 41 }] as never);
    });

    it('returns items, total, page and limit', async () => {
        const res = await searchProfessionals({ page: 3, limit: 20 });

        expect(res).toEqual({ items: [{ ...row, tier: null, promotedUntil: null, pinned: false }], total: 41, page: 3, limit: 20 });
        expect(rowsCall().values).toEqual(expect.arrayContaining([20, 40]));
    });

    it('only searches providers', async () => {
        await searchProfessionals({});
        expect(flat(rowsCall())).toContain(`u.role = 'PROVIDER'`);
        expect(flat(countCall())).toContain(`u.role = 'PROVIDER'`);
    });

    it('escapes LIKE wildcards in q', async () => {
        await searchProfessionals({ q: '50%_\\x' });

        expect(rowsCall().values).toContain('%50\\%\\_\\\\x%');
        expect(flat(rowsCall())).toContain(`ILIKE`);
        expect(flat(rowsCall())).toContain(`ESCAPE '\\'`);
    });

    it('searches name, skills and bio', async () => {
        await searchProfessionals({ q: 'plumb' });
        const sql = flat(rowsCall());
        expect(sql).toMatch(/u\."fullName" ILIKE/);
        expect(sql).toMatch(/u\.skills ILIKE/);
        expect(sql).toMatch(/u\.bio ILIKE/);
    });

    it('passes category and city through as parameters', async () => {
        await searchProfessionals({ category: 'Ремонт', city: 'Худжанд' });

        expect(flat(rowsCall())).toMatch(/= ANY\(u\.categories\)/);
        expect(rowsCall().values).toEqual(expect.arrayContaining(['Ремонт', 'Худжанд']));
        expect(countCall().values).toEqual(expect.arrayContaining(['Ремонт', 'Худжанд']));
    });

    it('unrated providers sort after rated under rating', async () => {
        await searchProfessionals({ sort: 'rating' });
        expect(flat(rowsCall())).toMatch(/ORDER BY .*"avgRating" DESC NULLS LAST/);
    });

    it.each([
        ['reviews', '"reviewCount" DESC'],
        ['completed', '"completedCount" DESC'],
        ['newest', 'u."createdAt" DESC'],
    ] as const)('sorts by %s', async (sort, clause) => {
        await searchProfessionals({ sort });
        expect(flat(rowsCall())).toContain(`ORDER BY ${clause}`);
    });

    it('counts only visible reviews', async () => {
        await searchProfessionals({});
        expect(flat(rowsCall())).toMatch(/FROM "Review" WHERE hidden = false/);
    });

    it('expired subscription does not count', async () => {
        await searchProfessionals({});
        expect(flat(rowsCall())).toMatch(/s\."isActive" AND s\."endDate" > now\(\)/);
    });

    it('tier ranks first only when subscriptions are enabled', async () => {
        await searchProfessionals({ sort: 'reviews' });
        expect(flat(rowsCall())).toContain('ORDER BY "reviewCount" DESC');

        prismaMock.$queryRaw.mockReset();
        prismaMock.$queryRaw.mockResolvedValueOnce([row] as never).mockResolvedValueOnce([{ total: 1 }] as never);
        mockSubscriptionsEnabled = true;

        const res = await searchProfessionals({ sort: 'reviews' });
        expect(flat(rowsCall())).toContain('ORDER BY pinned DESC, promoted DESC, tier_rank DESC, "reviewCount" DESC');
        // stored under an old id, served as its replacement
        expect(res.items[0].tier).toBe('business');
    });

    it('promotion and pin columns come from subqueries, so a provider is never listed twice', async () => {
        await searchProfessionals({});
        const sql = flat(rowsCall());
        expect(sql).not.toMatch(/JOIN "ProfilePromotion"/);
        expect(sql).toMatch(/SELECT MAX\(pp\."endsAt"\) FROM "ProfilePromotion" pp WHERE pp\."userId" = u\.id AND pp\.category IS NULL AND pp\."endsAt" > now\(\)\) AS "promotedUntil"/);
        // no category searched: nobody is pinned
        expect(sql).toContain('false AS pinned');
    });

    it('pinned means pinned in the searched category', async () => {
        await searchProfessionals({ category: 'Ремонт' });
        expect(flat(rowsCall())).toMatch(/EXISTS \(SELECT 1 FROM "ProfilePromotion" pp WHERE pp\."userId" = u\.id AND pp\.category = \? AND pp\."endsAt" > now\(\)\) AS pinned/);
        expect(rowsCall().values.filter(v => v === 'Ремонт')).toHaveLength(2);
    });

    it('serves promotedUntil and pinned only while plans are live', async () => {
        const until = new Date('2026-11-21T10:00:00Z');
        const promotedRow = { ...row, promotedUntil: until, promoted: true, pinned: true, tier_rank: 3 };

        prismaMock.$queryRaw.mockReset();
        prismaMock.$queryRaw.mockResolvedValueOnce([promotedRow] as never).mockResolvedValueOnce([{ total: 1 }] as never);
        let res = await searchProfessionals({ category: 'Ремонт' });
        expect(res.items[0]).toMatchObject({ promotedUntil: null, pinned: false });
        expect(res.items[0]).not.toHaveProperty('promoted');
        expect(res.items[0]).not.toHaveProperty('tier_rank');

        mockSubscriptionsEnabled = true;
        prismaMock.$queryRaw.mockReset();
        prismaMock.$queryRaw.mockResolvedValueOnce([promotedRow] as never).mockResolvedValueOnce([{ total: 1 }] as never);
        res = await searchProfessionals({ category: 'Ремонт' });
        expect(res.items[0]).toMatchObject({ promotedUntil: '2026-11-21T10:00:00.000Z', pinned: true });
    });
});

describe('parseSearchParams', () => {
    const parse = (qs: string) => parseSearchParams(new URLSearchParams(qs));

    it('defaults', () => {
        expect(parse('')).toEqual({ q: undefined, category: undefined, city: undefined, sort: 'rating', page: 1, limit: 20 });
    });

    it('clamps limit to 50 and page to at least 1', () => {
        expect(parse('limit=500&page=-3')).toMatchObject({ limit: 50, page: 1 });
        expect(parse('limit=abc&page=2')).toMatchObject({ limit: 20, page: 2 });
    });

    it('defaults a bad sort to rating', () => {
        expect(parse('sort=hacker').sort).toBe('rating');
        expect(parse('sort=newest').sort).toBe('newest');
    });

    it('trims q and drops empty values, caps q at 100 characters', () => {
        expect(parse('q=%20%20&category=&city=')).toMatchObject({ q: undefined, category: undefined, city: undefined });
        expect(parse(`q=${'a'.repeat(150)}`).q).toHaveLength(100);
    });
});

describe('getActiveTier', () => {
    it('is null when subscriptions are disabled', async () => {
        mockSubscriptionsEnabled = false;
        expect(await getActiveTier('u1')).toBeNull();
        expect(prismaMock.subscription.findFirst).not.toHaveBeenCalled();
    });

    it('shows the plan when plans are live in the app only', async () => {
        mockSubscriptionsEnabled = false;
        process.env.MOBILE_PURCHASE_ENABLED = 'true';
        prismaMock.subscription.findFirst.mockResolvedValue({ plan: 'pro' } as never);

        expect(await getActiveTier('u1')).toBe('pro');
        delete process.env.MOBILE_PURCHASE_ENABLED;
    });

    it('returns the plan of an active, unexpired subscription', async () => {
        mockSubscriptionsEnabled = true;
        prismaMock.subscription.findFirst.mockResolvedValue({ plan: 'pro_plus' } as never);

        expect(await getActiveTier('u1')).toBe('pro_plus');
        expect(prismaMock.subscription.findFirst).toHaveBeenCalledWith({
            where: { userId: 'u1', isActive: true, endDate: { gt: expect.any(Date) } },
            select: { plan: true },
        });
    });

    it('is null for an unknown plan string', async () => {
        mockSubscriptionsEnabled = true;
        prismaMock.subscription.findFirst.mockResolvedValue({ plan: 'gold' } as never);
        expect(await getActiveTier('u1')).toBeNull();
    });
});
