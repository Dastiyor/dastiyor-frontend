import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLANS, normalizePlan } from '@/lib/plans';
import { notificationStrings } from '@/lib/notifications/strings';
import { sendPushNotification } from '@/lib/web-push';

const DAY_MS = 24 * 60 * 60 * 1000;

// Called daily by Vercel Cron. Deactivates subscriptions past their endDate
// (the provider is back on FREE), reminds web subscribers to renew, and
// cleans up expired VerificationCode and PasswordReset rows.
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
        `[cron] at=${now.toISOString()} expired_subs=${expired} renew_reminders=${reminded} deleted_otps=${deletedCodes} deleted_resets=${deletedResets}`
    );

    return NextResponse.json({ expired, reminded, deletedCodes, deletedResets, at: now.toISOString() });
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
