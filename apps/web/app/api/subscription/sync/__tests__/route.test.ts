/** @jest-environment node */
import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { requireAuth } from '@/lib/require-auth';
import { syncStoreSubscription } from '@/lib/payments/revenuecat';

jest.mock('@/lib/require-auth', () => ({ requireAuth: jest.fn() }));
jest.mock('@/lib/payments/revenuecat', () => ({ syncStoreSubscription: jest.fn() }));

const post = () => POST(new Request('http://localhost/api/subscription/sync', { method: 'POST' }));

describe('POST /api/subscription/sync', () => {
    beforeEach(() => {
        (syncStoreSubscription as jest.Mock).mockReset().mockResolvedValue(undefined);
        (requireAuth as jest.Mock).mockResolvedValue({ id: 'user-1' });
    });

    it('sync requires auth', async () => {
        (requireAuth as jest.Mock).mockResolvedValue(null);
        expect((await post()).status).toBe(401);
        expect(syncStoreSubscription).not.toHaveBeenCalled();
    });

    it('syncs and returns the current subscription with its source', async () => {
        const endDate = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
        prismaMock.subscription.findUnique.mockResolvedValue({ plan: 'premium', isActive: true, endDate, source: 'store' } as never);

        const data = await (await post()).json();

        expect(syncStoreSubscription).toHaveBeenCalledWith('user-1');
        expect(data.subscription).toMatchObject({ plan: 'premium', source: 'store', isCurrentlyActive: true, daysRemaining: 3 });
    });

    it('returns null when there is no subscription', async () => {
        prismaMock.subscription.findUnique.mockResolvedValue(null);
        expect((await (await post()).json()).subscription).toBeNull();
    });

    it('returns 502 when RevenueCat cannot be reached', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        (syncStoreSubscription as jest.Mock).mockRejectedValue(new Error('RevenueCat 500'));
        expect((await post()).status).toBe(502);
    });
});
