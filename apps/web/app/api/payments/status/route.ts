import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLANS, normalizePlan, getSmartPayInvoice } from '@/lib/payments';
import { completeSmartPayPayment } from '@/lib/payments/complete';
import { requireAuth } from '@/lib/require-auth';

// GET - Check payment status by orderId
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
            where: { smartpayOrderId: orderId }
        });

        if (!payment) {
            return NextResponse.json({ error: 'Платёж не найден' }, { status: 404 });
        }

        // Ensure user can only check their own payments
        if (payment.userId !== payload.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // The webhook normally settles a payment. When it hasn't (SmartPay down, a delivery
        // lost), ask SmartPay directly: a paid invoice for the exact amount activates the
        // plan, a voided one (expired or cancelled) fails the payment.
        let status = payment.status;
        if (status === 'PENDING') {
            const invoice = await getSmartPayInvoice(orderId);
            if (invoice?.status === 'void') {
                await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED' } });
                status = 'FAILED';
            } else if (invoice?.status === 'Charged') {
                // Status amounts are dirams; our payment amounts are whole somoni.
                if (invoice.paidAmount === payment.amount * 100) {
                    await completeSmartPayPayment(payment.id, {
                        transactionId: invoice.invoiceUuid ?? payment.transactionId ?? orderId,
                        paymentMethod: invoice.paymentMethod,
                    });
                    status = 'COMPLETED';
                } else {
                    console.error('[Payment Status] Amount mismatch for order:', orderId, invoice.paidAmount, payment.amount);
                }
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
