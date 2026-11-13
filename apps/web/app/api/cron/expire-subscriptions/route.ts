import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLANS, normalizePlan } from '@/lib/plans';
import { notificationStrings } from '@/lib/notifications/strings';
import { sendPushNotification } from '@/lib/web-push';
import { reconcileSmartPayPayment } from '@/lib/payments/complete';

const DAY_MS = 24 * 60 * 60 * 1000;

// Called daily by Vercel Cron. Settles SmartPay payments whose webhook never came,
// deactivates subscriptions past their endDate (the provider is back on FREE),
// reminds web subscribers to renew, and cleans up expired VerificationCode and
// PasswordReset rows.
export async function GET(request: Request) {
    const cronSecret = process.env.CRON_SECRET;
    if (!cronSecret) {
        console.error('[cron] CRON_SECRET env var not set — endpoint disabled');
        return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }

    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${cronSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    // First, so a plan paid for yesterday is active before expiry and reminders run.
    const settled = await settlePendingPayments(now);

    const [{ count: expired }, { count: deletedCodes }, { count: deletedResets }] =
        await Promise.all([
            prisma.subscription.updateMany({
                where: { isActive: true, endDate: { lt: now } },
                data: { isActive: false },
            }),
            prisma.verificationCode.deleteMany({
                where: { expiresAt: { lt: now } },
            }),
            prisma.passwordReset.deleteMany({
                where: { expiresAt: { lt: now } },
            }),
        ]);

    const reminded = await remindToRenew(now);

    console.log(
        `[cron] at=${now.toISOString()} settled_completed=${settled.completed} settled_failed=${settled.failed} expired_subs=${expired} renew_reminders=${reminded} deleted_otps=${deletedCodes} deleted_resets=${deletedResets}`
    );

    return NextResponse.json({ settled, expired, reminded, deletedCodes, deletedResets, at: now.toISOString() });
}

// SmartPay retries a webhook for two days; past that a PENDING payment won't move by itself.
const SETTLE_WINDOW_MS = 3 * DAY_MS;
// The invoice lives 30 minutes; leave younger payments to the payer and the webhook.
const SETTLE_MIN_AGE_MS = 60 * 60 * 1000;

/**
 * SmartPay payments still PENDING a day later: the payer paid and left before the result
 * page could check, and no webhook came. Ask SmartPay about each one, one at a time.
 */
async function settlePendingPayments(now: Date): Promise<{ completed: number; failed: number }> {
    const pending = await prisma.payment.findMany({
        where: {
            status: 'PENDING',
            smartpayOrderId: { not: null },
            createdAt: { gt: new Date(now.getTime() - SETTLE_WINDOW_MS), lt: new Date(now.getTime() - SETTLE_MIN_AGE_MS) },
        },
        select: { id: true, amount: true, smartpayOrderId: true, transactionId: true },
        take: 200,
    });

    const result = { completed: 0, failed: 0 };
    for (const payment of pending) {
        try {
            const outcome = await reconcileSmartPayPayment({ ...payment, smartpayOrderId: payment.smartpayOrderId! });
            if (outcome === 'COMPLETED') result.completed++;
            if (outcome === 'FAILED') result.failed++;
        } catch (error) {
            console.error('[cron] Could not settle payment:', payment.id, error);
        }
    }
    return result;
}

/**
 * Web (SmartPay) plans are one payment for 30 days and do not renew by
 * themselves, so their owners get one reminder when 2-3 days are left. The
 * cron runs once a day, so each subscription falls in the window exactly once.
 * Store plans renew through Apple/Google and are left alone.
 */
async function remindToRenew(now: Date): Promise<number> {
    const due = await prisma.subscription.findMany({
        where: {
            isActive: true,
            source: 'web',
            endDate: { gt: new Date(now.getTime() + 2 * DAY_MS), lte: new Date(now.getTime() + 3 * DAY_MS) },
        },
        select: { userId: true, plan: true, endDate: true, user: { select: { locale: true } } },
    });

    await Promise.allSettled(due.map(async (sub) => {
        const plan = normalizePlan(sub.plan);
        const strings = notificationStrings(sub.user.locale);
        const name = plan ? PLANS[plan].name : sub.plan;
        const date = sub.endDate.toLocaleDateString('ru-RU', { timeZone: 'Asia/Dushanbe' });
        const title = strings.renewTitle;
        const message = strings.renewBody(name, date);
        await prisma.notification.create({
            data: { userId: sub.userId, type: 'SYSTEM', title, message, link: '/subscription' },
        });
        await sendPushNotification(sub.userId, { title, body: message, url: '/subscription' });
    }));

    return due.length;
}
