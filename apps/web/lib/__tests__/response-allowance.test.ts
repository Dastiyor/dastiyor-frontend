import { prismaMock } from '../../__tests__/mocks/prisma';
import { activePlan, canRespond, getResponseAllowance, periodStart } from '../response-allowance';
import { normalizePlan, isValidPlan, PLANS, PLAN_FEATURES, TIER_ORDER } from '../plans';

const at = (iso: string) => new Date(iso);
const DAY = 86400000;

describe('plans', () => {
    it('match the published price list', () => {
        expect(PLANS.pro).toMatchObject({ price: 49, responsesPerMonth: 30, promotionsPerMonth: 1, badge: 'PRO' });
        expect(PLANS.pro_plus).toMatchObject({ price: 99, responsesPerMonth: null, promotionsPerMonth: 2, badge: 'PRO+' });
        expect(PLANS.business).toMatchObject({ price: 199, responsesPerMonth: null, promotionsPerMonth: 5, badge: 'TOP' });
        expect(Object.values(PLANS).every((p) => p.durationDays === 30)).toBe(true);
        expect(TIER_ORDER.every((t) => PLAN_FEATURES[t].length > 0)).toBe(true);
    });

    it('reads old plan ids as their replacements and rejects them at checkout', () => {
        expect(normalizePlan('basic')).toBe('pro');
        expect(normalizePlan('standard')).toBe('pro_plus');
        expect(normalizePlan('premium')).toBe('business');
        expect(normalizePlan('business')).toBe('business');
        expect(normalizePlan('gold')).toBeNull();
        expect(normalizePlan(null)).toBeNull();
        expect(isValidPlan('pro')).toBe(true);
        expect(isValidPlan('premium')).toBe(false);
        expect(isValidPlan(undefined)).toBe(false);
    });
});

describe('periodStart', () => {
    it('FREE: the calendar month in Dushanbe (UTC+5)', () => {
        // 1 Dec 02:00 in Dushanbe is still 30 Nov in UTC
        expect(periodStart(null, at('2026-11-30T21:00:00Z'))).toEqual(at('2026-11-30T19:00:00Z'));
        expect(periodStart(null, at('2026-11-15T12:00:00Z'))).toEqual(at('2026-10-31T19:00:00Z'));
    });

    it('FREE after a paid plan ended this month: counts from the end of the plan', () => {
        const sub = { plan: 'pro', isActive: false, startDate: at('2026-10-20T00:00:00Z'), endDate: at('2026-11-10T00:00:00Z') };
        expect(periodStart(sub, at('2026-11-15T00:00:00Z'))).toEqual(sub.endDate);
    });

    it('FREE after a paid plan ended last month: the calendar month', () => {
        const sub = { plan: 'pro', isActive: true, startDate: at('2026-09-01T00:00:00Z'), endDate: at('2026-10-01T00:00:00Z') };
        expect(periodStart(sub, at('2026-11-15T00:00:00Z'))).toEqual(at('2026-10-31T19:00:00Z'));
    });

    it('paid: 30-day periods from the start, also across a renewal', () => {
        const start = at('2026-09-01T00:00:00Z');
        const sub = { plan: 'pro', isActive: true, startDate: start, endDate: at('2026-12-01T00:00:00Z') };
        expect(periodStart(sub, at('2026-09-20T00:00:00Z'))).toEqual(start);
        expect(periodStart(sub, at('2026-10-05T00:00:00Z'))).toEqual(new Date(start.getTime() + 30 * DAY));
        expect(periodStart(sub, at('2026-11-02T00:00:00Z'))).toEqual(new Date(start.getTime() + 60 * DAY));
    });
});

describe('activePlan', () => {
    const now = at('2026-11-09T00:00:00Z');
    const live = { plan: 'standard', isActive: true, startDate: now, endDate: at('2026-11-20T00:00:00Z') };
    it('is the normalized plan while active and unexpired, else null', () => {
        expect(activePlan(live, now)).toBe('pro_plus');
        expect(activePlan({ ...live, isActive: false }, now)).toBeNull();
        expect(activePlan({ ...live, endDate: now }, now)).toBeNull();
        expect(activePlan({ ...live, plan: 'gold' }, now)).toBeNull();
        expect(activePlan(null, now)).toBeNull();
    });
});

describe('getResponseAllowance', () => {
    it('FREE: 5 a month, counted from the period start', async () => {
        prismaMock.subscription.findUnique.mockResolvedValue(null);
        prismaMock.response.count.mockResolvedValue(3);
        const now = at('2026-11-15T12:00:00Z');

        const a = await getResponseAllowance('u1', now);

        expect(a).toEqual({ plan: null, limit: 5, used: 3, periodStart: at('2026-10-31T19:00:00Z') });
        expect(prismaMock.response.count).toHaveBeenCalledWith({ where: { userId: 'u1', createdAt: { gte: a.periodStart } } });
        expect(canRespond(a)).toBe(true);
        expect(canRespond({ ...a, used: 5 })).toBe(false);
    });

    it('PRO: 30; BUSINESS: unlimited', async () => {
        const now = at('2026-11-15T12:00:00Z');
        const sub = { plan: 'pro', isActive: true, startDate: at('2026-11-01T00:00:00Z'), endDate: at('2026-12-01T00:00:00Z') };
        prismaMock.response.count.mockResolvedValue(30);

        prismaMock.subscription.findUnique.mockResolvedValue(sub as never);
        const pro = await getResponseAllowance('u1', now);
        expect(pro).toMatchObject({ plan: 'pro', limit: 30 });
        expect(canRespond(pro)).toBe(false);

        prismaMock.subscription.findUnique.mockResolvedValue({ ...sub, plan: 'business' } as never);
        const business = await getResponseAllowance('u1', now);
        expect(business).toMatchObject({ plan: 'business', limit: null });
        expect(canRespond(business)).toBe(true);
    });
});
