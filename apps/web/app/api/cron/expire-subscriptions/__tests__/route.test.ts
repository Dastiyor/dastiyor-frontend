import { GET } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';

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
