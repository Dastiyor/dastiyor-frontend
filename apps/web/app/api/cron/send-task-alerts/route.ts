import { NextResponse } from 'next/server';
import { drainTaskAlerts } from '@/lib/task-alerts';

// Sends the queued new-task alerts for PRO providers (15 minutes after the
// task was posted). Called every 5 minutes by .github/workflows/task-alerts.yml
// while the Vercel team is on Hobby (daily crons only); on Vercel Pro it moves
// to a vercel.json cron on this same path. Safe to call any number of times.
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
    try {
        const result = await drainTaskAlerts(now);
        console.log(
            `[cron] task-alerts at=${now.toISOString()} claimed=${result.claimed} sent=${result.sent} skipped=${result.skipped} failed=${result.failed} expired=${result.expired} pruned=${result.pruned}`
        );
        return NextResponse.json({ ...result, at: now.toISOString() });
    } catch (error) {
        console.error('[cron] task-alerts failed:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
