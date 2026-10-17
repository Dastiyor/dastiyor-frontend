/** @jest-environment node */
import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { syncStoreSubscription } from '@/lib/payments/revenuecat';

jest.mock('@/lib/payments/revenuecat', () => ({ syncStoreSubscription: jest.fn() }));
const sync = syncStoreSubscription as jest.Mock;
const env = process.env as Record<string, string | undefined>;

const post = (body: unknown, auth = 'Bearer whsec') => POST(new Request('http://localhost/api/webhooks/revenuecat', {
    method: 'POST', headers: { authorization: auth, 'content-type': 'application/json' }, body: JSON.stringify(body),
}));
const event = (over = {}) => ({ event: { id: 'evt1', type: 'RENEWAL', app_user_id: 'user-1', ...over } });

describe('POST /api/webhooks/revenuecat', () => {
    beforeEach(() => {
        sync.mockReset().mockResolvedValue(undefined);
        env.REVENUECAT_WEBHOOK_AUTH = 'Bearer whsec';
        prismaMock.user.findUnique.mockResolvedValue({ id: 'user-1' } as never);
    });

    it('401 on wrong auth header', async () => {
        expect((await post(event(), 'Bearer nope')).status).toBe(401);
        expect(sync).not.toHaveBeenCalled();
    });

    it('503 when the webhook secret is not configured', async () => {
        delete env.REVENUECAT_WEBHOOK_AUTH;
        expect((await post(event(), '')).status).toBe(503);
    });

    it('syncs the user for any event type', async () => {
        for (const type of ['INITIAL_PURCHASE', 'EXPIRATION', 'SOMETHING_NEW']) {
            expect((await post(event({ type }))).status).toBe(200);
        }
        expect(sync).toHaveBeenCalledTimes(3);
        expect(sync).toHaveBeenCalledWith('user-1');
    });

    it('syncs the destination user of a transfer', async () => {
        await post(event({ type: 'TRANSFER', app_user_id: undefined, transferred_to: ['user-2'], transferred_from: ['user-1'] }));
        expect(sync).toHaveBeenCalledWith('user-2');
        expect(sync).toHaveBeenCalledWith('user-1');
    });

    it('acknowledges anonymous or unknown users without syncing', async () => {
        expect((await post(event({ app_user_id: '$RCAnonymousID:abc' }))).status).toBe(200);
        prismaMock.user.findUnique.mockResolvedValue(null);
        expect((await post(event({ app_user_id: 'ghost' }))).status).toBe(200);
        expect(sync).not.toHaveBeenCalled();
    });

    it('returns 500 when the sync fails so RevenueCat retries', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        sync.mockRejectedValue(new Error('RevenueCat 500'));
        expect((await post(event())).status).toBe(500);
    });
});
