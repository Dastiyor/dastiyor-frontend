import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature } from '@/lib/payments';
import { completeSmartPayPayment } from '@/lib/payments/complete';
import type { SmartPayWebhook } from '@/lib/payments';

/**
 * SmartPay payment webhook (configured in the SmartPay dashboard → Settings → Webhooks).
 *
 * SmartPay only notifies successful payments and retries for two days until it gets a
 * 200, so every outcome we have decided on answers 200. Activation happens here, or in
 * /api/payments/status when SmartPay's own status API reports the invoice paid and no
 * webhook has come — never on the return URL's say-so.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json() as SmartPayWebhook;
        const orderId = String(body.order_id ?? '');

        if (!verifyWebhookSignature(body)) {
            console.error('[SmartPay Webhook] Invalid signature for order:', orderId);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // Find the payment record by our order ID
        const payment = await prisma.payment.findUnique({
            where: { smartpayOrderId: orderId },
        });

        if (!payment) {
            console.error('[SmartPay Webhook] Payment not found for order:', orderId);
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // Webhook amounts are dirams; our payment amounts are whole somoni.
        if (Number(body.amount) !== payment.amount * 100) {
            console.error('[SmartPay Webhook] Amount mismatch for order:', orderId, body.amount, payment.amount);
            return NextResponse.json({ ok: false, message: 'Amount mismatch' });
        }

        const outcome = await completeSmartPayPayment(payment.id, {
            transactionId: String(body.payment_id),
            paymentMethod: body.bank ?? null,
        });
        if (outcome === 'already_processed') {
            // Already processed by a concurrent or prior call (or the status fallback)
            return NextResponse.json({ ok: true, message: 'Already processed' });
        }

        // SmartPay expects a 200 OK response
        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[SmartPay Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
