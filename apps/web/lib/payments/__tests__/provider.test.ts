/** @jest-environment node */
import { activePaymentProvider, isPaymentTestMode, chargeAmount } from '../provider';

const env = process.env as Record<string, string | undefined>;

describe('payment provider', () => {
    const saved = { ...env };
    beforeEach(() => {
        for (const k of ['PAYMENT_PROVIDER', 'PAYMENT_TEST_AMOUNT', 'SMARTPAY_TEST_AMOUNT', 'SMARTPAY_API_URL', 'ALIF_API_URL']) delete env[k];
    });
    afterAll(() => { Object.assign(env, saved); });

    it('takes payments with SmartPay unless PAYMENT_PROVIDER=alif', () => {
        expect(activePaymentProvider()).toBe('smartpay');
        env.PAYMENT_PROVIDER = 'stripe';
        expect(activePaymentProvider()).toBe('smartpay');
        env.PAYMENT_PROVIDER = 'alif';
        expect(activePaymentProvider()).toBe('alif');
    });

    it("follows the active provider's test environment", () => {
        env.SMARTPAY_API_URL = 'https://sandbox.smartpay.tj/api/merchant';
        expect(isPaymentTestMode()).toBe(true);
        env.PAYMENT_PROVIDER = 'alif';
        expect(isPaymentTestMode()).toBe(false);
        env.ALIF_API_URL = 'https://test-web.alif.tj';
        expect(isPaymentTestMode()).toBe(true);
    });

    describe('chargeAmount', () => {
        it('never overrides the price outside test mode', () => {
            env.PAYMENT_TEST_AMOUNT = '2';
            expect(chargeAmount(199)).toBe(199);
            env.PAYMENT_PROVIDER = 'alif';
            env.ALIF_API_URL = 'https://web.alif.tj';
            expect(chargeAmount(199)).toBe(199);
        });

        it('keeps the price in test mode when no test amount is set or it is not a number', () => {
            env.PAYMENT_PROVIDER = 'alif';
            env.ALIF_API_URL = 'https://test-web.alif.tj';
            expect(chargeAmount(49)).toBe(49);
            env.PAYMENT_TEST_AMOUNT = 'abc';
            expect(chargeAmount(49)).toBe(49);
        });

        it('clamps the test amount to 2–10 somoni, and still reads the older SmartPay name', () => {
            env.SMARTPAY_API_URL = 'https://sandbox.smartpay.tj/api/merchant';
            env.SMARTPAY_TEST_AMOUNT = '1';
            expect(chargeAmount(199)).toBe(2);
            env.PAYMENT_TEST_AMOUNT = '50';
            expect(chargeAmount(199)).toBe(10);
            env.PAYMENT_TEST_AMOUNT = '5.4';
            expect(chargeAmount(199)).toBe(5);
        });
    });
});
