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
    sameAmount: jest.requireActual('@/lib/payments/alif').sameAmount,
    isAlifConfigured: jest.fn(() => true),
    checkAlifTransaction: jest.fn(async () => null),
    completePayment: jest.fn(async () => true),
    failPayment: jest.fn(async () => undefined),
}));
import { isAlifConfigured, checkAlifTransaction, completePayment, failPayment } from '@/lib/payments';

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

    describe('pending payment and Alif', () => {
        const pending = { id: 'pay-1', userId: 'user-1', orderId: 'ORDER-001', status: 'PENDING', plan: 'pro', amount: 49, currency: 'TJS' };
        const txn = (status: string, amount = 49) => ({ orderId: 'ORDER-001', transactionId: '26136', status, amount });

        beforeEach(() => {
            (isAlifConfigured as jest.Mock).mockReturnValue(true);
            prismaMock.payment.findUnique.mockResolvedValue(pending as any);
        });

        it('completes a payment Alif reports ok, for the right amount', async () => {
            (checkAlifTransaction as jest.Mock).mockResolvedValue(txn('ok'));

            const data = await (await GET(makeRequest('ORDER-001'))).json();

            expect(data.status).toBe('COMPLETED');
            expect(checkAlifTransaction).toHaveBeenCalledWith('ORDER-001');
            expect(completePayment).toHaveBeenCalledWith('pay-1', { transactionId: '26136' });
        });

        it('does not complete an ok transaction for a different amount', async () => {
            (checkAlifTransaction as jest.Mock).mockResolvedValue(txn('ok', 50));

            const data = await (await GET(makeRequest('ORDER-001'))).json();

            expect(data.status).toBe('PENDING');
            expect(completePayment).not.toHaveBeenCalled();
        });

        it('marks a failed transaction as FAILED', async () => {
            (checkAlifTransaction as jest.Mock).mockResolvedValue(txn('failed'));

            const data = await (await GET(makeRequest('ORDER-001'))).json();

            expect(data.status).toBe('FAILED');
            expect(failPayment).toHaveBeenCalledWith('pay-1');
        });

        it.each([['pending'], ['to_approve']])('keeps PENDING while Alif says %s', async (status) => {
            (checkAlifTransaction as jest.Mock).mockResolvedValue(txn(status));

            const data = await (await GET(makeRequest('ORDER-001'))).json();

            expect(data.status).toBe('PENDING');
            expect(completePayment).not.toHaveBeenCalled();
            expect(failPayment).not.toHaveBeenCalled();
        });

        it('keeps PENDING when Alif has no such transaction yet', async () => {
            (checkAlifTransaction as jest.Mock).mockResolvedValue(null);
            expect((await (await GET(makeRequest('ORDER-001'))).json()).status).toBe('PENDING');
        });

        it('keeps PENDING when Alif is unreachable', async () => {
            (checkAlifTransaction as jest.Mock).mockRejectedValue(new Error('timeout'));

            const response = await GET(makeRequest('ORDER-001'));

            expect(response.status).toBe(200);
            expect((await response.json()).status).toBe('PENDING');
        });

        it('does not ask Alif about a finished payment', async () => {
            prismaMock.payment.findUnique.mockResolvedValue({ ...pending, status: 'COMPLETED' } as any);
            await GET(makeRequest('ORDER-001'));
            expect(checkAlifTransaction).not.toHaveBeenCalled();
        });

        it('does not ask Alif when no terminal is configured', async () => {
            (isAlifConfigured as jest.Mock).mockReturnValue(false);
            expect((await (await GET(makeRequest('ORDER-001'))).json()).status).toBe('PENDING');
            expect(checkAlifTransaction).not.toHaveBeenCalled();
        });
    });
});
