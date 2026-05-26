/**
 * SmartPay TJ Payment Gateway Integration
 * https://smartpay.tj
 *
 * Flow:
 * 1. Our server creates an order via SmartPay API → gets a payment URL
 * 2. User is redirected to SmartPay checkout page
 * 3. User completes payment on SmartPay
 * 4. SmartPay redirects user back to our success/failure URL
 * 5. SmartPay sends a webhook callback to confirm payment
 * 6. We verify the callback signature and activate the subscription
 *
 * NOTE: The exact API endpoints, auth method, and signature verification
 * will need to be updated once you have access to the SmartPay merchant portal.
 * This implementation follows a standard payment gateway pattern.
 */

import crypto from 'crypto';

// ─── Configuration ──────────────────────────────────────────────────────────

const SMARTPAY_API_URL = process.env.SMARTPAY_API_URL || 'https://api.smartpay.tj';
const SMARTPAY_MERCHANT_ID = process.env.SMARTPAY_MERCHANT_ID || '';
const SMARTPAY_SECRET_KEY = process.env.SMARTPAY_SECRET_KEY || '';
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function isSmartPayConfigured(): boolean {
    return !!(SMARTPAY_MERCHANT_ID && SMARTPAY_SECRET_KEY);
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SmartPayOrderRequest {
    orderId: string;
    amount: number;       // Amount in TJS (whole units, e.g. 99 = 99 somoni)
    currency: string;
    description: string;
    returnUrl: string;    // Where to redirect after payment
    callbackUrl: string;  // Webhook URL for server-to-server notification
    customerEmail?: string;
    customerPhone?: string;
}

export interface SmartPayOrderResponse {
    success: boolean;
    paymentUrl: string;   // URL to redirect the user to
    transactionId: string;
    error?: string;
}

export interface SmartPayCallbackData {
    transactionId: string;
    orderId: string;
    amount: number;
    currency: string;
    status: 'success' | 'failed' | 'cancelled';
    paymentMethod?: string;
    signature: string;
}

// ─── API Methods ────────────────────────────────────────────────────────────

/**
 * Create a payment order with SmartPay.
 * Returns a URL to redirect the user to for payment.
 */
export async function createSmartPayOrder(params: SmartPayOrderRequest): Promise<SmartPayOrderResponse> {
    if (!isSmartPayConfigured()) {
        // Development/test mode: return a simulated payment URL
        console.log('='.repeat(60));
        console.log('[SmartPay DEV] Creating order:', JSON.stringify(params, null, 2));
        console.log('='.repeat(60));

        const simulatedTxId = `sp_dev_${Date.now()}`;
        return {
            success: true,
            paymentUrl: `${APP_URL}/payment/dev-checkout?orderId=${params.orderId}&amount=${params.amount}&txId=${simulatedTxId}`,
            transactionId: simulatedTxId,
        };
    }

    // Production: call SmartPay API
    const payload = {
        merchant_id: SMARTPAY_MERCHANT_ID,
        order_id: params.orderId,
        amount: params.amount,
        currency: params.currency,
        description: params.description,
        return_url: params.returnUrl,
        callback_url: params.callbackUrl,
        customer_email: params.customerEmail,
        customer_phone: params.customerPhone,
        signature: generateRequestSignature(params.orderId, params.amount),
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15_000);

    let response: Response;
    try {
        response = await fetch(`${SMARTPAY_API_URL}/v1/payments/create`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SMARTPAY_SECRET_KEY}`,
            },
            body: JSON.stringify(payload),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timeout);
    }

    if (!response.ok) {
        const errorText = await response.text();
        console.error('[SmartPay] Order creation failed:', response.status, errorText);
        return {
            success: false,
            paymentUrl: '',
            transactionId: '',
            error: `SmartPay API error: ${response.status}`,
        };
    }

    const data = await response.json();

    return {
        success: true,
        paymentUrl: data.payment_url || data.paymentUrl,
        transactionId: data.transaction_id || data.transactionId,
    };
}

/**
 * Verify the callback signature from SmartPay webhook.
 * Ensures the callback is authentic and not tampered with.
 */
export function verifyCallbackSignature(data: SmartPayCallbackData): boolean {
    if (!isSmartPayConfigured()) {
        // Only allow unsigned callbacks in non-production (dev simulator)
        return process.env.NODE_ENV !== 'production';
    }

    const signatureString = `${data.transactionId}:${data.orderId}:${data.amount}:${data.status}`;
    const expectedSignature = crypto
        .createHmac('sha256', SMARTPAY_SECRET_KEY)
        .update(signatureString)
        .digest('hex');

    const incomingBuf = Buffer.from(data.signature || '');
    const expectedBuf = Buffer.from(expectedSignature);

    // timingSafeEqual requires equal length buffers
    if (incomingBuf.length !== expectedBuf.length) return false;

    return crypto.timingSafeEqual(incomingBuf, expectedBuf);
}

/**
 * Check payment status with SmartPay API (for manual verification).
 */
export async function checkPaymentStatus(transactionId: string): Promise<{
    status: 'success' | 'pending' | 'failed' | 'cancelled';
    paymentMethod?: string;
}> {
    if (!isSmartPayConfigured()) {
        return { status: 'success', paymentMethod: 'dev_simulated' };
    }

    const statusController = new AbortController();
    const statusTimeout = setTimeout(() => statusController.abort(), 10_000);

    let response: Response;
    try {
        response = await fetch(`${SMARTPAY_API_URL}/v1/payments/status/${transactionId}`, {
            headers: {
                'Authorization': `Bearer ${SMARTPAY_SECRET_KEY}`,
                'X-Merchant-ID': SMARTPAY_MERCHANT_ID,
            },
            signal: statusController.signal,
        });
    } finally {
        clearTimeout(statusTimeout);
    }

    if (!response.ok) {
        console.error('[SmartPay] Status check failed:', response.status);
        return { status: 'pending' };
    }

    const data = await response.json();
    return {
        status: data.status,
        paymentMethod: data.payment_method || data.paymentMethod,
    };
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function generateRequestSignature(orderId: string, amount: number): string {
    const signatureString = `${SMARTPAY_MERCHANT_ID}:${orderId}:${amount}`;
    return crypto
        .createHmac('sha256', SMARTPAY_SECRET_KEY)
        .update(signatureString)
        .digest('hex');
}

/**
 * Generate a unique order ID for SmartPay.
 */
export function generateOrderId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `DST-${timestamp}-${random}`.toUpperCase();
}
