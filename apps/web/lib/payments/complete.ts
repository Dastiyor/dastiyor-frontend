import { prisma } from '@/lib/prisma';
import { PLANS, normalizePlan } from '@/lib/plans';
import { sendPaymentReceiptEmail } from '@/lib/notifications/email';
import { getSmartPayInvoice } from './smartpay';
import { checkAlifTransaction } from './alif';

/**
 * Mark a PENDING payment (SmartPay or Alif) COMPLETED and activate (or extend) its plan.
 *
 * Shared by the provider notifications, /api/payments/status and the daily cron, all of which
 * confirm the payment with the provider first. Callers check the amount first.
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

/**
 * Settle a PENDING SmartPay payment from SmartPay's order-status API, for when the webhook
 * has not come: a Charged invoice for exactly the payment's amount completes it, a voided
 * one (expired or cancelled) fails it. Anything else — still open, SmartPay unreachable,
 * an amount that doesn't match — leaves it PENDING. Used by /api/payments/status while the
 * payer waits on the result page, and by the daily cron for payers who left.
 */
export async function reconcileSmartPayPayment(payment: {
    id: string;
    amount: number;
    smartpayOrderId: string;
    transactionId: string | null;
}): Promise<'COMPLETED' | 'FAILED' | 'PENDING'> {
    const invoice = await getSmartPayInvoice(payment.smartpayOrderId);
    if (invoice?.status === 'void') {
        await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED' } });
        return 'FAILED';
    }
    if (invoice?.status === 'Charged') {
        // Status amounts are dirams; our payment amounts are whole somoni.
        if (invoice.paidAmount !== payment.amount * 100) {
            console.error('[SmartPay] Amount mismatch for order:', payment.smartpayOrderId, invoice.paidAmount, payment.amount);
            return 'PENDING';
        }
        await completeSmartPayPayment(payment.id, {
            transactionId: invoice.invoiceUuid ?? payment.transactionId ?? payment.smartpayOrderId,
            paymentMethod: invoice.paymentMethod,
        });
        return 'COMPLETED';
    }
    return 'PENDING';
}

/**
 * Settle a PENDING Alif payment from Alif's signed /checktxn: `ok` for exactly the payment's
 * amount completes it, `failed` fails it, anything else (pending, unreachable, unsigned,
 * an amount that doesn't match) leaves it PENDING. `canceled` is a refund of a payment that
 * was `ok`, so it never arrives for a PENDING one.
 */
export async function reconcileAlifPayment(payment: {
    id: string;
    amount: number;
    smartpayOrderId: string;
}): Promise<'COMPLETED' | 'FAILED' | 'PENDING'> {
    const txn = await checkAlifTransaction(payment.smartpayOrderId);
    if (txn?.status === 'failed') {
        await prisma.payment.updateMany({ where: { id: payment.id, status: 'PENDING' }, data: { status: 'FAILED' } });
        return 'FAILED';
    }
    if (txn?.status === 'ok') {
        if (txn.amount !== payment.amount * 100) {
            console.error('[Alif] Amount mismatch for order:', payment.smartpayOrderId, txn.amount, payment.amount);
            return 'PENDING';
        }
        await completeSmartPayPayment(payment.id, { transactionId: `alif_${txn.transactionId}`, paymentMethod: txn.method });
        return 'COMPLETED';
    }
    return 'PENDING';
}

/** Settle a PENDING payment with whichever provider took it. */
export function reconcilePayment(payment: {
    id: string;
    amount: number;
    smartpayOrderId: string;
    transactionId: string | null;
    provider: string;
}): Promise<'COMPLETED' | 'FAILED' | 'PENDING'> {
    return payment.provider === 'alif' ? reconcileAlifPayment(payment) : reconcileSmartPayPayment(payment);
}
