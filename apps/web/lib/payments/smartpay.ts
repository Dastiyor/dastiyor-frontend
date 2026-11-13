/**
 * SmartPay TJ merchant API (https://smartpay.tj — developer guide in the merchant dashboard, /dev).
 *
 * Flow:
 * 1. POST /invoices creates an invoice → we redirect the payer to its payment_link
 * 2. The payer pays on SmartPay (card or bank app); SmartPay returns them to return_url
 * 3. SmartPay POSTs a webhook — configured once in the dashboard (Settings → Webhooks),
 *    not per request — for each successful payment, signed with HMAC-SHA256
 * 4. We verify it and activate the subscription. GET /order/status/{order_id} reports
 *    open / Charged / void (and the paid amount, in dirams); /api/payments/status uses it
 *    to activate a paid invoice whose webhook never came, and to fail a voided one.
 *
 * Units: invoice amounts are somoni; webhook amounts are dirams (1 somoni = 100 dirams).
 *
 * Env: SMARTPAY_API_KEY (dashboard → Settings → API Keys), SMARTPAY_WEBHOOK_SECRET (shown once
 * when the webhook is created), SMARTPAY_API_URL (defaults to production; the sandbox is
 * https://sandbox.smartpay.tj/api/merchant), PAYMENT_TEST_AMOUNT (test mode only — see
 * chargeAmount in ./provider). Read at call time so tests can set them.
 *
 * Sandbox test cards (shown on the sandbox payment page): МИР 2200 0000 0000 0004 succeeds,
 * any Visa/Mastercard is declined; any future expiry, any CVC. Invoices start at 2 somoni.
 */

import crypto from 'crypto';

const DEFAULT_API_URL = 'https://ecomm.smartpay.tj/api/merchant';
const INVOICE_LIFETIME_SECONDS = 1800;

const apiUrl = () => process.env.SMARTPAY_API_URL || DEFAULT_API_URL;
const apiKey = () => process.env.SMARTPAY_API_KEY || '';
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const isProduction = () => process.env.NODE_ENV === 'production';

export function isSmartPayConfigured(): boolean {
    return !!apiKey();
}

/** True when the API URL points at SmartPay's sandbox, where no money moves. */
export function isSmartPaySandbox(): boolean {
    try {
        return new URL(apiUrl()).hostname === 'sandbox.smartpay.tj';
    } catch {
        return false;
    }
}

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SmartPayOrderRequest {
    orderId: string;
    amount: number;       // somoni
    description: string;
    returnUrl: string;    // where SmartPay sends the payer afterwards
    customerPhone?: string;
    customerName?: string;
}

export interface SmartPayOrderResponse {
    success: boolean;
    paymentUrl: string;
    transactionId: string; // SmartPay invoice_uuid
    error?: string;
}

/** Body of SmartPay's payment webhook. */
export interface SmartPayWebhook {
    payment_date: string;   // ISO 8601, may carry microseconds
    amount: number;         // dirams
    order_id: string;
    bank_id: number | string;
    invoice_uuid: string;
    payment_id: string | number;
    invoice_number?: string;
    bank?: string;
    signature: string;
}

export type SmartPayInvoiceStatus = 'open' | 'Charged' | 'void';

// ─── API ────────────────────────────────────────────────────────────────────

async function call(path: string, init: RequestInit = {}, timeoutMs = 15_000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(`${apiUrl()}${path}`, {
            ...init,
            headers: { 'Content-Type': 'application/json', 'x-app-token': apiKey(), ...(init.headers as Record<string, string>) },
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }
}

/** Create an invoice; returns the URL to send the payer to. */
export async function createSmartPayOrder(params: SmartPayOrderRequest): Promise<SmartPayOrderResponse> {
    if (!isSmartPayConfigured()) {
        // A missing key in production must not silently hand out a fake checkout.
        if (isProduction()) {
            console.error('[SmartPay] SMARTPAY_API_KEY is not set');
            return { success: false, paymentUrl: '', transactionId: '', error: 'SmartPay is not configured' };
        }
        const simulatedTxId = `sp_dev_${Date.now()}`;
        console.log('[SmartPay DEV] Creating order:', params.orderId, params.amount);
        return {
            success: true,
            paymentUrl: `${appUrl()}/payment/dev-checkout?orderId=${params.orderId}&amount=${params.amount}&txId=${simulatedTxId}`,
            transactionId: simulatedTxId,
        };
    }

    const res = await call('/invoices', {
        method: 'POST',
        body: JSON.stringify({
            amount: params.amount,
            order_id: params.orderId,
            description: params.description,
            lifetime: INVOICE_LIFETIME_SECONDS,
            return_url: params.returnUrl,
            // SmartPay takes the 9 local digits, without +992.
            ...(params.customerPhone ? { customer_phone: params.customerPhone.replace(/\D/g, '').slice(-9) } : {}),
            ...(params.customerName ? { name: params.customerName } : {}),
        }),
    });

    if (!res.ok) {
        console.error('[SmartPay] Invoice creation failed:', res.status, await res.text());
        return { success: false, paymentUrl: '', transactionId: '', error: `SmartPay HTTP ${res.status}` };
    }

    // Business errors come back as HTTP 200 with result 400.
    const data = await res.json();
    if (data.result !== 200 || !data.payment_link) {
        console.error('[SmartPay] Invoice rejected:', data.message);
        return { success: false, paymentUrl: '', transactionId: '', error: String(data.message ?? 'SmartPay error') };
    }
    return { success: true, paymentUrl: data.payment_link, transactionId: data.invoice_uuid };
}

/** What SmartPay's order-status API reports for one invoice. */
export interface SmartPayInvoice {
    status: SmartPayInvoiceStatus;
    paidAmount: number;          // dirams
    invoiceUuid: string | null;
    paymentMethod: string | null;
}

/** Invoice by our order id, or null when unknown or SmartPay can't be reached. */
export async function getSmartPayInvoice(orderId: string): Promise<SmartPayInvoice | null> {
    if (!isSmartPayConfigured()) return null;
    try {
        const res = await call(`/order/status/${encodeURIComponent(orderId)}`, {}, 10_000);
        if (!res.ok) return null;
        const data = await res.json();
        const { status } = data;
        if (status !== 'open' && status !== 'Charged' && status !== 'void') return null;
        return {
            status,
            // Reported as dirams with a decimal point ("200.0" for 2 somoni).
            paidAmount: Math.round(Number(data.paid_amount) || 0),
            invoiceUuid: data.invoice_uuid ? String(data.invoice_uuid) : null,
            paymentMethod: data.payment_method ? String(data.payment_method) : null,
        };
    } catch {
        return null;
    }
}

/** Invoice status by our order id, or null when unknown or SmartPay can't be reached. */
export async function getSmartPayOrderStatus(orderId: string): Promise<SmartPayInvoiceStatus | null> {
    return (await getSmartPayInvoice(orderId))?.status ?? null;
}

/**
 * Verify a webhook: HMAC-SHA256 (hex) of `payment_date|amount|order_id|bank_id|invoice_uuid`,
 * with payment_date as `YYYY-MM-DD HH:MM:SS`. Without a secret, only the dev simulator's
 * unsigned callbacks are accepted, and never in production.
 */
export function verifyWebhookSignature(body: SmartPayWebhook): boolean {
    const secret = process.env.SMARTPAY_WEBHOOK_SECRET;
    if (!secret) return !isProduction();

    const date = String(body.payment_date ?? '').replace('T', ' ').slice(0, 19);
    const signed = `${date}|${body.amount}|${body.order_id}|${body.bank_id}|${body.invoice_uuid}`;
    const expected = crypto.createHmac('sha256', secret).update(signed).digest('hex');

    const given = Buffer.from(String(body.signature ?? ''));
    const want = Buffer.from(expected);
    return given.length === want.length && crypto.timingSafeEqual(given, want);
}

/** A unique order id for a new invoice. */
export function generateOrderId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `DST-${timestamp}-${random}`.toUpperCase();
}
