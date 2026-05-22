import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyCallbackSignature, PLANS, isValidPlan } from '@/lib/payments';
import type { SmartPayCallbackData } from '@/lib/payments';
import { sendPaymentReceiptEmail } from '@/lib/notifications/email';

/**
 * SmartPay Webhook Handler
 *
 * Called by SmartPay server-to-server after a payment is processed.
 * This is the authoritative source of payment status — we activate
 * or fail subscriptions here, NOT on the redirect URL.
 */
export async function POST(request: Request) {
    try {
        const body = await request.json();

        const callbackData: SmartPayCallbackData = {
            transactionId: body.transaction_id || body.transactionId,
            orderId: body.order_id || body.orderId,
            amount: Number(body.amount),
            currency: body.currency || 'TJS',
            status: body.status,
            paymentMethod: body.payment_method || body.paymentMethod,
            signature: body.signature || '',
        };

        // Verify signature to ensure authenticity
        if (!verifyCallbackSignature(callbackData)) {
            console.error('[SmartPay Webhook] Invalid signature for order:', callbackData.orderId);
            return NextResponse.json({ error: 'Invalid signature' }, { status: 403 });
        }

        // Find the payment record by our order ID
        const payment = await prisma.payment.findUnique({
            where: { smartpayOrderId: callbackData.orderId },
            include: { user: { select: { email: true, fullName: true } } }
        });

        if (!payment) {
            console.error('[SmartPay Webhook] Payment not found for order:', callbackData.orderId);
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // Idempotency: use atomic status transition to prevent double-processing
        // updateMany with status=PENDING guard ensures only one concurrent call wins
        const claimed = await prisma.payment.updateMany({
            where: { id: payment.id, status: 'PENDING' },
            data: { status: callbackData.status === 'success' ? 'COMPLETED' : callbackData.status === 'cancelled' ? 'CANCELLED' : 'FAILED' },
        });

        if (claimed.count === 0) {
            // Already processed by a concurrent or prior call
            return NextResponse.json({ ok: true, message: 'Already processed' });
        }

        if (callbackData.status === 'success') {
            // ── Payment Successful ──────────────────────────────────────

            // Update transaction metadata (status already set above)
            await prisma.payment.update({
                where: { id: payment.id },
                data: {
                    transactionId: callbackData.transactionId,
                    paymentMethod: callbackData.paymentMethod,
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
                    callbackData.orderId,
                    callbackData.transactionId
                ).catch(err => console.error('Receipt email error:', err));
            }

        } else {
            // ── Payment Failed or Cancelled ─────────────────────────────
            // Status already updated atomically above; just store transaction ID.
            if (callbackData.transactionId) {
                await prisma.payment.update({
                    where: { id: payment.id },
                    data: { transactionId: callbackData.transactionId },
                });
            }
        }

        // SmartPay expects a 200 OK response
        return NextResponse.json({ ok: true });

    } catch (error) {
        console.error('[SmartPay Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
