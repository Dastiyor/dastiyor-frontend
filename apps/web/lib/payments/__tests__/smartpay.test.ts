/** @jest-environment node */
import { createSmartPayOrder, verifyWebhookSignature, getSmartPayOrderStatus, isSmartPayConfigured } from '../smartpay';

const env = process.env as Record<string, string | undefined>;
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;
const ok = (body: unknown) => Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve(body), text: () => Promise.resolve(JSON.stringify(body)) });

// From SmartPay's developer guide: HMAC-SHA256 hex of payment_date|amount|order_id|bank_id|invoice_uuid
const VECTOR = {
    payment_date: '2026-01-15T14:30:00', amount: 1500000, order_id: 'ORD-123456', bank_id: 1,
    invoice_uuid: 'a1b2c3d4-e5f6-7890-abcd-ef0123456789', payment_id: 'pay-1', invoice_number: '001-000042', bank: 'Амонатбонк',
    signature: '43b359b4033ad9f959af3e5b2005f387d5d3c831c319224de51a6c2d72ed7176',
};

describe('SmartPay', () => {
    const saved = { ...env };
    beforeEach(() => {
        fetchMock.mockReset();
        env.SMARTPAY_API_KEY = 'key-1';
        env.SMARTPAY_WEBHOOK_SECRET = 'test_secret';
        delete env.SMARTPAY_API_URL;
    });
    afterAll(() => { Object.assign(env, saved); });

    describe('verifyWebhookSignature', () => {
        it('accepts the known vector', () => {
            expect(verifyWebhookSignature(VECTOR)).toBe(true);
        });

        it('accepts payment_date with microseconds', () => {
            expect(verifyWebhookSignature({ ...VECTOR, payment_date: '2026-01-15T14:30:00.879779' })).toBe(true);
        });

        it('rejects a tampered amount', () => {
            expect(verifyWebhookSignature({ ...VECTOR, amount: 1 })).toBe(false);
        });

        it('rejects a missing or malformed signature', () => {
            expect(verifyWebhookSignature({ ...VECTOR, signature: '' })).toBe(false);
            expect(verifyWebhookSignature({ ...VECTOR, signature: 'zz' })).toBe(false);
        });

        it('without a secret, accepts unsigned callbacks only outside production', () => {
            delete env.SMARTPAY_WEBHOOK_SECRET;
            env.NODE_ENV = 'test';
            expect(verifyWebhookSignature({ ...VECTOR, signature: '' })).toBe(true);
            env.NODE_ENV = 'production';
            expect(verifyWebhookSignature({ ...VECTOR, signature: '' })).toBe(false);
            env.NODE_ENV = 'test';
        });
    });

    describe('createSmartPayOrder', () => {
        const order = { orderId: 'DST-1', amount: 99, description: 'Подписка', returnUrl: 'https://www.dastiyor.com/payment/result?orderId=DST-1', customerPhone: '+992935001234', customerName: 'Ali' };

        it('posts an invoice with the API key and returns the payment link', async () => {
            fetchMock.mockReturnValue(ok({ result: 200, invoice_uuid: 'uuid-1', smartpay_id: '1', payment_link: 'https://smartpay.tj/invoice/1' }));

            const res = await createSmartPayOrder(order);

            expect(res).toEqual({ success: true, paymentUrl: 'https://smartpay.tj/invoice/1', transactionId: 'uuid-1' });
            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe('https://ecomm.smartpay.tj/api/merchant/invoices');
            expect(init.method).toBe('POST');
            expect(init.headers['x-app-token']).toBe('key-1');
            expect(JSON.parse(init.body)).toEqual({
                amount: 99, order_id: 'DST-1', description: 'Подписка', lifetime: 1800,
                return_url: order.returnUrl, customer_phone: '935001234', name: 'Ali',
            });
        });

        it('uses SMARTPAY_API_URL when set (sandbox)', async () => {
            env.SMARTPAY_API_URL = 'https://sandbox.smartpay.tj/api/merchant';
            fetchMock.mockReturnValue(ok({ result: 200, invoice_uuid: 'u', payment_link: 'l' }));
            await createSmartPayOrder(order);
            expect(fetchMock.mock.calls[0][0]).toBe('https://sandbox.smartpay.tj/api/merchant/invoices');
        });

        it('create returns failure when result is 400 inside HTTP 200', async () => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
            fetchMock.mockReturnValue(ok({ result: 400, message: 'Error: Required data not found', payment_link: null }));
            const res = await createSmartPayOrder(order);
            expect(res.success).toBe(false);
            expect(res.error).toContain('Required data not found');
        });

        it('returns failure on an HTTP error', async () => {
            jest.spyOn(console, 'error').mockImplementation(() => {});
            fetchMock.mockReturnValue(Promise.resolve({ ok: false, status: 401, text: () => Promise.resolve('unauthorized') }));
            expect((await createSmartPayOrder(order)).success).toBe(false);
        });

        it('uses the dev simulator without a key outside production', async () => {
            delete env.SMARTPAY_API_KEY;
            jest.spyOn(console, 'log').mockImplementation(() => {});
            const res = await createSmartPayOrder(order);
            expect(res.success).toBe(true);
            expect(res.paymentUrl).toContain('/payment/dev-checkout?orderId=DST-1');
            expect(fetchMock).not.toHaveBeenCalled();
        });

        it('refuses to simulate in production without a key', async () => {
            delete env.SMARTPAY_API_KEY;
            env.NODE_ENV = 'production';
            jest.spyOn(console, 'error').mockImplementation(() => {});
            const res = await createSmartPayOrder(order);
            env.NODE_ENV = 'test';
            expect(res.success).toBe(false);
        });
    });

    describe('getSmartPayOrderStatus', () => {
        it('returns the invoice status', async () => {
            fetchMock.mockReturnValue(ok({ status: 'void' }));
            expect(await getSmartPayOrderStatus('DST-1')).toBe('void');
            expect(fetchMock.mock.calls[0][0]).toBe('https://ecomm.smartpay.tj/api/merchant/order/status/DST-1');
        });

        it('returns null for an unknown status, an error, or no key', async () => {
            fetchMock.mockReturnValue(ok({ status: 'weird' }));
            expect(await getSmartPayOrderStatus('DST-1')).toBeNull();
            fetchMock.mockReturnValue(Promise.reject(new Error('down')));
            expect(await getSmartPayOrderStatus('DST-1')).toBeNull();
            delete env.SMARTPAY_API_KEY;
            expect(await getSmartPayOrderStatus('DST-1')).toBeNull();
        });
    });

    it('isSmartPayConfigured follows the API key', () => {
        expect(isSmartPayConfigured()).toBe(true);
        delete env.SMARTPAY_API_KEY;
        expect(isSmartPayConfigured()).toBe(false);
    });
});
