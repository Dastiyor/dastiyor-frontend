/** @jest-environment node */
import { prismaMock } from '../../__tests__/mocks/prisma';
import { getStoreEntitlement, syncStoreSubscription } from '../payments/revenuecat';

const env = process.env as Record<string, string | undefined>;
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;

const DAY = 24 * 60 * 60 * 1000;
const inDays = (n: number) => new Date(Date.now() + n * DAY).toISOString();
const subscriber = (entitlements: Record<string, { expires_date: string | null; grace_period_expires_date?: string | null }>) =>
    Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({ subscriber: { entitlements } }) });

describe('RevenueCat', () => {
    beforeEach(() => {
        fetchMock.mockReset();
        env.REVENUECAT_SECRET_KEY = 'sk_test';
    });

    describe('getStoreEntitlement', () => {
        it('calls the subscriber API with the secret key', async () => {
            fetchMock.mockReturnValue(subscriber({}));
            await getStoreEntitlement('user 1');
            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe('https://api.revenuecat.com/v1/subscribers/user%201');
            expect(init.headers.Authorization).toBe('Bearer sk_test');
        });

        it('picks the highest active entitlement', async () => {
            fetchMock.mockReturnValue(subscriber({
                basic: { expires_date: inDays(3) },
                premium: { expires_date: inDays(20) },
                standard: { expires_date: inDays(10) },
            }));
            const ent = await getStoreEntitlement('u1');
            expect(ent?.plan).toBe('premium');
            expect(ent!.expiresAt.getTime()).toBeGreaterThan(Date.now() + 19 * DAY);
        });

        it('ignores expired entitlements but honours a grace period', async () => {
            fetchMock.mockReturnValue(subscriber({
                premium: { expires_date: inDays(-1) },
                standard: { expires_date: inDays(-1), grace_period_expires_date: inDays(2) },
            }));
            expect((await getStoreEntitlement('u1'))?.plan).toBe('standard');
        });

        it('returns null with no active entitlement, an unknown id or a lifetime grant', async () => {
            fetchMock.mockReturnValue(subscriber({ gold: { expires_date: inDays(5) }, basic: { expires_date: null } }));
            expect(await getStoreEntitlement('u1')).toBeNull();
        });

        it('throws when RevenueCat fails, so the webhook is retried', async () => {
            fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 500 }));
            await expect(getStoreEntitlement('u1')).rejects.toThrow('RevenueCat 500');
        });

        it('returns null when the key is not configured', async () => {
            delete env.REVENUECAT_SECRET_KEY;
            expect(await getStoreEntitlement('u1')).toBeNull();
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });

    describe('syncStoreSubscription', () => {
        it('premium entitlement upserts premium with store expiry', async () => {
            const exp = inDays(30);
            fetchMock.mockReturnValue(subscriber({ premium: { expires_date: exp } }));
            prismaMock.subscription.findUnique.mockResolvedValue(null);

            await syncStoreSubscription('u1');

            expect(prismaMock.subscription.create).toHaveBeenCalledWith({
                data: expect.objectContaining({ userId: 'u1', plan: 'premium', endDate: new Date(exp), isActive: true, source: 'store' }),
            });
        });

        it('store expiry earlier than an existing SmartPay endDate leaves it', async () => {
            fetchMock.mockReturnValue(subscriber({ basic: { expires_date: inDays(5) } }));
            prismaMock.subscription.findUnique.mockResolvedValue({ userId: 'u1', plan: 'premium', isActive: true, endDate: new Date(inDays(20)), source: 'web' } as never);

            await syncStoreSubscription('u1');

            expect(prismaMock.subscription.update).not.toHaveBeenCalled();
            expect(prismaMock.subscription.create).not.toHaveBeenCalled();
        });

        it('a later store expiry takes over the row', async () => {
            const exp = inDays(30);
            fetchMock.mockReturnValue(subscriber({ standard: { expires_date: exp } }));
            prismaMock.subscription.findUnique.mockResolvedValue({ userId: 'u1', plan: 'basic', isActive: true, endDate: new Date(inDays(2)), startDate: new Date(), source: 'web' } as never);

            await syncStoreSubscription('u1');

            expect(prismaMock.subscription.update).toHaveBeenCalledWith({
                where: { userId: 'u1' },
                data: expect.objectContaining({ plan: 'standard', endDate: new Date(exp), isActive: true, source: 'store' }),
            });
        });

        it('a lapsed store subscription is deactivated', async () => {
            fetchMock.mockReturnValue(subscriber({}));
            prismaMock.subscription.findUnique.mockResolvedValue({ userId: 'u1', plan: 'premium', isActive: true, endDate: new Date(inDays(10)), source: 'store' } as never);

            await syncStoreSubscription('u1');

            expect(prismaMock.subscription.update).toHaveBeenCalledWith({ where: { userId: 'u1' }, data: { isActive: false } });
        });

        it('EXPIRATION with no active entitlement does not delete a valid web subscription', async () => {
            fetchMock.mockReturnValue(subscriber({}));
            prismaMock.subscription.findUnique.mockResolvedValue({ userId: 'u1', plan: 'premium', isActive: true, endDate: new Date(inDays(10)), source: 'web' } as never);

            await syncStoreSubscription('u1');

            expect(prismaMock.subscription.update).not.toHaveBeenCalled();
            expect(prismaMock.subscription.delete).not.toHaveBeenCalled();
        });
    });
});
