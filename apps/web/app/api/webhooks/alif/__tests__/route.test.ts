import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';
import { NextRequest } from 'next/server';

jest.mock('@/lib/payments/alif', () => ({
    verifyAlifCallback: jest.fn(() => true),
    checkAlifTransaction: jest.fn(),
    isAlifConfigured: jest.fn(() => true),
    sameAmount: jest.requireActual('@/lib/payments/alif').sameAmount,
}));
jest.mock('@/lib/payments/complete', () => ({
    completePayment: jest.fn(async () => true),
    failPayment: jest.fn(async () => undefined),
}));

import { verifyAlifCallback, checkAlifTransaction, isAlifConfigured } from '@/lib/payments/alif';
import { completePayment, failPayment } from '@/lib/payments/complete';

const post = (body: unknown) => POST(new NextRequest('http://localhost/api/webhooks/alif', {
    method: 'POST',
    body: typeof body === 'string' ? body : JSON.stringify(body),
}));

const notice = (status: string, over: object = {}) => ({
    orderId: 'DST-1', transactionId: '26136', status, event: 'payment', amount: 49,
    transaction_type: 'korti_milli', token: 'signed', ...over,
});
const payment = { id: 'pay-1', userId: 'user-1', orderId: 'DST-1', status: 'PENDING', plan: 'pro', amount: 49 };
const txn = (status: string, amount = 49) => ({ orderId: 'DST-1', transactionId: '26136', status, amount });

describe('/api/webhooks/alif', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (verifyAlifCallback as jest.Mock).mockReturnValue(true);
        (isAlifConfigured as jest.Mock).mockReturnValue(true);
        prismaMock.payment.findUnique.mockResolvedValue(payment as any);
    });

    it('rejects a body that is not JSON', async () => {
        expect((await post('not json')).status).toBe(400);
    });

    it('rejects a notice with a bad signature, touching nothing', async () => {
        (verifyAlifCallback as jest.Mock).mockReturnValue(false);

        const res = await post(notice('ok'));

        expect(res.status).toBe(403);
        expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
        expect(completePayment).not.toHaveBeenCalled();
    });

    it('activates a paid order once Alif confirms it', async () => {
        (checkAlifTransaction as jest.Mock).mockResolvedValue(txn('ok'));

        const res = await post(notice('ok'));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true });
        expect(prismaMock.payment.findUnique).toHaveBeenCalledWith({ where: { orderId: 'DST-1' } });
        expect(checkAlifTransaction).toHaveBeenCalledWith('DST-1');
        expect(completePayment).toHaveBeenCalledWith('pay-1', { transactionId: '26136', paymentMethod: 'korti_milli' });
    });

    it('answers 200 to a repeated notice without activating twice', async () => {
        (checkAlifTransaction as jest.Mock).mockResolvedValue(txn('ok'));
        (completePayment as jest.Mock).mockResolvedValue(false);

        const res = await post(notice('ok'));

        expect(res.status).toBe(200);
        expect(await res.json()).toEqual({ ok: true, message: 'Already processed' });
    });

    it('does not activate when Alif reports a different amount', async () => {
        (checkAlifTransaction as jest.Mock).mockResolvedValue(txn('ok', 50));

        const res = await post(notice('ok'));

        expect(res.status).toBe(200);
        expect((await res.json()).message).toBe('Amount mismatch');
        expect(completePayment).not.toHaveBeenCalled();
    });

    it.each([[null], [txn('pending')], [txn('failed')]])('does not activate when checktxn does not confirm (%j)', async (answer) => {
        (checkAlifTransaction as jest.Mock).mockResolvedValue(answer);

        const res = await post(notice('ok'));

        expect(res.status).toBe(200);
        expect((await res.json()).message).toBe('Not confirmed');
        expect(completePayment).not.toHaveBeenCalled();
    });

    it('answers 500 when checktxn fails, so Alif retries', async () => {
        (checkAlifTransaction as jest.Mock).mockRejectedValue(new Error('timeout'));

        expect((await post(notice('ok'))).status).toBe(500);
        expect(completePayment).not.toHaveBeenCalled();
    });

    it('marks a failed payment FAILED', async () => {
        const res = await post(notice('failed'));

        expect(res.status).toBe(200);
        expect(failPayment).toHaveBeenCalledWith('pay-1');
        expect(checkAlifTransaction).not.toHaveBeenCalled();
    });

    it.each([['pending'], ['to_approve']])('notes a %s notice and changes nothing', async (status) => {
        const res = await post(notice(status));

        expect(res.status).toBe(200);
        expect(completePayment).not.toHaveBeenCalled();
        expect(failPayment).not.toHaveBeenCalled();
    });

    it('answers 200 for an unknown order, so Alif stops retrying', async () => {
        prismaMock.payment.findUnique.mockResolvedValue(null);

        const res = await post(notice('ok', { orderId: 'NOPE' }));

        expect(res.status).toBe(200);
        expect((await res.json()).message).toBe('Payment not found');
    });

    it('trusts the notice itself only for the dev simulator (no terminal)', async () => {
        (isAlifConfigured as jest.Mock).mockReturnValue(false);

        const res = await post(notice('ok', { transactionId: 'dev_1', transaction_type: 'dev_simulated' }));

        expect(res.status).toBe(200);
        expect(checkAlifTransaction).not.toHaveBeenCalled();
        expect(completePayment).toHaveBeenCalledWith('pay-1', { transactionId: 'dev_1', paymentMethod: 'dev_simulated' });
    });

    it('rejects a simulator notice for the wrong amount', async () => {
        (isAlifConfigured as jest.Mock).mockReturnValue(false);
        await post(notice('ok', { amount: 1 }));
        expect(completePayment).not.toHaveBeenCalled();
    });

    it('records a refund notice against the completed payment', async () => {
        prismaMock.payment.updateMany.mockResolvedValue({ count: 1 });

        const res = await post({ terminal_id: '999001', transaction_id: '26136', status: 'canceled', event: 'cancel', token: 'signed' });

        expect(res.status).toBe(200);
        expect(prismaMock.payment.updateMany).toHaveBeenCalledWith({
            where: { transactionId: '26136', status: 'COMPLETED' },
            data: { status: 'CANCELLED' },
        });
    });

    it('answers 500 on a database error', async () => {
        prismaMock.payment.findUnique.mockRejectedValue(new Error('db down'));
        expect((await post(notice('ok'))).status).toBe(500);
    });
});
