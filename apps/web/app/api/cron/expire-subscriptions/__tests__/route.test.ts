import { GET } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { sendPushNotification } from '@/lib/web-push';

jest.mock('@/lib/web-push', () => ({ sendPushNotification: jest.fn().mockResolvedValue(undefined) }));

const CRON_SECRET = 'test-cron-secret';

beforeAll(() => {
    process.env.CRON_SECRET = CRON_SECRET;
});

const makeRequest = (authHeader?: string) =>
    new Request('http://localhost/api/cron/expire-subscriptions', {
        headers: authHeader ? { authorization: authHeader } : {},
    });

describe('/api/cron/expire-subscriptions', () => {
    it('returns 401 when authorization header is missing', async () => {
        const response = await GET(makeRequest());
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 401 when secret is wrong', async () => {
        const response = await GET(makeRequest('Bearer wrong-secret'));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    beforeEach(() => {
        // Cleanup queries added in security hardening
        prismaMock.verificationCode.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.passwordReset.deleteMany.mockResolvedValue({ count: 0 });
        prismaMock.subscription.findMany.mockResolvedValue([]);
    });

    it('reminds web subscribers 2-3 days before the end, in their language', async () => {
        prismaMock.subscription.updateMany.mockResolvedValue({ count: 0 });
        prismaMock.notification.create.mockResolvedValue({} as never);
        prismaMock.subscription.findMany.mockResolvedValue([
            { userId: 'u1', plan: 'pro_plus', endDate: new Date('2026-11-12T10:00:00Z'), user: { locale: 'tj' } },
            { userId: 'u2', plan: 'standard', endDate: new Date('2026-11-12T10:00:00Z'), user: { locale: null } },
        ] as never);

        const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
        const data = await response.json();

        expect(data.reminded).toBe(2);
        expect(prismaMock.subscription.findMany).toHaveBeenCalledWith(expect.objectContaining({
            where: expect.objectContaining({ isActive: true, source: 'web' }),
        }));
        expect(prismaMock.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
            userId: 'u1', title: 'Обуна ба зудӣ ба охир мерасад', link: '/subscription',
        }) });
        // An old plan id is named as its replacement
        expect(prismaMock.notification.create).toHaveBeenCalledWith({ data: expect.objectContaining({
            userId: 'u2', message: expect.stringContaining('PRO+'),
        }) });
        expect(sendPushNotification).toHaveBeenCalledTimes(2);
    });

    it('expires active subscriptions past endDate and returns count', async () => {
        prismaMock.subscription.updateMany.mockResolvedValue({ count: 5 });

        const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.expired).toBe(5);
        expect(data.at).toBeDefined();
    });

    it('calls updateMany with correct conditions', async () => {
        prismaMock.subscription.updateMany.mockResolvedValue({ count: 2 });

        await GET(makeRequest(`Bearer ${CRON_SECRET}`));

        expect(prismaMock.subscription.updateMany).toHaveBeenCalledWith(
            expect.objectContaining({
                where: expect.objectContaining({
                    isActive: true,
                    endDate: expect.objectContaining({ lt: expect.any(Date) }),
                }),
                data: { isActive: false },
            })
        );
    });

    it('returns zero when no subscriptions expired', async () => {
        prismaMock.subscription.updateMany.mockResolvedValue({ count: 0 });

        const response = await GET(makeRequest(`Bearer ${CRON_SECRET}`));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.expired).toBe(0);
    });
});
