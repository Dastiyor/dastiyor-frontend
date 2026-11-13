import { POST } from '../route';
import { prismaMock } from '../../../../../__tests__/mocks/prisma';

jest.mock('@/lib/payments/alif', () => ({ verifyAlifStatusToken: jest.fn(() => true) }));
jest.mock('@/lib/payments/complete', () => ({ reconcileAlifPayment: jest.fn(async () => 'COMPLETED') }));

import { verifyAlifStatusToken } from '@/lib/payments/alif';
import { reconcileAlifPayment } from '@/lib/payments/complete';

const post = (body: unknown) => POST(new Request('http://localhost/api/webhooks/alif', {
    method: 'POST', body: typeof body === 'string' ? body : JSON.stringify(body),
}));
const notice = { orderId: 'DST-1', transactionId: '789', status: 'ok', token: 'sig', amount: 2, event: 'payment' };
const pending = { id: 'pay-1', amount: 2, status: 'PENDING', provider: 'alif' };

describe('/api/webhooks/alif', () => {
    beforeEach(() => {
        jest.clearAllMocks();
        (verifyAlifStatusToken as jest.Mock).mockReturnValue(true);
    });

    it('rejects a body that is not JSON', async () => {
        expect((await post('nope')).status).toBe(400);
    });

    it('acknowledges a refund notification without touching payments', async () => {
        jest.spyOn(console, 'warn').mockImplementation(() => {});
        const res = await post({ terminal_id: '123456', transaction_id: '789', status: 'canceled', event: 'cancel', token: 't' });
        expect(res.status).toBe(200);
        expect(prismaMock.payment.findUnique).not.toHaveBeenCalled();
    });

    it('rejects a bad signature with 403', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        (verifyAlifStatusToken as jest.Mock).mockReturnValue(false);
        const res = await post(notice);
        expect(res.status).toBe(403);
        expect(verifyAlifStatusToken).toHaveBeenCalledWith('DST-1', 'ok', '789', 'sig');
    });

    it('answers 200 for an unknown order or one that is not Alif\'s, so Alif stops retrying', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        prismaMock.payment.findUnique.mockResolvedValue(null);
        expect((await (await post(notice)).json()).ok).toBe(false);
        prismaMock.payment.findUnique.mockResolvedValue({ ...pending, provider: 'smartpay' } as any);
        expect((await post(notice)).status).toBe(200);
        expect(reconcileAlifPayment).not.toHaveBeenCalled();
    });

    it('ignores a payment already settled', async () => {
        prismaMock.payment.findUnique.mockResolvedValue({ ...pending, status: 'COMPLETED' } as any);
        const data = await (await post(notice)).json();
        expect(data.message).toBe('Already processed');
        expect(reconcileAlifPayment).not.toHaveBeenCalled();
    });

    it('settles a pending payment from Alif\'s own status check', async () => {
        prismaMock.payment.findUnique.mockResolvedValue(pending as any);
        const data = await (await post(notice)).json();
        expect(data).toEqual({ ok: true, status: 'COMPLETED' });
        expect(reconcileAlifPayment).toHaveBeenCalledWith({ id: 'pay-1', amount: 2, smartpayOrderId: 'DST-1' });
    });

    it('reads missing fields as empty strings', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        (verifyAlifStatusToken as jest.Mock).mockReturnValue(false);
        await post({ orderId: 'DST-1' });
        expect(verifyAlifStatusToken).toHaveBeenCalledWith('DST-1', '', '', undefined);
    });

    it('answers 500 on a database error so Alif retries', async () => {
        jest.spyOn(console, 'error').mockImplementation(() => {});
        prismaMock.payment.findUnique.mockRejectedValue(new Error('db down'));
        expect((await post(notice)).status).toBe(500);
    });
});
