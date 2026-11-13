/** @jest-environment node */
import { prismaMock } from '../../__tests__/mocks/prisma';
import { getPromotionStatus, pinnableCategories, startPromotion, PROMOTION_ERRORS, PROMOTION_MS } from '../promotions';

jest.mock('@/lib/categories', () => ({ getCategories: jest.fn(async () => ['Ремонт', 'Уборка', 'Доставка']) }));

const at = (iso: string) => new Date(iso);
const NOW = at('2026-11-20T12:00:00Z');
const DAY = 86400000;
// Started 2026-10-01: the current 30-day period runs 10-31 .. 11-30.
const sub = (plan: string, extra: object = {}) => ({
    plan, isActive: true, startDate: at('2026-10-01T00:00:00Z'), endDate: at('2027-01-01T00:00:00Z'), ...extra,
});
const row = (category: string | null, endsAt: string, id = 'p1') =>
    ({ id, userId: 'u1', category, createdAt: new Date(at(endsAt).getTime() - PROMOTION_MS), endsAt: at(endsAt) });

const subFind = prismaMock.subscription.findUnique as jest.Mock;
const groupBy = prismaMock.profilePromotion.groupBy as unknown as jest.Mock;

describe('getPromotionStatus', () => {
    it('FREE: nothing to spend', async () => {
        subFind.mockResolvedValue(null);
        const s = await getPromotionStatus('u1', { now: NOW });
        expect(s).toMatchObject({ plan: null, limit: 0, remaining: 0, promotion: null, pin: null, canPin: false, pinSlots: [] });
        expect(prismaMock.profilePromotion.count).not.toHaveBeenCalled();
    });

    it('expired plan counts as FREE', async () => {
        subFind.mockResolvedValue(sub('pro', { endDate: at('2026-11-01T00:00:00Z') }));
        expect((await getPromotionStatus('u1', { now: NOW })).plan).toBeNull();
    });

    it('PRO: credits from the current 30-day period, running promotion, no pins', async () => {
        subFind.mockResolvedValue(sub('basic'));
        prismaMock.profilePromotion.count.mockResolvedValue(1);
        prismaMock.profilePromotion.findMany.mockResolvedValue([row(null, '2026-11-21T10:00:00Z')]);

        const s = await getPromotionStatus('u1', { categories: ['Ремонт'], now: NOW });

        expect(s).toMatchObject({
            plan: 'pro', limit: 1, used: 1, remaining: 0, canPin: false, pinSlots: [], pin: null,
            periodStart: '2026-10-31T00:00:00.000Z', periodEnd: '2026-11-30T00:00:00.000Z',
            promotion: { id: 'p1', category: null, endsAt: '2026-11-21T10:00:00.000Z' },
        });
        expect(prismaMock.profilePromotion.count).toHaveBeenCalledWith({ where: { userId: 'u1', createdAt: { gte: at('2026-10-31T00:00:00Z') } } });
        expect(groupBy).not.toHaveBeenCalled();
    });

    it('period end is capped by the plan end', async () => {
        subFind.mockResolvedValue(sub('pro_plus', { endDate: at('2026-11-25T00:00:00Z') }));
        prismaMock.profilePromotion.count.mockResolvedValue(0);
        prismaMock.profilePromotion.findMany.mockResolvedValue([]);
        const s = await getPromotionStatus('u1', { now: NOW });
        expect(s).toMatchObject({ limit: 2, remaining: 2, periodEnd: '2026-11-25T00:00:00.000Z' });
    });

    it('BUSINESS: pin and slot availability per category', async () => {
        subFind.mockResolvedValue(sub('business'));
        prismaMock.profilePromotion.count.mockResolvedValue(7);
        prismaMock.profilePromotion.findMany.mockResolvedValue([row('Уборка', '2026-11-21T08:00:00Z', 'pin1')]);
        groupBy.mockResolvedValue([
            { category: 'Ремонт', _count: { _all: 3 }, _min: { endsAt: at('2026-11-20T18:00:00Z') } },
            { category: 'Уборка', _count: { _all: 1 }, _min: { endsAt: at('2026-11-21T08:00:00Z') } },
        ]);

        const s = await getPromotionStatus('u1', { categories: ['Ремонт', 'Уборка', 'Доставка'], now: NOW });

        expect(s).toMatchObject({ plan: 'business', limit: 5, remaining: 0, canPin: true, promotion: null, pin: { id: 'pin1', category: 'Уборка' } });
        expect(s.pinSlots).toEqual([
            { category: 'Ремонт', taken: 3, nextFreeAt: '2026-11-20T18:00:00.000Z' },
            { category: 'Уборка', taken: 1, nextFreeAt: null },
            { category: 'Доставка', taken: 0, nextFreeAt: null },
        ]);
    });

    it('BUSINESS with no profile categories skips the slot query', async () => {
        subFind.mockResolvedValue(sub('business'));
        prismaMock.profilePromotion.count.mockResolvedValue(0);
        prismaMock.profilePromotion.findMany.mockResolvedValue([]);
        expect((await getPromotionStatus('u1')).pinSlots).toEqual([]);
        expect(groupBy).not.toHaveBeenCalled();
    });
});

describe('pinnableCategories', () => {
    it('drops categories the admin has removed', async () => {
        expect(await pinnableCategories(['Ремонт', 'Старое', 'Доставка'])).toEqual(['Ремонт', 'Доставка']);
    });
});

describe('startPromotion', () => {
    beforeEach(() => {
        prismaMock.$transaction.mockImplementation(((fn: (tx: typeof prismaMock) => unknown) => fn(prismaMock)) as never);
        prismaMock.$executeRaw.mockResolvedValue(1 as never);
        subFind.mockResolvedValue(sub('business'));
        prismaMock.profilePromotion.findFirst.mockResolvedValue(null);
        prismaMock.profilePromotion.count.mockResolvedValue(0);
        groupBy.mockResolvedValue([]);
        prismaMock.profilePromotion.create.mockImplementation((async ({ data }: { data: object }) => ({ id: 'new', ...data })) as never);
    });

    it('starts a 24-hour promotion under a per-provider lock', async () => {
        const res = await startPromotion('u1', null, NOW);

        expect(res).toEqual({ ok: true, promotion: { id: 'new', category: null, startsAt: NOW.toISOString(), endsAt: new Date(NOW.getTime() + DAY).toISOString() } });
        expect(prismaMock.$executeRaw).toHaveBeenCalledTimes(1);
        expect((prismaMock.$executeRaw.mock.calls[0] as unknown[]).slice(1)).toEqual(['promotion:user:u1']);
        expect(prismaMock.profilePromotion.findFirst).toHaveBeenCalledWith({ where: { userId: 'u1', endsAt: { gt: NOW }, category: null } });
    });

    it('pins under a second, per-category lock', async () => {
        groupBy.mockResolvedValue([{ category: 'Ремонт', _count: { _all: 2 }, _min: { endsAt: NOW } }]);
        const res = await startPromotion('u1', 'Ремонт', NOW);

        expect(res).toMatchObject({ ok: true, promotion: { category: 'Ремонт' } });
        expect((prismaMock.$executeRaw.mock.calls[1] as unknown[]).slice(1)).toEqual(['promotion:pin:Ремонт']);
        expect(prismaMock.profilePromotion.findFirst).toHaveBeenCalledWith({ where: { userId: 'u1', endsAt: { gt: NOW }, category: { not: null } } });
    });

    it('refuses without a paid plan', async () => {
        subFind.mockResolvedValue(null);
        expect(await startPromotion('u1', null, NOW)).toEqual({ ok: false, status: 403, error: PROMOTION_ERRORS.planRequired, code: 'PROMOTION_PLAN_REQUIRED' });
    });

    it('refuses a pin below BUSINESS', async () => {
        subFind.mockResolvedValue(sub('pro_plus'));
        expect(await startPromotion('u1', 'Ремонт', NOW)).toMatchObject({ ok: false, status: 403, error: PROMOTION_ERRORS.businessOnly });
    });

    it('refuses a second promotion or pin while one runs', async () => {
        prismaMock.profilePromotion.findFirst.mockResolvedValue(row(null, '2026-11-21T00:00:00Z') as never);
        expect(await startPromotion('u1', null, NOW)).toMatchObject({ status: 409, error: PROMOTION_ERRORS.promotionActive, code: 'PROMOTION_ACTIVE' });
        expect(await startPromotion('u1', 'Ремонт', NOW)).toMatchObject({ status: 409, error: PROMOTION_ERRORS.pinActive, code: 'PIN_ACTIVE' });
        expect(prismaMock.profilePromotion.create).not.toHaveBeenCalled();
    });

    it('refuses when this period\'s credits are spent, counting from the period start', async () => {
        subFind.mockResolvedValue(sub('pro'));
        prismaMock.profilePromotion.count.mockResolvedValue(1);
        expect(await startPromotion('u1', null, NOW)).toMatchObject({ status: 409, error: PROMOTION_ERRORS.noCredits, code: 'PROMOTION_CREDITS_EXHAUSTED' });
        expect(prismaMock.profilePromotion.count).toHaveBeenCalledWith({ where: { userId: 'u1', createdAt: { gte: at('2026-10-31T00:00:00Z') } } });
    });

    it('refuses the fourth pin in a category and says when a slot frees up', async () => {
        groupBy.mockResolvedValue([{ category: 'Ремонт', _count: { _all: 3 }, _min: { endsAt: at('2026-11-20T18:00:00Z') } }]);
        expect(await startPromotion('u1', 'Ремонт', NOW)).toEqual({
            ok: false, status: 409, error: PROMOTION_ERRORS.slotsFull, code: 'PIN_SLOTS_FULL', nextFreeAt: '2026-11-20T18:00:00.000Z',
        });
        expect(prismaMock.profilePromotion.create).not.toHaveBeenCalled();
    });
});
