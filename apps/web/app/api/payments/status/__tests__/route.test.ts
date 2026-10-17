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
    PLANS: {
        basic: { nameRu: 'Базовый' },
        standard: { nameRu: 'Стандарт' },
        premium: { nameRu: 'Премиум' },
    },
    isValidPlan: jest.fn((plan: string) => ['basic', 'standard', 'premium'].includes(plan)),
    getSmartPayOrderStatus: jest.fn(async () => null),
}));
import { getSmartPayOrderStatus } from '@/lib/payments';

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
            plan: 'basic',
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
            plan: 'standard',
            amount: 199,
            currency: 'TJS',
        } as any);

        const response = await GET(makeRequest('ORDER-001'));
        const data = await response.json();

        expect(response.status).toBe(200);
        expect(data.status).toBe('COMPLETED');
        expect(data.planName).toBe('Стандарт');
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
            plan: 'basic',
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
        expect(data.planName).toBe('Премиум');
    });

    it('returns 500 on database error', async () => {
        prismaMock.payment.findUnique.mockRejectedValue(new Error('DB error'));

        const response = await GET(makeRequest('ORDER-001'));
        const data = await response.json();

        expect(response.status).toBe(500);
        expect(data.error).toBe('Internal Server Error');
    });

    describe('pending payment and SmartPay', () => {
        const pending = { id: 'pay-1', userId: 'user-1', smartpayOrderId: 'ORDER-001', status: 'PENDING', plan: 'basic', amount: 99, currency: 'TJS' };

        it('marks a voided invoice as FAILED', async () => {
            prismaMock.payment.findUnique.mockResolvedValue(pending as any);
            (getSmartPayOrderStatus as jest.Mock).mockResolvedValue('void');
            prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });

            const data = await (await GET(makeRequest('ORDER-001'))).json();

            expect(data.status).toBe('FAILED');
            expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
                where: { id: 'pay-1', status: 'PENDING' }, data: { status: 'FAILED' },
            });
        });

        it('keeps PENDING when the invoice is open or SmartPay is unreachable', async () => {
            prismaMock.payment.findUnique.mockResolvedValue(pending as any);
            (getSmartPayOrderStatus as jest.Mock).mockResolvedValue(null);

            const data = await (await GET(makeRequest('ORDER-001'))).json();

            expect(data.status).toBe('PENDING');
            expect(prismaMock.payment.updateMany).not.toHaveBeenCalled();
        });

        it('does not ask SmartPay about a finished payment', async () => {
            prismaMock.payment.findUnique.mockResolvedValue({ ...pending, status: 'COMPLETED' } as any);
            await GET(makeRequest('ORDER-001'));
            expect(getSmartPayOrderStatus).not.toHaveBeenCalled();
        });
    });
});
