import { GET } from '../route';

let mockSubscriptionsEnabled = false;
jest.mock('@/lib/features', () => ({
    get SUBSCRIPTIONS_ENABLED() { return mockSubscriptionsEnabled; },
}));
jest.mock('@/lib/categories', () => ({ getCategories: jest.fn(async () => ['Ремонт']) }));

describe('GET /api/config', () => {
    const OLD = process.env.MOBILE_PURCHASE_ENABLED;
    afterEach(() => { process.env.MOBILE_PURCHASE_ENABLED = OLD; });

    it('returns the lists and both flags off by default', async () => {
        mockSubscriptionsEnabled = false;
        delete process.env.MOBILE_PURCHASE_ENABLED;
        const data = await (await GET()).json();
        expect(data.categories).toEqual(['Ремонт']);
        expect(data.subscriptionsEnabled).toBe(false);
        expect(data.mobilePurchaseEnabled).toBe(false);
    });

    it('config exposes both flags when switched on', async () => {
        mockSubscriptionsEnabled = true;
        process.env.MOBILE_PURCHASE_ENABLED = 'true';
        const data = await (await GET()).json();
        expect(data.subscriptionsEnabled).toBe(true);
        expect(data.mobilePurchaseEnabled).toBe(true);
    });
});
