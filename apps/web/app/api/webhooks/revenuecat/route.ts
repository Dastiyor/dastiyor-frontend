import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { syncStoreSubscription } from '@/lib/payments/revenuecat';

const sameSecret = (a: string, b: string) =>
    a.length === b.length && crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));

/**
 * RevenueCat webhook (RevenueCat dashboard → Integrations → Webhooks, with an
 * Authorization value equal to REVENUECAT_WEBHOOK_AUTH). Every event just
 * re-syncs the affected users from RevenueCat, so event types we don't know
 * and duplicate deliveries are fine. A non-200 makes RevenueCat retry.
 */
export async function POST(request: Request) {
    const secret = process.env.REVENUECAT_WEBHOOK_AUTH;
    if (!secret) {
        console.error('[RevenueCat Webhook] REVENUECAT_WEBHOOK_AUTH is not set');
        return NextResponse.json({ error: 'Not configured' }, { status: 503 });
    }
    if (!sameSecret(request.headers.get('authorization') ?? '', secret)) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { event } = await request.json();
        const ids: string[] = [event?.app_user_id, ...(event?.transferred_to ?? []), ...(event?.transferred_from ?? [])]
            .filter((id): id is string => typeof id === 'string' && !id.startsWith('$RCAnonymousID'));

        for (const id of new Set(ids)) {
            const user = await prisma.user.findUnique({ where: { id }, select: { id: true } });
            if (user) await syncStoreSubscription(id);
        }
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[RevenueCat Webhook] Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
