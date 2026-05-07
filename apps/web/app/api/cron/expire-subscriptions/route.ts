import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Called daily by Vercel Cron. Deactivates subscriptions past their endDate.
export async function GET(request: Request) {
    // Verify the request is from Vercel Cron
    const authHeader = request.headers.get('authorization');
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const now = new Date();

    const { count } = await prisma.subscription.updateMany({
        where: {
            isActive: true,
            endDate: { lt: now },
        },
        data: { isActive: false },
    });

    console.log(`[cron] Expired ${count} subscription(s) at ${now.toISOString()}`);

    return NextResponse.json({ expired: count, at: now.toISOString() });
}
