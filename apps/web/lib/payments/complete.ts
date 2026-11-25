import { prisma } from '@/lib/prisma';
import { PLANS, normalizePlan } from '@/lib/plans';
import { sendPaymentReceiptEmail } from '@/lib/notifications/email';

/**
 * Mark a PENDING payment paid and activate (or extend) its plan, exactly once.
 *
 * Called from Alif's notice and from the result page's status check, which can race:
 * the PENDING → COMPLETED claim lets only the first caller through. Returns false when
 * the payment was already settled.
 */
export async function completePayment(
    paymentId: string,
    details: { transactionId: string; paymentMethod?: string | null },
): Promise<boolean> {
    const claimed = await prisma.payment.updateMany({
        where: { id: paymentId, status: 'PENDING' },
        data: { status: 'COMPLETED' },
    });
    if (claimed.count === 0) return false;

    const payment = await prisma.payment.update({
        where: { id: paymentId },
        data: { transactionId: details.transactionId, paymentMethod: details.paymentMethod ?? null },
        include: { user: { select: { email: true, fullName: true, locale: true } } },
    });

    // normalizePlan: an order started before the plan rename still activates its replacement.
    const plan = normalizePlan(payment.plan);
    if (plan) {
        const planConfig = PLANS[plan];
        const now = new Date();
        const existing = await prisma.subscription.findUnique({ where: { userId: payment.userId } });

        // A renewal bought before the end adds 30 days to the current end date.
        const endDate = existing?.isActive && existing.endDate > now ? new Date(existing.endDate) : new Date(now);
        endDate.setDate(endDate.getDate() + planConfig.durationDays);

        const data = {
            plan,
            startDate: existing?.isActive ? existing.startDate : now,
            endDate,
            isActive: true,
            source: 'web',
        };
        if (existing) {
            await prisma.subscription.update({ where: { userId: payment.userId }, data });
        } else {
            await prisma.subscription.create({ data: { userId: payment.userId, ...data } });
        }

        await prisma.notification.create({
            data: {
                userId: payment.userId,
                type: 'SYSTEM',
                title: 'Подписка активирована',
                message: `Ваша подписка "${planConfig.name}" успешно активирована на ${planConfig.durationDays} дней.`,
                link: '/provider/subscription',
            },
        });
    }

    if (payment.user.email) {
        sendPaymentReceiptEmail(
            payment.user.email,
            payment.user.fullName,
            payment.amount,
            payment.description,
            payment.orderId ?? payment.id,
            details.transactionId,
            payment.user.locale,
        ).catch(err => console.error('Receipt email error:', err));
    }
    return true;
}

/** A PENDING payment the payer did not complete. */
export async function failPayment(paymentId: string): Promise<void> {
    await prisma.payment.updateMany({ where: { id: paymentId, status: 'PENDING' }, data: { status: 'FAILED' } });
}
