import { isSmartPaySandbox } from './smartpay';
import { isAlifTest } from './alif';

export type PaymentProvider = 'smartpay' | 'alif';

/** Which provider takes new website payments: PAYMENT_PROVIDER=alif, otherwise SmartPay. */
export function activePaymentProvider(): PaymentProvider {
    return process.env.PAYMENT_PROVIDER === 'alif' ? 'alif' : 'smartpay';
}

/** True when the active provider is pointed at its test environment, where no money moves. */
export function isPaymentTestMode(): boolean {
    return activePaymentProvider() === 'alif' ? isAlifTest() : isSmartPaySandbox();
}

// SmartPay's floor for an invoice, and the cap SmartPay set for its test phase.
const TEST_MIN_AMOUNT = 2;
const TEST_MAX_AMOUNT = 10;

/**
 * Somoni to charge for a plan. PAYMENT_TEST_AMOUNT (or the older SMARTPAY_TEST_AMOUNT) replaces
 * the price, clamped to 2–10, but only while the active provider is in test mode: a production
 * provider always charges the real price. Use the result for both the Payment row and the
 * provider's invoice — settlement checks one against the other.
 */
export function chargeAmount(price: number): number {
    const raw = process.env.PAYMENT_TEST_AMOUNT || process.env.SMARTPAY_TEST_AMOUNT;
    const override = Number(raw);
    if (!isPaymentTestMode() || !raw || !Number.isFinite(override)) return price;
    return Math.min(TEST_MAX_AMOUNT, Math.max(TEST_MIN_AMOUNT, Math.round(override)));
}
