import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { syncStoreSubscription } from '@/lib/payments/revenuecat';
import { subscriptionView } from '@/lib/payments/subscription-view';

/** POST - re-read the caller's App Store / Google Play subscription right after a purchase or restore. */
export async function POST(request: Request) {
    const payload = await requireAuth(request);
    if (!payload || !payload.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const userId = payload.id as string;

    try {
        await syncStoreSubscription(userId);
    } catch (error) {
        console.error('Store Subscription Sync Error:', error);
        return NextResponse.json({ error: 'Не удалось проверить покупку. Попробуйте позже.' }, { status: 502 });
    }

    const subscription = await prisma.subscription.findUnique({ where: { userId } });
    return NextResponse.json({ subscription: subscriptionView(subscription) });
}
