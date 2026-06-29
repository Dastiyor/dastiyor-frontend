import { GET, POST, DELETE } from '../route';
import { prismaMock } from '../../../../__tests__/mocks/prisma';
import { verifyJWTWithVersion } from '@/lib/auth';
import { NextRequest } from 'next/server';
import { cookies } from 'next/headers';



jest.mock('@/lib/auth', () => ({
    verifyJWTWithVersion: jest.fn(),
    getBearerToken: jest.fn(() => null), // return null → fall through to cookie
}));
jest.mock('next/headers', () => ({ cookies: jest.fn() }));
// Subscriptions are gated off in prod via SUBSCRIPTIONS_ENABLED; force it on
// here so the POST tests still exercise the SmartPay payment flow.
jest.mock('@/lib/features', () => ({ SUBSCRIPTIONS_ENABLED: true }));
jest.mock('@/lib/payments', () => ({
    PLANS: {
        basic: { name: 'Basic', nameRu: 'Базовый', price: 99, durationDays: 7 },
        standard: { name: 'Standard', nameRu: 'Стандарт', price: 199, durationDays: 30 },
        premium: { name: 'Premium', nameRu: 'Премиум', price: 399, durationDays: 30 },
    },
    isValidPlan: jest.fn((plan: string) => ['basic', 'standard', 'premium'].includes(plan)),
    createSmartPayOrder: jest.fn(),
    generateOrderId: jest.fn(() => 'ORDER-MOCK-001'),
}));

import { createSmartPayOrder } from '@/lib/payments';

describe('/api/subscription', () => {
    const mockUserId = 'user-1';
    const mockPayload = { id: mockUserId };

    beforeEach(() => {
        jest.clearAllMocks();
        (cookies as jest.Mock).mockResolvedValue({
            get: jest.fn(() => ({ value: 'token' })),
        });
        (verifyJWTWithVersion as jest.Mock).mockResolvedValue(mockPayload);
    });

    const makeGetRequest = () =>
        new NextRequest('http://localhost/api/subscription', { method: 'GET' });
    const makeDeleteRequest = () =>
        new NextRequest('http://localhost/api/subscription', { method: 'DELETE' });

    describe('GET', () => {
        it('should return 401 if no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const response = await GET(makeGetRequest());
            const data = await response.json();

            expect(response.status).toBe(401);
            expect(data.error).toBe('Unauthorized');
        });

        it('should return null subscription when user has none', async () => {
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue(null);

            const response = await GET(makeGetRequest());
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.subscription).toBeNull();
        });

        it('should return subscription with isCurrentlyActive and daysRemaining', async () => {
            const futureEnd = new Date(Date.now() + 10 * 24 * 60 * 60 * 1000);
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue({
                id: 'sub-1',
                userId: mockUserId,
                plan: 'standard',
                startDate: new Date(),
                endDate: futureEnd,
                isActive: true,
            });

            const response = await GET(makeGetRequest());
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.subscription).toBeDefined();
            expect(data.subscription.isCurrentlyActive).toBe(true);
            expect(data.subscription.daysRemaining).toBeGreaterThanOrEqual(9);
        });

        it('should return isCurrentlyActive false when endDate passed', async () => {
            const pastEnd = new Date(Date.now() - 1000);
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue({
                id: 'sub-1',
                userId: mockUserId,
                plan: 'basic',
                startDate: new Date(),
                endDate: pastEnd,
                isActive: true,
            });

            const response = await GET(makeGetRequest());
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.subscription.isCurrentlyActive).toBe(false);
            expect(data.subscription.daysRemaining).toBe(0);
        });
    });

    describe('POST', () => {
        it('should return 401 if no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const request = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({ plan: 'basic' }),
            });

            const response = await POST(request);
            expect(response.status).toBe(401);
        });

        it('should return 400 if plan is missing or invalid', async () => {
            const req1 = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({}),
            });
            const res1 = await POST(req1);
            expect(res1.status).toBe(400);
            expect((await res1.json()).error).toBe('Invalid plan');

            const req2 = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({ plan: 'invalid_plan' }),
            });
            const res2 = await POST(req2);
            expect(res2.status).toBe(400);
        });

        it('should initiate SmartPay payment and return paymentUrl', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: mockUserId,
                email: 'user@test.com',
                phone: '+992901234567',
            } as any);
            prismaMock.payment.create.mockResolvedValue({
                id: 'pay-1',
                userId: mockUserId,
                status: 'PENDING',
                smartpayOrderId: 'ORDER-MOCK-001',
            } as any);
            prismaMock.payment.update.mockResolvedValue({} as any);
            (createSmartPayOrder as jest.Mock).mockResolvedValue({
                success: true,
                paymentUrl: 'https://smartpay.tj/checkout/abc123',
                transactionId: 'sp_tx_001',
            });

            const request = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({ plan: 'basic' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.paymentUrl).toBe('https://smartpay.tj/checkout/abc123');
            expect(data.orderId).toBe('ORDER-MOCK-001');
            expect(data.paymentId).toBe('pay-1');
            expect(prismaMock.payment.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: mockUserId,
                        plan: 'basic',
                        status: 'PENDING',
                        currency: 'TJS',
                    }),
                })
            );
        });

        it('should return 502 when SmartPay order creation fails', async () => {
            prismaMock.user.findUnique.mockResolvedValue({
                id: mockUserId,
                email: 'user@test.com',
                phone: null,
            } as any);
            prismaMock.payment.create.mockResolvedValue({ id: 'pay-1' } as any);
            prismaMock.payment.update.mockResolvedValue({} as any);
            (createSmartPayOrder as jest.Mock).mockResolvedValue({
                success: false,
                paymentUrl: '',
                transactionId: '',
                error: 'Gateway error',
            });

            const request = new NextRequest('http://localhost/api/subscription', {
                method: 'POST',
                body: JSON.stringify({ plan: 'standard' }),
            });

            const response = await POST(request);
            const data = await response.json();

            expect(response.status).toBe(502);
            expect(prismaMock.payment.update).toHaveBeenCalledWith(
                expect.objectContaining({ data: { status: 'FAILED' } })
            );
        });
    });

    describe('DELETE', () => {
        it('should return 401 if no token', async () => {
            (cookies as jest.Mock).mockResolvedValue({ get: jest.fn(() => undefined) });

            const response = await DELETE(makeDeleteRequest());
            expect(response.status).toBe(401);
        });

        it('should return 404 if no subscription found', async () => {
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue(null);

            const response = await DELETE(makeDeleteRequest());
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('No subscription found');
        });

        it('should set subscription isActive to false', async () => {
            (prismaMock.subscription.findUnique as jest.Mock).mockResolvedValue({
                id: 'sub-1',
                userId: mockUserId,
            });
            (prismaMock.subscription.update as jest.Mock).mockResolvedValue({});

            const response = await DELETE(makeDeleteRequest());
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toContain('cancelled');
            expect(prismaMock.subscription.update).toHaveBeenCalledWith({
                where: { userId: mockUserId },
                data: { isActive: false },
            });
        });
    });
});
