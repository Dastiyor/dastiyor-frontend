import { GET } from '../route';

let mockSubscriptionsEnabled = false;
jest.mock('@/lib/features', () => ({
    get SUBSCRIPTIONS_ENABLED() { return mockSubscriptionsEnabled; },
}));
let mockSales = true;
jest.mock('@/lib/subscription-sales', () => ({ isSubscriptionSalesEnabled: jest.fn(async () => mockSales) }));
jest.mock('@/lib/categories', () => ({ getCategories: jest.fn(async () => ['Ремонт']) }));
jest.mock('@/lib/company', () => ({
    getCompany: jest.fn(async () => ({ name: 'Dastiyor', email: 'hi@x.tj', phone: '+992 900', supportEmail: 'help@x.tj', address: 'Душанбе' })),
}));

describe('GET /api/config', () => {
    const OLD = process.env.MOBILE_PURCHASE_ENABLED;
    afterEach(() => { process.env.MOBILE_PURCHASE_ENABLED = OLD; mockSales = true; });

    it('turns both flags off when the admin switches sales off', async () => {
        mockSubscriptionsEnabled = true;
        process.env.MOBILE_PURCHASE_ENABLED = 'true';
        mockSales = false;
        const data = await (await GET()).json();
        expect(data.subscriptionsEnabled).toBe(false);
        expect(data.mobilePurchaseEnabled).toBe(false);
    });

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

    it('turns plans on for the app alone, before the website has checkout', async () => {
        mockSubscriptionsEnabled = false;
        process.env.MOBILE_PURCHASE_ENABLED = 'true';
        const data = await (await GET()).json();
        expect(data.subscriptionsEnabled).toBe(true);
        expect(data.mobilePurchaseEnabled).toBe(true);
    });

    it('includes the admin-managed company contacts for the app menu', async () => {
        const data = await (await GET()).json();
        expect(data.company).toEqual({ name: 'Dastiyor', email: 'hi@x.tj', phone: '+992 900', supportEmail: 'help@x.tj', address: 'Душанбе' });
    });
});
