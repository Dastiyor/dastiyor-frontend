/**
 * Alif acquiring (https://docs.acquiring.alif.tj; code samples: github.com/alifcapital/sdk).
 *
 * Flow:
 * 1. POST /v2/ starts a payment → we redirect the payer to the returned url (Alif's form)
 * 2. The payer pays there; Alif returns them to return_url
 * 3. Alif POSTs a signed notice to callback_url (retried until it gets exactly 200)
 * 4. We verify it, confirm with POST /checktxn (the notice's signature does not cover the
 *    amount), and activate the subscription. The result page also asks /checktxn, so a
 *    lost notice still ends in the right state.
 *
 * Signing: inner = HMAC_SHA256(key = terminal id, msg = terminal password), hex; every token is
 * HMAC_SHA256(key = inner, msg = the fields concatenated), hex.
 *
 * Env: ALIF_TERMINAL_ID, ALIF_TERMINAL_PASSWORD, ALIF_API_URL (defaults to production;
 * the sandbox is https://test-web.alif.tj), ALIF_GATE (defaults to korti_milli). Read at
 * call time so tests can set them. Without a terminal, outside production, checkout goes to
 * the local simulator at /payment/dev-checkout.
 */

import crypto from 'crypto';

const DEFAULT_API_URL = 'https://web.alif.tj';

const apiUrl = () => (process.env.ALIF_API_URL || DEFAULT_API_URL).replace(/\/+$/, '').replace(/\/v2$/, '');
const terminalId = () => process.env.ALIF_TERMINAL_ID || '';
const terminalPassword = () => process.env.ALIF_TERMINAL_PASSWORD || '';
const gate = () => process.env.ALIF_GATE || 'korti_milli';
const appUrl = () => process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
const isProduction = () => process.env.NODE_ENV === 'production';

export function isAlifConfigured(): boolean {
    return !!terminalId() && !!terminalPassword();
}

// ─── Types ──────────────────────────────────────────────────────────────────

/** Transaction statuses. ok, failed and canceled are final; canceled = paid, then refunded. */
export type AlifStatus = 'pending' | 'ok' | 'failed' | 'canceled' | 'to_approve';

export interface AlifPaymentRequest {
    orderId: string;
    amount: number;      // somoni
    description: string;
    returnUrl: string;
    callbackUrl: string;
    phone?: string;
    email?: string;
}

export interface AlifPaymentResponse {
    success: boolean;
    paymentUrl: string;
    error?: string;
}

/** Notice for a payment (event "payment"). */
export interface AlifPaymentCallback {
    orderId: string;
    transactionId: string;
    status: AlifStatus;
    event?: string;
    token: string;
    amount?: number;
    account?: string;
    transaction_type?: string;
    info?: string;
}

/** Notice for a refund (event "cancel"). */
export interface AlifCancelCallback {
    terminal_id: string;
    transaction_id: string;
    status: 'canceled';
    event: 'cancel';
    token: string;
}

export interface AlifTransaction {
    orderId: string;
    transactionId: string;
    status: AlifStatus;
    amount: number;
}

// ─── Signing ────────────────────────────────────────────────────────────────

const hmac = (key: string, message: string) => crypto.createHmac('sha256', key).update(message).digest('hex');

/** Token over the given fields, concatenated in order. */
export function alifToken(...fields: string[]): string {
    return hmac(hmac(terminalId(), terminalPassword()), fields.join(''));
}

/** Alif amounts carry exactly two decimals. */
export const alifAmount = (somoni: number) => somoni.toFixed(2);

function sameToken(given: unknown, expected: string): boolean {
    if (typeof given !== 'string' || !/^[0-9a-f]{64}$/i.test(given)) return false;
    return crypto.timingSafeEqual(Buffer.from(given.toLowerCase()), Buffer.from(expected));
}

/**
 * Is this notice really from Alif? Payment notices sign orderId + status + transactionId,
 * refund notices terminal_id + transaction_id + status. Without a terminal, only the dev
 * simulator's unsigned notices pass, and never in production.
 */
export function verifyAlifCallback(body: AlifPaymentCallback | AlifCancelCallback): boolean {
    if (!isAlifConfigured()) return !isProduction();
    if (body.event === 'cancel') {
        const b = body as AlifCancelCallback;
        if (String(b.terminal_id) !== terminalId()) return false;
        return sameToken(b.token, alifToken(String(b.terminal_id), String(b.transaction_id), String(b.status)));
    }
    const b = body as AlifPaymentCallback;
    return sameToken(b.token, alifToken(String(b.orderId), String(b.status), String(b.transactionId)));
}

// ─── API ────────────────────────────────────────────────────────────────────

async function post(path: string, body: object, headers: Record<string, string> = {}, timeoutMs = 15_000): Promise<Response> {
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

/** Start a payment; returns the URL of Alif's payment form. */
export async function createAlifPayment(params: AlifPaymentRequest): Promise<AlifPaymentResponse> {
    if (!isAlifConfigured()) {
        // A missing terminal in production must not silently hand out a fake checkout.
        if (isProduction()) {
            console.error('[Alif] ALIF_TERMINAL_ID / ALIF_TERMINAL_PASSWORD are not set');
            return { success: false, paymentUrl: '', error: 'Alif is not configured' };
        }
        const query = new URLSearchParams({ orderId: params.orderId, amount: String(params.amount) });
        return { success: true, paymentUrl: `${appUrl()}/payment/dev-checkout?${query}` };
    }

    const key = terminalId();
    const amount = alifAmount(params.amount);
    const phone = params.phone?.replace(/\D/g, '');
    try {
        const res = await post('/v2/', {
            key,
            token: alifToken(key, params.orderId, amount, params.callbackUrl),
            order_id: params.orderId,
            amount,
            callback_url: params.callbackUrl,
            return_url: params.returnUrl,
            info: params.description,
            gate: gate(),
            ...(phone && /^992\d{9}$/.test(phone) ? { phone } : {}),
            ...(params.email ? { email: params.email } : {}),
        }, { gate: gate() });

        const data = await res.json().catch(() => ({}));
        if (res.status !== 200 || !data.url) {
            console.error('[Alif] Payment rejected:', res.status, data.message);
            return { success: false, paymentUrl: '', error: String(data.message ?? `Alif HTTP ${res.status}`) };
        }
        return { success: true, paymentUrl: data.url };
    } catch (error) {
        console.error('[Alif] Payment request failed:', error);
        return { success: false, paymentUrl: '', error: 'Alif is unreachable' };
    }
}

/**
 * The transaction for one of our orders, with its signature checked. Null when Alif has no
 * such transaction. Throws when Alif can't be reached or answers unsigned, so a caller acting
 * on a notice can answer non-200 and let Alif retry.
 */
export async function checkAlifTransaction(orderId: string): Promise<AlifTransaction | null> {
    const key = terminalId();
    const res = await post('/checktxn', { orderId, key, token: alifToken(key, orderId) }, {}, 10_000);
    if (res.status === 404) return null;
    const data = await res.json().catch(() => null);
    if (res.status !== 200 || !data) {
        if (res.status === 400 && data?.message === 'Не найдено') return null;
        throw new Error(`[Alif] checktxn ${res.status}: ${data?.message ?? 'no body'}`);
    }
    if (String(data.orderId) !== orderId
        || !sameToken(data.token, alifToken(String(data.orderId), String(data.status), String(data.transactionId)))) {
        throw new Error('[Alif] checktxn answered with an invalid signature');
    }
    return {
        orderId: String(data.orderId),
        transactionId: String(data.transactionId),
        status: data.status as AlifStatus,
        amount: Number(data.amount),
    };
}

/** Does Alif's amount (somoni, may be fractional) match ours (whole somoni)? */
export const sameAmount = (alif: number, ours: number) => Math.abs(alif - ours) < 0.005;

/** A unique order id for a new payment. */
export function generateOrderId(): string {
    const timestamp = Date.now().toString(36);
    const random = crypto.randomBytes(4).toString('hex');
    return `DST-${timestamp}-${random}`.toUpperCase();
}
