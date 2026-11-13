import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyAlifStatusToken } from '@/lib/payments/alif';
import { reconcileAlifPayment } from '@/lib/payments/complete';

/**
 * Alif payment notifications (the callback_url sent with each payment).
 *
 * Alif retries until it gets exactly 200 (5 × ~10 s, then hourly, 15 tries), so every outcome
 * we have decided on answers 200. A notification is signed over orderId + status +
 * transactionId only — not the amount — so it is only a trigger: the payment is settled
 * from Alif's signed /checktxn, the same path the result page and the daily cron use.
 */
export async function POST(request: Request) {
    let body: Record<string, unknown>;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Bad request' }, { status: 400 });
    }

    // A refund notification ({ terminal_id, transaction_id, status: 'canceled', event: 'cancel' })
    // has no order id. Refunds are issued by hand in Alif's dashboard; acknowledge and log it.
    if (body.event === 'cancel' || !body.orderId) {
        console.warn('[Alif] Refund or unrecognised notification:', JSON.stringify({ event: body.event, status: body.status, transaction_id: body.transaction_id }));
        return NextResponse.json({ ok: true });
    }

    const orderId = String(body.orderId);
    const status = String(body.status ?? '');
    const transactionId = String(body.transactionId ?? '');

    if (!verifyAlifStatusToken(orderId, status, transactionId, body.token)) {
        console.error('[Alif] Invalid signature for order:', orderId);
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    try {
        const payment = await prisma.payment.findUnique({
            where: { smartpayOrderId: orderId },
            select: { id: true, amount: true, status: true, provider: true },
        });
        if (!payment || payment.provider !== 'alif') {
            console.error('[Alif] Payment not found for order:', orderId);
            return NextResponse.json({ ok: false, message: 'Payment not found' });
        }
        if (payment.status !== 'PENDING') {
            return NextResponse.json({ ok: true, message: 'Already processed' });
        }

        const outcome = await reconcileAlifPayment({ id: payment.id, amount: payment.amount, smartpayOrderId: orderId });
        return NextResponse.json({ ok: true, status: outcome });
    } catch (error) {
        // Not 200, so Alif tries again.
        console.error('[Alif] Notification error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
