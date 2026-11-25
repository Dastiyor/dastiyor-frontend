import crypto from 'crypto';
import {
    alifToken, alifAmount, isAlifConfigured, createAlifPayment, checkAlifTransaction,
    verifyAlifCallback, sameAmount, generateOrderId,
} from '../alif';

// Made-up terminal: these tests check our signing against an independent computation,
// following Alif's samples (github.com/alifcapital/sdk, integration-examples/go/token.go).
const ID = '123456';
const PASSWORD = 'test-password';
const hmac = (key: string, msg: string) => crypto.createHmac('sha256', key).update(msg).digest('hex');
const expectedToken = (...fields: string[]) => hmac(hmac(ID, PASSWORD), fields.join(''));

const ENV = { ...process.env };
const fetchMock = jest.fn();

function reply(status: number, body: unknown) {
    return { status, ok: status >= 200 && status < 300, json: async () => body } as Response;
}

function setEnv(env: Record<string, string | undefined>) {
    for (const [k, v] of Object.entries(env)) {
        if (v === undefined) delete process.env[k];
        else process.env[k] = v;
    }
}

beforeEach(() => {
    fetchMock.mockReset();
    global.fetch = fetchMock as unknown as typeof fetch;
    process.env = { ...ENV };
    setEnv({ ALIF_TERMINAL_ID: ID, ALIF_TERMINAL_PASSWORD: PASSWORD, ALIF_API_URL: 'https://test-web.alif.tj', ALIF_GATE: undefined, NODE_ENV: 'test' });
});
afterAll(() => { process.env = ENV; });

describe('signing', () => {
    it('hashes the password with the terminal id, then signs the fields with that', () => {
        expect(alifToken(ID, 'ORDER-1', '49.00', 'https://x/cb')).toBe(expectedToken(ID, 'ORDER-1', '49.00', 'https://x/cb'));
        expect(alifToken('a')).toMatch(/^[0-9a-f]{64}$/);
    });

    it('writes amounts with exactly two decimals', () => {
        expect(alifAmount(49)).toBe('49.00');
        expect(alifAmount(100.5)).toBe('100.50');
    });

    it('compares amounts to the diram', () => {
        expect(sameAmount(49, 49)).toBe(true);
        expect(sameAmount(49.001, 49)).toBe(true);
        expect(sameAmount(49.5, 49)).toBe(false);
    });
});

describe('isAlifConfigured', () => {
    it('needs both the terminal id and the password', () => {
        expect(isAlifConfigured()).toBe(true);
        setEnv({ ALIF_TERMINAL_PASSWORD: undefined });
        expect(isAlifConfigured()).toBe(false);
    });
});

describe('createAlifPayment', () => {
    const params = {
        orderId: 'DST-1', amount: 49, description: 'Подписка PRO',
        returnUrl: 'https://dastiyor.com/payment/result?orderId=DST-1',
        callbackUrl: 'https://dastiyor.com/api/webhooks/alif',
        phone: '+992 90 123 4567', email: 'p@example.com',
    };

    it('posts a signed request to /v2/ and returns the form URL', async () => {
        fetchMock.mockResolvedValue(reply(200, { code: 200, message: 'Успешно', url: 'https://test-web.alif.tj?payment=abc' }));

        const result = await createAlifPayment(params);

        expect(result).toEqual({ success: true, paymentUrl: 'https://test-web.alif.tj?payment=abc' });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://test-web.alif.tj/v2/');
        expect(init.headers).toMatchObject({ 'Content-Type': 'application/json', gate: 'korti_milli' });
        expect(JSON.parse(init.body)).toEqual({
            key: ID,
            token: expectedToken(ID, 'DST-1', '49.00', params.callbackUrl),
            order_id: 'DST-1',
            amount: '49.00',
            callback_url: params.callbackUrl,
            return_url: params.returnUrl,
            info: 'Подписка PRO',
            gate: 'korti_milli',
            phone: '992901234567',
            email: 'p@example.com',
        });
    });

    it('uses ALIF_GATE in the header and the body, and accepts a base URL ending in /v2', async () => {
        setEnv({ ALIF_GATE: 'visa', ALIF_API_URL: 'https://test-web.alif.tj/v2/' });
        fetchMock.mockResolvedValue(reply(200, { code: 200, url: 'u' }));

        await createAlifPayment(params);

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://test-web.alif.tj/v2/');
        expect(init.headers.gate).toBe('visa');
        expect(JSON.parse(init.body).gate).toBe('visa');
    });

    it('leaves out a phone that is not a Tajik number, and an absent email', async () => {
        fetchMock.mockResolvedValue(reply(200, { code: 200, url: 'u' }));

        await createAlifPayment({ ...params, phone: '+7 999 123 45 67', email: undefined });

        const body = JSON.parse(fetchMock.mock.calls[0][1].body);
        expect(body).not.toHaveProperty('phone');
        expect(body).not.toHaveProperty('email');
    });

    it('defaults to the production host', async () => {
        setEnv({ ALIF_API_URL: undefined });
        fetchMock.mockResolvedValue(reply(200, { code: 200, url: 'u' }));
        await createAlifPayment(params);
        expect(fetchMock.mock.calls[0][0]).toBe('https://web.alif.tj/v2/');
    });

    it.each([
        [208, { code: 208, message: 'Дубликат', url: '' }, 'Дубликат'],
        [401, { code: 401, message: 'Неверный токен', url: '' }, 'Неверный токен'],
        [500, {}, 'Alif HTTP 500'],
    ])('fails on HTTP %s', async (status, body, error) => {
        fetchMock.mockResolvedValue(reply(status, body));
        expect(await createAlifPayment(params)).toEqual({ success: false, paymentUrl: '', error });
    });

    it('fails when Alif cannot be reached', async () => {
        fetchMock.mockRejectedValue(new Error('ECONNRESET'));
        expect(await createAlifPayment(params)).toEqual({ success: false, paymentUrl: '', error: 'Alif is unreachable' });
    });

    it('sends the payer to the local simulator when no terminal is set, outside production', async () => {
        setEnv({ ALIF_TERMINAL_ID: undefined, NEXT_PUBLIC_APP_URL: 'http://localhost:3300' });

        const result = await createAlifPayment(params);

        expect(result).toEqual({ success: true, paymentUrl: 'http://localhost:3300/payment/dev-checkout?orderId=DST-1&amount=49' });
        expect(fetchMock).not.toHaveBeenCalled();
    });

    it('refuses in production when no terminal is set', async () => {
        setEnv({ ALIF_TERMINAL_ID: undefined, NODE_ENV: 'production' });
        expect(await createAlifPayment(params)).toEqual({ success: false, paymentUrl: '', error: 'Alif is not configured' });
    });
});

describe('checkAlifTransaction', () => {
    const signed = (status: string, over: object = {}) => ({
        orderId: 'DST-1', transactionId: '26136', status, amount: 49,
        token: expectedToken('DST-1', status, '26136'), ...over,
    });

    it('posts a signed request and returns the verified transaction', async () => {
        fetchMock.mockResolvedValue(reply(200, signed('ok')));

        expect(await checkAlifTransaction('DST-1')).toEqual({ orderId: 'DST-1', transactionId: '26136', status: 'ok', amount: 49 });
        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe('https://test-web.alif.tj/checktxn');
        expect(JSON.parse(init.body)).toEqual({ orderId: 'DST-1', key: ID, token: expectedToken(ID, 'DST-1') });
    });

    it('rejects a response with a wrong signature', async () => {
        fetchMock.mockResolvedValue(reply(200, signed('ok', { token: expectedToken('DST-1', 'pending', '26136') })));
        await expect(checkAlifTransaction('DST-1')).rejects.toThrow('invalid signature');
    });

    it('rejects a response about another order', async () => {
        fetchMock.mockResolvedValue(reply(200, { ...signed('ok'), orderId: 'DST-2', token: expectedToken('DST-2', 'ok', '26136') }));
        await expect(checkAlifTransaction('DST-1')).rejects.toThrow('invalid signature');
    });

    it.each([
        [404, { code: 404, message: 'Не найдено' }],
        [400, { code: 400, message: 'Не найдено' }],
    ])('returns null when Alif has no such transaction (HTTP %s)', async (status, body) => {
        fetchMock.mockResolvedValue(reply(status, body));
        expect(await checkAlifTransaction('DST-1')).toBeNull();
    });

    it.each([
        [500, { code: 500, message: 'Внутренняя ошибка' }],
        [401, { code: 401, message: 'Неверный токен' }],
        [200, null],
    ])('throws on HTTP %s so the caller can retry', async (status, body) => {
        fetchMock.mockResolvedValue(reply(status, body));
        await expect(checkAlifTransaction('DST-1')).rejects.toThrow('[Alif] checktxn');
    });
});

describe('verifyAlifCallback', () => {
    const payment = (status: string, token = expectedToken('DST-1', status, '26136')) => ({
        orderId: 'DST-1', transactionId: '26136', status, event: 'payment', amount: 49, token,
    }) as any;

    it('accepts a payment notice signed over orderId + status + transactionId', () => {
        expect(verifyAlifCallback(payment('ok'))).toBe(true);
        expect(verifyAlifCallback(payment('ok', expectedToken('DST-1', 'ok', '26136').toUpperCase()))).toBe(true);
    });

    it('rejects a forged or altered payment notice', () => {
        expect(verifyAlifCallback(payment('ok', expectedToken('DST-1', 'failed', '26136')))).toBe(false);
        expect(verifyAlifCallback(payment('ok', 'not-a-token'))).toBe(false);
        expect(verifyAlifCallback(payment('ok', ''))).toBe(false);
        expect(verifyAlifCallback({ ...payment('ok'), token: undefined })).toBe(false);
    });

    it('accepts a refund notice signed over terminal_id + transaction_id + status', () => {
        const notice = { terminal_id: ID, transaction_id: '26136', status: 'canceled', event: 'cancel', token: expectedToken(ID, '26136', 'canceled') } as any;
        expect(verifyAlifCallback(notice)).toBe(true);
        expect(verifyAlifCallback({ ...notice, transaction_id: '26137' })).toBe(false);
    });

    it('rejects a refund notice for another terminal', () => {
        const other = { terminal_id: '654321', transaction_id: '26136', status: 'canceled', event: 'cancel', token: expectedToken('654321', '26136', 'canceled') } as any;
        expect(verifyAlifCallback(other)).toBe(false);
    });

    it('accepts unsigned notices only without a terminal and outside production', () => {
        setEnv({ ALIF_TERMINAL_ID: undefined });
        expect(verifyAlifCallback(payment('ok', ''))).toBe(true);
        setEnv({ NODE_ENV: 'production' });
        expect(verifyAlifCallback(payment('ok', ''))).toBe(false);
    });
});

describe('generateOrderId', () => {
    it('makes unique upper-case DST ids', () => {
        const a = generateOrderId();
        expect(a).toMatch(/^DST-[0-9A-Z]+-[0-9A-F]{8}$/);
        expect(generateOrderId()).not.toBe(a);
    });
});
