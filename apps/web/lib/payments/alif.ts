/**
 * Alif Acquiring (https://docs.acquiring.alif.tj) — one-off payments.
 *
 * Flow:
 * 1. POST /v2/ creates a payment for our order id → we redirect the payer to its url.
 * 2. The payer pays on Alif's form; Alif returns them to return_url.
 * 3. Alif POSTs a notification to the callback_url we sent with the payment, and retries
 *    (5 × ~10 s, then hourly, 15 tries) until we answer 200.
 * 4. We treat that notification only as a trigger: POST /checktxn gives the signed, current
 *    status and amount, and that is what activates the plan. The same check serves the
 *    result page and the daily cron when no notification arrives.
 *
 * Signing: every request carries HMAC-SHA256(fields, K) where
 * K = hex(HMAC-SHA256(password, key = terminal_id)), per Alif's SDK samples
 * (github.com/alifcapital/sdk). Responses and notifications are signed with the same K over
 * orderId + status + transactionId — checked against the test terminal.
 *
 * Units: amounts are somoni with two decimals ("2.00"), both ways.
 *
 * Env: ALIF_TERMINAL_ID, ALIF_TERMINAL_PASSWORD (from Alif), ALIF_API_URL (defaults to
 * production; the test environment is https://test-web.alif.tj), ALIF_CALLBACK_URL (optional
 * override of where Alif sends notifications — a protected preview needs its bypass in it).
 * Read at call time so tests can set them.
 */

import crypto from 'crypto';

const DEFAULT_API_URL = 'https://web.alif.tj';

const apiUrl = () => (process.env.ALIF_API_URL || DEFAULT_API_URL).replace(/\/+$/, '');
const terminalId = () => process.env.ALIF_TERMINAL_ID || '';
const terminalPassword = () => process.env.ALIF_TERMINAL_PASSWORD || '';
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

export function isAlifConfigured(): boolean {
    return !!terminalId() && !!terminalPassword();
}

/** True when the API URL points at Alif's test environment, where no money moves. */
export function isAlifTest(): boolean {
    try {
        return new URL(apiUrl()).hostname === 'test-web.alif.tj';
    } catch {
        return false;
    }
}

/** Payment methods we offer; each is an Alif "gate". */
export const ALIF_METHODS = ['korti_milli', 'wallet', 'visa', 'mastercard'] as const;
export type AlifMethod = typeof ALIF_METHODS[number];

export function isAlifMethod(value: unknown): value is AlifMethod {
    return typeof value === 'string' && (ALIF_METHODS as readonly string[]).includes(value);
}

function hmacHex(key: string, message: string): string {
    return crypto.createHmac('sha256', key).update(message).digest('hex');
}

/** Sign a request or check a signature: HMAC over the fields with the derived terminal key. */
export function alifSign(dataToSign: string): string {
    return hmacHex(hmacHex(terminalId(), terminalPassword()), dataToSign);
}

function sameToken(given: unknown, expected: string): boolean {
    const a = Buffer.from(String(given ?? ''));
    const b = Buffer.from(expected);
    return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Alif's signature over a payment status: orderId + status + transactionId. */
export function verifyAlifStatusToken(orderId: string, status: string, transactionId: string, token: unknown): boolean {
    if (!isAlifConfigured()) return false;
    return sameToken(token, alifSign(`${orderId}${status}${transactionId}`));
}

const formatAmount = (somoni: number) => somoni.toFixed(2);

/** Where Alif sends payment notifications. */
export function alifCallbackUrl(): string {
    return process.env.ALIF_CALLBACK_URL || `${appUrl()}/api/webhooks/alif`;
}

// ─── Payments ───────────────────────────────────────────────────────────────

export interface AlifPaymentRequest {
    orderId: string;
    amount: number;          // somoni
    description: string;
    returnUrl: string;
    method?: AlifMethod;     // defaults to Korti Milli
    email?: string;
    phone?: string;          // any format; sent as 992XXXXXXXXX
}

export interface AlifPaymentResponse {
    success: boolean;
    paymentUrl: string;
    error?: string;
}

async function post(path: string, body: unknown, headers: Record<string, string> = {}, timeoutMs = 15_000): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(`${apiUrl()}${path}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', ...headers },
            body: JSON.stringify(body),
            signal: controller.signal,
        });
    } finally {
        clearTimeout(timer);
    }
}

/** Create a payment; returns the URL of Alif's payment form. */
export async function createAlifPayment(params: AlifPaymentRequest): Promise<AlifPaymentResponse> {
    if (!isAlifConfigured()) {
        console.error('[Alif] ALIF_TERMINAL_ID / ALIF_TERMINAL_PASSWORD are not set');
        return { success: false, paymentUrl: '', error: 'Alif is not configured' };
    }

    const gate = params.method ?? 'korti_milli';
    const key = terminalId();
    const amount = formatAmount(params.amount);
    const callbackUrl = alifCallbackUrl();
    const digits = params.phone?.replace(/\D/g, '') ?? '';

    try {
        const res = await post('/v2/', {
            order_id: params.orderId,
            token: alifSign(`${key}${params.orderId}${amount}${callbackUrl}`),
            key,
            callback_url: callbackUrl,
            return_url: params.returnUrl,
            amount,
            info: params.description,
            gate,
            ...(params.email ? { email: params.email } : {}),
            ...(digits.length >= 9 ? { phone: `992${digits.slice(-9)}` } : {}),
        }, { gate });

        // The body's code mirrors the HTTP status; 200 is the only success.
        const data = await res.json().catch(() => ({}));
        if (res.status !== 200 || data.code !== 200 || !data.url) {
            console.error('[Alif] Payment creation failed:', res.status, data.message);
            return { success: false, paymentUrl: '', error: String(data.message ?? `Alif HTTP ${res.status}`) };
        }
        return { success: true, paymentUrl: String(data.url) };
    } catch (error) {
        console.error('[Alif] Payment creation error:', error);
        return { success: false, paymentUrl: '', error: 'Alif unreachable' };
    }
}

export type AlifTransactionStatus = 'pending' | 'ok' | 'failed' | 'canceled';

export interface AlifTransaction {
    status: AlifTransactionStatus;
    transactionId: string;
    amount: number;              // dirams
    method: string | null;       // korti_milli, wallet, visa, …
}

/**
 * Current status of a payment by our order id, verified against Alif's signature.
 * Null when unknown, unsigned, or Alif can't be reached — callers then leave it pending.
 */
export async function checkAlifTransaction(orderId: string): Promise<AlifTransaction | null> {
    if (!isAlifConfigured()) return null;
    const key = terminalId();
    try {
        const res = await post('/checktxn', { orderId, key, token: alifSign(`${key}${orderId}`) }, {}, 10_000);
        if (res.status !== 200) return null;
        const data = await res.json();
        const status = String(data.status ?? '');
        const transactionId = String(data.transactionId ?? '');
        if (!['pending', 'ok', 'failed', 'canceled'].includes(status)) return null;
        if (String(data.orderId ?? '') !== orderId) return null;
        if (!verifyAlifStatusToken(orderId, status, transactionId, data.token)) {
            console.error('[Alif] Status response with a bad signature for order:', orderId);
            return null;
        }
        return {
            status: status as AlifTransactionStatus,
            transactionId,
            amount: Math.round(Number(data.amount) * 100) || 0,
            method: data.transaction_type ? String(data.transaction_type) : null,
        };
    } catch {
        return null;
    }
}
