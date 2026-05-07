/**
 * Payment Service — SmartPay TJ Integration
 *
 * Handles subscription payments via SmartPay gateway.
 * https://smartpay.tj
 */

export {
    createSmartPayOrder,
    verifyCallbackSignature,
    checkPaymentStatus,
    generateOrderId,
    isSmartPayConfigured,
} from './smartpay';

export type {
    SmartPayOrderRequest,
    SmartPayOrderResponse,
    SmartPayCallbackData,
} from './smartpay';

// Plan configurations (shared between API routes)
export const PLANS = {
    basic: {
        name: 'Basic',
        nameRu: 'Базовый',
        price: 99,
        durationDays: 7,
        responsesPerDay: 15,
    },
    standard: {
        name: 'Standard',
        nameRu: 'Стандарт',
        price: 199,
        durationDays: 30,
        responsesPerMonth: 50,
    },
    premium: {
        name: 'Premium',
        nameRu: 'Премиум',
        price: 399,
        durationDays: 30,
        responsesPerMonth: -1, // Unlimited
    },
} as const;

export type PlanId = keyof typeof PLANS;

export function isValidPlan(plan: string): plan is PlanId {
    return plan in PLANS;
}
