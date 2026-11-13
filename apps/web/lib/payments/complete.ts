import { prisma } from '@/lib/prisma';
import { PLANS, normalizePlan } from '@/lib/plans';
import { sendPaymentReceiptEmail } from '@/lib/notifications/email';

/**
 * Mark a PENDING SmartPay payment COMPLETED and activate (or extend) its plan.
 *
 * Shared by the webhook and by /api/payments/status, which falls back to SmartPay's
 * order-status API when no webhook has arrived. Callers check the amount first.
 * The PENDING → COMPLETED claim is atomic, so when both paths race only one activates.
 */
export async function completeSmartPayPayment(
    paymentId: string,
    details: { transactionId: string; paymentMethod: string | null },
): Promise<'completed' | 'already_processed'> {
    const claimed = await prisma.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: { status: 'COMPLETED' },
    });
    if (claimed.count === 0) return 'already_processed';

    const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: { transactionId: details.transactionId, paymentMethod: details.paymentMethod },
        include: { user: { select: { email: true, fullName: true, locale: true } } },
    });

    // normalizePlan: an order started before the plan rename still activates its replacement.
    const plan = normalizePlan(payment.plan);
    if (plan) {
        const planConfig = PLANS[plan];
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
                    plan,
                    startDate: existingSub.isActive ? existingSub.startDate : now,
                    endDate,
                    isActive: true,
                    source: 'web',
                }
            });
        } else {
            await prisma.subscription.create({
                data: {
                    userId: payment.userId,
                    plan,
                    startDate: now,
                    endDate,
                    isActive: true,
                    source: 'web',
                }
            });
        }

        await prisma.notification.create({
            data: {
                userId: payment.userId,
                type: 'SYSTEM',
                title: 'Подписка активирована',
                message: `Ваша подписка "${planConfig.name}" успешно активирована на ${planConfig.durationDays} дней.`,
                link: '/provider/subscription',
            }
        });
    }

    // Receipt email, fire-and-forget
    if (payment.user.email) {
        sendPaymentReceiptEmail(
            payment.user.email,
            payment.user.fullName,
            payment.amount,
            payment.description,
            payment.smartpayOrderId ?? '',
            details.transactionId,
            payment.user.locale
        ).catch(err => console.error('Receipt email error:', err));
    }

    return 'completed';
}
