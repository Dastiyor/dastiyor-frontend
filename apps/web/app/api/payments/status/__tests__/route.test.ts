import { GET } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { cookies } from 'next/headers';

jest.mock('@/lib/auth', () => ({
    verifyJWTWithVersion: jest.fn(), getBearerToken: jest.fn(() => null),
}));

jest.mock('next/headers', () => ({
    cookies: jest.fn(),
}));

jest.mock('@/lib/payments', () => ({
    PLANS: jest.requireActual('@/lib/plans').PLANS,
    normalizePlan: jest.requireActual('@/lib/plans').normalizePlan,
}));
jest.mock('@/lib/payments/complete', () => ({
    reconcileSmartPayPayment: jest.fn(async () => 'PENDING'),
}));
import { reconcileSmartPayPayment } from '@/lib/payments/complete';

const makeRequest = (orderId?: string) =>
    new Request(`http://localhost/api/payments/status${orderId ? `?orderId=${orderId}` : ''}`);

describe('/api/payments/status', () => {
    const mockUserId = 'user-1';

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'valid-token' })),
        });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue({ id: mockUserId });
    });

    it('returns 401 when no token', async () => {
        (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

        const response = await GET(makeRequest('ORDER-001'));
        const data = await response.json();

        expect(response.status).toBe(401);
        expect(data.error).toBe('Unauthorized');
    });

    it('returns 400 when orderId is missing', async () => {
        const response = await GET(makeRequest());
        const data = await response.json();

        expect(response.status).toBe(400);
        expect(data.error).toBe('Не указан orderId');
    });

    it('returns 404 when payment not found', async () => {
        prismaMock.payment.findUnique.mockResolvedValue(null);

        const response = await GET(makeRequest('NONEXISTENT'));
        const data = await response.json();

        expect(response.status).toBe(404);
        expect(data.error).toBe('Платёж не найден');
    });

    it('returns 403 when payment belongs to different user', async () => {
        prismaMock.payment.findUnique.mockResolvedValue({
            id: 'pay-1',
            userId: 'other-user',
            status: 'COMPLETED',
            plan: 'pro',
            amount: 99,
            currency: 'TJS',
        } as any);

        const response = await GET(makeRequest('ORDER-001'));
        const data = await response.json();

        expect(response.status).toBe(403);
        expect(data.error).toBe('Forbidden');
    });

    it('returns payment status with plan name for valid plan', async () => {
        prismaMock.payment.findUnique.mockResolvedValue({
            id: 'pay-1',
            userId: mockUserId,
            status: 'COMPLETED',
            plan: 'pro_plus',
            amount: 199,
            currency: 'TJS',
        } as any);

        const response = await GET(makeRequest('ORDER-001'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('COMPLETED');
        expect(data.planName).toBe('PRO+');
        expect(data.amount).toBe(199);
        expect(data.currency).toBe('TJS');
    });

    it('returns null planName when plan is invalid or missing', async () => {
        prismaMock.payment.findUnique.mockResolvedValue({
            id: 'pay-1',
            userId: mockUserId,
            status: 'PENDING',
            plan: null,
            amount: 99,
            currency: 'TJS',
        } as any);

        const response = await GET(makeRequest('ORDER-001'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.planName).toBeNull();
    });

    it('returns PENDING status correctly', async () => {
        prismaMock.payment.findUnique.mockResolvedValue({
            id: 'pay-1',
            userId: mockUserId,
            status: 'PENDING',
            plan: 'pro',
            amount: 99,
            currency: 'TJS',
        } as any);

        const response = await GET(makeRequest('ORDER-001'));
        const data = await response.json();

        expect(data.status).toBe('PENDING');
    });

    it('returns FAILED status correctly', async () => {
        prismaMock.payment.findUnique.mockResolvedValue({
            id: 'pay-1',
            userId: mockUserId,
            status: 'FAILED',
            plan: 'premium',
            amount: 399,
            currency: 'TJS',
        } as any);

        const response = await GET(makeRequest('ORDER-001'));
        const data = await response.json();

        expect(data.status).toBe('FAILED');
        // An order from before the rename is named as its replacement
        expect(data.planName).toBe('BUSINESS');
    });

    it('returns 500 on database error', async () => {
        prismaMock.payment.findUnique.mockRejectedValue(new Error('DB error'));

        const response = await GET(makeRequest('ORDER-001'));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });

    describe('pending payment and SmartPay', () => {
        const pending = { id: 'pay-1', userId: 'user-1', smartpayOrderId: 'ORDER-001', status: 'PENDING', plan: 'pro', amount: 99, currency: 'TJS', transactionId: null };

        it.each(['COMPLETED', 'FAILED', 'PENDING'])('reports what SmartPay settles a pending payment to: %s', async (outcome) => {
            prismaMock.payment.findUnique.mockResolvedValue(pending as any);
            (reconcileSmartPayPayment as jest.Mock).mockResolvedValue(outcome);

            const data = await (await GET(makeRequest('ORDER-001'))).json();

            expect(data.status).toBe(outcome);
            expect(reconcileSmartPayPayment).toHaveBeenCalledWith(expect.objectContaining({ id: 'pay-1', amount: 99, smartpayOrderId: 'ORDER-001' }));
        });

        it('does not ask SmartPay about a finished payment', async () => {
            prismaMock.payment.findUnique.mockResolvedValue({ ...pending, status: 'COMPLETED' } as any);
            await GET(makeRequest('ORDER-001'));
            expect(reconcileSmartPayPayment).not.toHaveBeenCalled();
        });
    });
});
