/**
 * Payment Service — SmartPay TJ Integration
 *
 * Handles subscription payments via SmartPay gateway.
 * https://smartpay.tj
 */

export {
    createSmartPayOrder,
    verifyWebhookSignature,
    getSmartPayOrderStatus,
    getSmartPayInvoice,
    generateOrderId,
    isSmartPayConfigured,
    isSmartPaySandbox,
} from './smartpay';

export { activePaymentProvider, isPaymentTestMode, chargeAmount } from './provider';
export type { PaymentProvider } from './provider';

export { createAlifPayment, isAlifConfigured, isAlifMethod, ALIF_METHODS } from './alif';
export type { AlifMethod } from './alif';

export type {
    SmartPayOrderRequest,
    SmartPayOrderResponse,
    SmartPayWebhook,
    SmartPayInvoiceStatus,
    SmartPayInvoice,
} from './smartpay';

export { PLANS, isValidPlan, normalizePlan } from '../plans';
export type { PlanId } from '../plans';
