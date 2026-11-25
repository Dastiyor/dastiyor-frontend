import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
    PLANS, normalizePlan, isAlifConfigured, checkAlifTransaction, sameAmount, completePayment, failPayment,
} from '@/lib/payments';
import { requireAuth } from '@/lib/require-auth';

// GET - Check payment status by orderId (the result page polls this)
export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ error: 'Не указан orderId' }, { status: 400 });
        }

        const payment = await prisma.payment.findUnique({
            where: { orderId }
        });

        if (!payment) {
            return NextResponse.json({ error: 'Платёж не найден' }, { status: 404 });
        }

        // Ensure user can only check their own payments
        if (payment.userId !== payload.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Still pending: ask Alif directly. The notice normally settles it first, but a lost
        // or late notice must not leave a paid order pending. completePayment() activates once,
        // whichever of the two gets there first.
        let status = payment.status;
        if (status === 'PENDING' && isAlifConfigured()) {
            try {
                const txn = await checkAlifTransaction(orderId);
                if (txn?.status === 'ok' && sameAmount(txn.amount, payment.amount)) {
                    await completePayment(payment.id, { transactionId: txn.transactionId });
                    status = 'COMPLETED';
                } else if (txn?.status === 'failed') {
                    await failPayment(payment.id);
                    status = 'FAILED';
                }
            } catch (error) {
                // Alif unreachable: report what we know; the page polls again.
                console.error('[Payment Status] checktxn failed:', error);
            }
        }

        const plan = normalizePlan(payment.plan);
        const planName = plan ? PLANS[plan].name : null;

        return NextResponse.json({
            status,
            planName,
            amount: payment.amount,
            currency: payment.currency,
        });

    } catch (error) {
        console.error('Payment Status Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
