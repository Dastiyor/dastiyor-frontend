/**
 * Payment Service — Alif acquiring.
 *
 * Website subscription payments go through Alif (lib/payments/alif.ts); the iPhone app sells
 * through the App Store (lib/payments/revenuecat.ts). The earlier SmartPay integration is
 * kept at git tag `smartpay-final`.
 */

export {
    createAlifPayment,
    checkAlifTransaction,
    verifyAlifCallback,
    isAlifConfigured,
    generateOrderId,
    sameAmount,
} from './alif';

export type {
    AlifPaymentRequest,
    AlifPaymentResponse,
    AlifPaymentCallback,
    AlifCancelCallback,
    AlifTransaction,
    AlifStatus,
} from './alif';

export { completePayment, failPayment } from './complete';

export { PLANS, isValidPlan, normalizePlan } from '../plans';
export type { PlanId } from '../plans';
