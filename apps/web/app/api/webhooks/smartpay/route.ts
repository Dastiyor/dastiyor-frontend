import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyWebhookSignature, PLANS, isValidPlan } from '@/lib/payments';
import type { SmartPayWebhook } from '@/lib/payments';
import { sendPaymentReceiptEmail } from '@/lib/notifications/email';

/**
 * SmartPay payment webhook (configured in the SmartPay dashboard → Settings → Webhooks).
 *
 * SmartPay only notifies successful payments and retries for two days until it gets a
 * 200, so every outcome we have decided on answers 200. This is the authoritative
 * source — subscriptions are activated here, never on the return URL.
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
            include: { user: { select: { email: true, fullName: true, locale: true } } }
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

        // Idempotency: use atomic status transition to prevent double-processing
        // updateMany with status=PENDING guard ensures only one concurrent call wins
        const claimed = await prisma.payment.updateMany({
            where: { id: payment.id, status: 'PENDING' },
            data: { status: 'COMPLETED' },
        });

        if (claimed.count === 0) {
            // Already processed by a concurrent or prior call
            return NextResponse.json({ ok: true, message: 'Already processed' });
        }

        const transactionId = String(body.payment_id);
        // Update transaction metadata (status already set above)
        await prisma.payment.update({
            where: { id: payment.id },
            data: {
                transactionId,
                paymentMethod: body.bank ?? null,
            }
        });

        // Activate or extend subscription
        if (payment.plan && isValidPlan(payment.plan)) {
            const planConfig = PLANS[payment.plan];
            const now = new Date();

            const existingSub = await prisma.subscription.findUnique({
                where: { userId: payment.userId }
            });

            let endDate = new Date();
            if (existingSub?.isActive && new Date(existingSub.endDate) > now) {
                endDate = new Date(existingSub.endDate);
            }
            endDate.setDate(endDate.getDate() + planConfig.durationDays);

            if (existingSub) {
                await prisma.subscription.update({
                    where: { userId: payment.userId },
                    data: {
                        plan: payment.plan,
                        startDate: existingSub.isActive ? existingSub.startDate : now,
                        endDate,
                        isActive: true,
                    }
                });
            } else {
                await prisma.subscription.create({
                    data: {
                        userId: payment.userId,
                        plan: payment.plan,
                        startDate: now,
                        endDate,
                        isActive: true,
                    }
                });
            }

            // Create in-app notification
            await prisma.notification.create({
                data: {
                    userId: payment.userId,
                    type: 'SYSTEM',
                    title: 'Подписка активирована',
                    message: `Ваша подписка "${planConfig.nameRu}" успешно активирована на ${planConfig.durationDays} дней.`,
                    link: '/provider/subscription',
                }
            });
        }

        // Send receipt email (fire-and-forget)
        if (payment.user.email) {
            sendPaymentReceiptEmail(
                payment.user.email!,
                payment.user.fullName,
                payment.amount,
                payment.description,
                orderId,
                transactionId,
                payment.user.locale
            ).catch(err => console.error('Receipt email error:', err));
        }


        // SmartPay expects a 200 OK response
        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[SmartPay Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
