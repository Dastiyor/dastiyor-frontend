import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { NextRequest } from 'next/server';

jest.mock('@/lib/payments', () => ({
    verifyCallbackSignature: jest.fn(),
    PLANS: {
        basic: { name: 'Basic', nameRu: 'Базовый', price: 99, durationDays: 7 },
        standard: { name: 'Standard', nameRu: 'Стандарт', price: 199, durationDays: 30 },
        premium: { name: 'Premium', nameRu: 'Премиум', price: 399, durationDays: 30 },
    },
    isValidPlan: jest.fn((plan: string) => ['basic', 'standard', 'premium'].includes(plan)),
}));

jest.mock('@/lib/notifications/email', () => ({
    sendPaymentReceiptEmail: jest.fn().mockResolvedValue(undefined),
}));

import { verifyCallbackSignature } from '@/lib/payments';
import { sendPaymentReceiptEmail } from '@/lib/notifications/email';

const makeRequest = (body: object) =>
    new NextRequest('http://localhost/api/webhooks/smartpay', {
        method: 'POST',
        body: JSON.stringify(body),
    });

const validCallbackBody = {
    transaction_id: 'sp_tx_123',
    order_id: 'ORDER-001',
    amount: 99,
    currency: 'TJS',
    status: 'success',
    payment_method: 'card',
    signature: 'valid-sig',
};

const mockPayment = {
    id: 'pay-1',
    userId: 'user-1',
    smartpayOrderId: 'ORDER-001',
    status: 'PENDING',
    plan: 'basic',
    amount: 99,
    currency: 'TJS',
    description: 'Подписка Базовый',
    transactionId: null,
    paymentMethod: null,
    user: { email: 'user@test.com', fullName: 'Test User' },
};

describe('/api/webhooks/smartpay', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (verifyCallbackSignature as jest.Mock).mockReturnValue(true);
    });

    describe('signature verification', () => {
        it('returns 403 when signature is invalid', async () => {
            (verifyCallbackSignature as jest.Mock).mockReturnValue(false);

            const response = await POST(makeRequest(validCallbackBody));
            const data = await response.json();

            expect(response.status).toBe(403);
            expect(data.error).toBe('Invalid signature');
        });
    });

    describe('payment lookup', () => {
        it('returns 404 when payment record not found', async () => {
            prismaMock.payment.findUnique.mockResolvedValue(null);

            const response = await POST(makeRequest(validCallbackBody));
            const data = await response.json();

            expect(response.status).toBe(404);
            expect(data.error).toBe('Payment not found');
        });
    });

    describe('idempotency', () => {
        it('returns 200 Already processed when payment is not PENDING', async () => {
            prismaMock.payment.findUnique.mockResolvedValue({
                ...mockPayment,
                status: 'COMPLETED',
            } as any);
            prismaMock.payment.updateMany.mockResolvedValue({ count: 0 });

            const response = await POST(makeRequest(validCallbackBody));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.message).toBe('Already processed');
            expect(prismaMock.subscription.create).not.toHaveBeenCalled();
            expect(prismaMock.subscription.update).not.toHaveBeenCalled();
        });
    });

    describe('successful payment', () => {
        beforeEach(() => {
            prismaMock.payment.findUnique.mockResolvedValue(mockPayment as any);
            prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.payment.update.mockResolvedValue({} as any);
            prismaMock.notification.create.mockResolvedValue({} as any);
        });

        it('creates new subscription when none exists', async () => {
            prismaMock.subscription.findUnique.mockResolvedValue(null);
            prismaMock.subscription.create.mockResolvedValue({} as any);

            const response = await POST(makeRequest(validCallbackBody));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.ok).toBe(true);
            expect(prismaMock.subscription.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: 'user-1',
                        plan: 'basic',
                        isActive: true,
                    }),
                })
            );
        });

        it('extends active subscription end date (not restarted from now)', async () => {
            const futureEnd = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
            prismaMock.subscription.findUnique.mockResolvedValue({
                id: 'sub-1',
                userId: 'user-1',
                plan: 'basic',
                startDate: new Date(),
                endDate: futureEnd,
                isActive: true,
            } as any);
            prismaMock.subscription.update.mockResolvedValue({} as any);

            await POST(makeRequest(validCallbackBody));

            const updateCall = prismaMock.subscription.update.mock.calls[0][0];
            const newEndDate: Date = updateCall.data.endDate;
            // Should extend from futureEnd + 7 days (basic plan), not from now + 7 days
            const expectedMinEnd = new Date(futureEnd.getTime() + 6 * 24 * 60 * 60 * 1000);
            expect(newEndDate.getTime()).toBeGreaterThanOrEqual(expectedMinEnd.getTime());
            expect(updateCall.data.isActive).toBe(true);
        });

        it('restarts expired subscription from now', async () => {
            const pastEnd = new Date(Date.now() - 24 * 60 * 60 * 1000);
            prismaMock.subscription.findUnique.mockResolvedValue({
                id: 'sub-1',
                userId: 'user-1',
                plan: 'basic',
                startDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
                endDate: pastEnd,
                isActive: false,
            } as any);
            prismaMock.subscription.update.mockResolvedValue({} as any);

            await POST(makeRequest(validCallbackBody));

            const updateCall = prismaMock.subscription.update.mock.calls[0][0];
            // Expired sub: extends from now, not from pastEnd
            const newEndDate: Date = updateCall.data.endDate;
            const expectedMax = new Date(Date.now() + 8 * 24 * 60 * 60 * 1000);
            expect(newEndDate.getTime()).toBeLessThanOrEqual(expectedMax.getTime());
            expect(updateCall.data.isActive).toBe(true);
        });

        it('creates in-app notification for user', async () => {
            prismaMock.subscription.findUnique.mockResolvedValue(null);
            prismaMock.subscription.create.mockResolvedValue({} as any);

            await POST(makeRequest(validCallbackBody));

            expect(prismaMock.notification.create).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        userId: 'user-1',
                        type: 'SYSTEM',
                        title: 'Подписка активирована',
                    }),
                })
            );
        });

        it('sends receipt email to user', async () => {
            prismaMock.subscription.findUnique.mockResolvedValue(null);
            prismaMock.subscription.create.mockResolvedValue({} as any);

            await POST(makeRequest(validCallbackBody));

            await new Promise(resolve => setTimeout(resolve, 10));
            expect(sendPaymentReceiptEmail).toHaveBeenCalledWith(
                'user@test.com',
                'Test User',
                99,
                'Подписка Базовый',
                'ORDER-001',
                'sp_tx_123'
            );
        });

        it('stores transactionId and paymentMethod on payment record', async () => {
            prismaMock.subscription.findUnique.mockResolvedValue(null);
            prismaMock.subscription.create.mockResolvedValue({} as any);

            await POST(makeRequest(validCallbackBody));

            expect(prismaMock.payment.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: expect.objectContaining({
                        transactionId: 'sp_tx_123',
                        paymentMethod: 'card',
                    }),
                })
            );
        });

        it('accepts snake_case and camelCase field names from gateway', async () => {
            prismaMock.subscription.findUnique.mockResolvedValue(null);
            prismaMock.subscription.create.mockResolvedValue({} as any);

            const camelCaseBody = {
                transactionId: 'sp_tx_456',
                orderId: 'ORDER-001',
                amount: 99,
                currency: 'TJS',
                status: 'success',
                paymentMethod: 'card',
                signature: 'valid-sig',
            };

            const response = await POST(makeRequest(camelCaseBody));
            expect(response.status).toBe(200);
        });
    });

    describe('failed/cancelled payment', () => {
        beforeEach(() => {
            prismaMock.payment.findUnique.mockResolvedValue(mockPayment as any);
            prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });
            prismaMock.payment.update.mockResolvedValue({} as any);
        });

        it('marks payment as FAILED for failed status', async () => {
            const response = await POST(makeRequest({ ...validCallbackBody, status: 'failed' }));
            const data = await response.json();

            expect(response.status).toBe(200);
            expect(data.ok).toBe(true);
            expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { status: 'FAILED' },
                })
            );
            expect(prismaMock.subscription.create).not.toHaveBeenCalled();
        });

        it('marks payment as CANCELLED for cancelled status', async () => {
            await POST(makeRequest({ ...validCallbackBody, status: 'cancelled' }));

            expect(prismaMock.payment.updateMany).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { status: 'CANCELLED' },
                })
            );
            expect(prismaMock.subscription.create).not.toHaveBeenCalled();
        });

        it('stores transactionId on failed payment when provided', async () => {
            await POST(makeRequest({ ...validCallbackBody, status: 'failed' }));

            expect(prismaMock.payment.update).toHaveBeenCalledWith(
                expect.objectContaining({
                    data: { transactionId: 'sp_tx_123' },
                })
            );
        });
    });

    describe('error handling', () => {
        it('returns 500 on unexpected error', async () => {
            prismaMock.payment.findUnique.mockRejectedValue(new Error('DB down'));

            const response = await POST(makeRequest(validCallbackBody));
            const data = await response.json();

            expect(response.status).toBe(500);
            expect(data.error).toBe('Internal Server Error');
        });
    });
});
