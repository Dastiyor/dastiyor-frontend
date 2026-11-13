/** @jest-environment node */
import {
    createAlifPayment, checkAlifTransaction, verifyAlifStatusToken, alifSign, alifCallbackUrl,
    isAlifConfigured, isAlifTest, isAlifMethod,
} from '../alif';

const env = process.env as Record<string, string | undefined>;
const fetchMock = jest.fn();
global.fetch = fetchMock as unknown as typeof fetch;
const reply = (status: number, body: unknown) => Promise.resolve({ status, ok: status === 200, json: () => Promise.resolve(body) });

// Signatures worked out by hand from Alif's formula with terminal 123456 / password "secret-pw":
// K = hex(HMAC(key = "123456", "secret-pw")), token = hex(HMAC(key = K, fields)).
const INIT_TOKEN = 'c943b0b7918f8bc866b1730aadde21790ab04280eb240d5d772c288dc60dcebd'; // 123456 DST-1 2.00 callback
const STATUS_TOKEN = '60389f4029dbe9866805db6bf08a3dfe268b9eb27bb175c1fcacae7fb41d6651'; // DST-1 ok 789

describe('Alif', () => {
    const saved = { ...env };
    beforeEach(() => {
        fetchMock.mockReset();
        env.ALIF_TERMINAL_ID = '123456';
        env.ALIF_TERMINAL_PASSWORD = 'secret-pw';
        env.NEXT_PUBLIC_APP_URL = 'https://app.test';
        delete env.ALIF_API_URL;
        delete env.ALIF_CALLBACK_URL;
    });
    afterAll(() => { Object.assign(env, saved); });

    describe('configuration', () => {
        it('needs both the terminal id and the password', () => {
            expect(isAlifConfigured()).toBe(true);
            delete env.ALIF_TERMINAL_PASSWORD;
            expect(isAlifConfigured()).toBe(false);
        });

        it('defaults to production and recognises only the test host as test mode', () => {
            expect(isAlifTest()).toBe(false);
            env.ALIF_API_URL = 'https://test-web.alif.tj';
            expect(isAlifTest()).toBe(true);
            env.ALIF_API_URL = 'https://test-web.alif.tj.evil.example';
            expect(isAlifTest()).toBe(false);
            env.ALIF_API_URL = 'not a url';
            expect(isAlifTest()).toBe(false);
        });

        it('sends notifications to our route unless overridden', () => {
            expect(alifCallbackUrl()).toBe('https://app.test/api/webhooks/alif');
            env.ALIF_CALLBACK_URL = 'https://preview.test/api/webhooks/alif?x=1';
            expect(alifCallbackUrl()).toBe('https://preview.test/api/webhooks/alif?x=1');
        });

        it('knows the payment methods we offer', () => {
            expect(isAlifMethod('wallet')).toBe(true);
            expect(isAlifMethod('salom')).toBe(false);
            expect(isAlifMethod(7)).toBe(false);
        });
    });

    describe('signatures', () => {
        it('signs with the terminal key derived from the password', () => {
            expect(alifSign('123456DST-12.00https://app.test/api/webhooks/alif')).toBe(INIT_TOKEN);
        });

        it('verifies a status signature and rejects anything else', () => {
            expect(verifyAlifStatusToken('DST-1', 'ok', '789', STATUS_TOKEN)).toBe(true);
            expect(verifyAlifStatusToken('DST-1', 'failed', '789', STATUS_TOKEN)).toBe(false);
            expect(verifyAlifStatusToken('DST-1', 'ok', '789', '')).toBe(false);
            expect(verifyAlifStatusToken('DST-1', 'ok', '789', undefined)).toBe(false);
            delete env.ALIF_TERMINAL_ID;
            expect(verifyAlifStatusToken('DST-1', 'ok', '789', STATUS_TOKEN)).toBe(false);
        });
    });

    describe('createAlifPayment', () => {
        const request = { orderId: 'DST-1', amount: 2, description: 'Plan', returnUrl: 'https://app.test/payment/result?orderId=DST-1' };

        it('posts a signed Korti Milli payment and returns the form url', async () => {
            fetchMock.mockReturnValue(reply(200, { code: 200, message: 'Успешно', url: 'https://web.alif.tj/abc' }));

            const result = await createAlifPayment({ ...request, phone: '+992 90 123 4567', email: 'p@test.tj' });

            expect(result).toEqual({ success: true, paymentUrl: 'https://web.alif.tj/abc' });
            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe('https://web.alif.tj/v2/');
            expect(init.headers.gate).toBe('korti_milli');
            expect(JSON.parse(init.body)).toEqual({
                order_id: 'DST-1', token: INIT_TOKEN, key: '123456',
                callback_url: 'https://app.test/api/webhooks/alif', return_url: request.returnUrl,
                amount: '2.00', info: 'Plan', gate: 'korti_milli', email: 'p@test.tj', phone: '992901234567',
            });
        });

        it('uses the chosen method for both the header and the body, and skips a short phone', async () => {
            fetchMock.mockReturnValue(reply(200, { code: 200, url: 'https://web.alif.tj/w' }));
            await createAlifPayment({ ...request, method: 'wallet', phone: '123' });
            const init = fetchMock.mock.calls[0][1];
            expect(init.headers.gate).toBe('wallet');
            expect(JSON.parse(init.body).gate).toBe('wallet');
            expect(JSON.parse(init.body).phone).toBeUndefined();
        });

        it('reports Alif errors, missing urls, an unreadable body and network failures', async () => {
            const logged = jest.spyOn(console, 'error').mockImplementation(() => {});

            fetchMock.mockReturnValue(reply(400, { code: 400, message: 'Неверная сумма', url: '' }));
            expect(await createAlifPayment(request)).toEqual({ success: false, paymentUrl: '', error: 'Неверная сумма' });

            fetchMock.mockReturnValue(reply(200, { code: 200, url: '' }));
            expect((await createAlifPayment(request)).success).toBe(false);

            fetchMock.mockReturnValue(Promise.resolve({ status: 502, json: () => Promise.reject(new Error('html')) }));
            expect(await createAlifPayment(request)).toEqual({ success: false, paymentUrl: '', error: 'Alif HTTP 502' });

            fetchMock.mockReturnValue(Promise.reject(new Error('down')));
            expect(await createAlifPayment(request)).toEqual({ success: false, paymentUrl: '', error: 'Alif unreachable' });

            logged.mockRestore();
        });

        it('refuses without credentials', async () => {
            const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
            delete env.ALIF_TERMINAL_PASSWORD;
            expect((await createAlifPayment(request)).success).toBe(false);
            expect(fetchMock).not.toHaveBeenCalled();
            logged.mockRestore();
        });
    });

    describe('checkAlifTransaction', () => {
        const signed = { orderId: 'DST-1', transactionId: '789', status: 'ok', token: STATUS_TOKEN, amount: 2, transaction_type: 'korti_milli' };

        it('returns the verified status with the amount in dirams', async () => {
            env.ALIF_API_URL = 'https://test-web.alif.tj/';
            fetchMock.mockReturnValue(reply(200, signed));

            expect(await checkAlifTransaction('DST-1')).toEqual({ status: 'ok', transactionId: '789', amount: 200, method: 'korti_milli' });
            const [url, init] = fetchMock.mock.calls[0];
            expect(url).toBe('https://test-web.alif.tj/checktxn');
            expect(JSON.parse(init.body)).toEqual({ orderId: 'DST-1', key: '123456', token: alifSign('123456DST-1') });
        });

        it('returns no method when Alif gives none', async () => {
            fetchMock.mockReturnValue(reply(200, { ...signed, transaction_type: '' }));
            expect((await checkAlifTransaction('DST-1'))?.method).toBeNull();
        });

        it('rejects a bad signature, another order, an unknown status, an error reply and network failure', async () => {
            const logged = jest.spyOn(console, 'error').mockImplementation(() => {});
            fetchMock.mockReturnValue(reply(200, { ...signed, token: 'forged' }));
            expect(await checkAlifTransaction('DST-1')).toBeNull();
            fetchMock.mockReturnValue(reply(200, { ...signed, orderId: 'DST-2' }));
            expect(await checkAlifTransaction('DST-1')).toBeNull();
            fetchMock.mockReturnValue(reply(200, { ...signed, status: 'to_approve' }));
            expect(await checkAlifTransaction('DST-1')).toBeNull();
            fetchMock.mockReturnValue(reply(404, { code: 404, message: 'Не найдено' }));
            expect(await checkAlifTransaction('DST-1')).toBeNull();
            fetchMock.mockReturnValue(Promise.reject(new Error('down')));
            expect(await checkAlifTransaction('DST-1')).toBeNull();
            logged.mockRestore();
        });

        it('does nothing without credentials', async () => {
            delete env.ALIF_TERMINAL_ID;
            expect(await checkAlifTransaction('DST-1')).toBeNull();
            expect(fetchMock).not.toHaveBeenCalled();
        });
    });
});
