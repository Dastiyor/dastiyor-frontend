import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Called daily by Vercel Cron. Deactivates subscriptions past their endDate.
// Also cleans up expired VerificationCode and PasswordReset rows.
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

    console.log(
        `[cron] at=${now.toISOString()} expired_subs=${expired} deleted_otps=${deletedCodes} deleted_resets=${deletedResets}`
    );

    return NextResponse.json({ expired, deletedCodes, deletedResets, at: now.toISOString() });
}
