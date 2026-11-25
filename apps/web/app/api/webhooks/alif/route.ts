import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    verifyAlifCallback, checkAlifTransaction, isAlifConfigured, sameAmount,
} from '@/lib/payments/alif';
import type { AlifPaymentCallback, AlifCancelCallback } from '@/lib/payments/alif';
import { completePayment, failPayment } from '@/lib/payments/complete';

/**
 * Alif acquiring notice (the callback_url sent with each payment).
 *
 * Alif counts a notice delivered only on exactly 200 and otherwise retries (5 times ~10 s
 * apart, then hourly, 15 in all), and may deliver the same notice twice. So every outcome
 * we have decided answers 200, and a temporary failure on our side answers 500 to be retried.
 *
 * The notice's signature covers order, status and transaction but not the amount, so a
 * payment is activated only after /checktxn confirms it is ok and for the right amount.
 */
export async function POST(request: Request) {
    let body: AlifPaymentCallback | AlifCancelCallback;
    try {
        body = await request.json();
    } catch {
        return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
    }

    if (!verifyAlifCallback(body)) {
        console.error('[Alif Callback] Invalid signature');
        return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
    }

    try {
        // A refund (cancel request completed on Alif's side). Recorded; the plan is left as is.
        if (body.event === 'cancel') {
            const transactionId = String((body as AlifCancelCallback).transaction_id);
            const done = await prisma.payment.updateMany({
                where: { transactionId, status: 'COMPLETED' },
                data: { status: 'CANCELLED' },
            });
            console.log('[Alif Callback] Refund recorded for transaction', transactionId, done.count);
            return NextResponse.json({ ok: true });
        }

        const notice = body as AlifPaymentCallback;
        const orderId = String(notice.orderId ?? '');
        const payment = await prisma.payment.findUnique({ where: { orderId } });
        if (!payment) {
            // Not ours, or deleted: nothing to retry for.
            console.error('[Alif Callback] Payment not found for order:', orderId);
            return NextResponse.json({ ok: false, message: 'Payment not found' });
        }

        if (notice.status === 'failed') {
            await failPayment(payment.id);
            return NextResponse.json({ ok: true });
        }
        if (notice.status !== 'ok') {
            return NextResponse.json({ ok: true, message: `Status ${notice.status} noted` });
        }

        // Confirm with Alif before activating. Without a terminal (dev simulator) the notice
        // itself is all there is.
        let transactionId = String(notice.transactionId);
        let amount = Number(notice.amount ?? payment.amount);
        if (isAlifConfigured()) {
            const txn = await checkAlifTransaction(orderId); // throws → 500 → Alif retries
            if (!txn || txn.status !== 'ok') {
                console.error('[Alif Callback] checktxn does not confirm order', orderId, txn?.status);
                return NextResponse.json({ ok: false, message: 'Not confirmed' });
            }
            transactionId = txn.transactionId;
            amount = txn.amount;
        }

        if (!sameAmount(amount, payment.amount)) {
            console.error('[Alif Callback] Amount mismatch for order:', orderId, amount, payment.amount);
            return NextResponse.json({ ok: false, message: 'Amount mismatch' });
        }

        const activated = await completePayment(payment.id, {
            transactionId,
            paymentMethod: notice.transaction_type || null,
        });
        return NextResponse.json({ ok: true, ...(activated ? {} : { message: 'Already processed' }) });
    } catch (error) {
        console.error('[Alif Callback] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
