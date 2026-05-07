import webpush from 'web-push';
import { prisma } from '@/lib/prisma';

const VAPID_PUBLIC_KEY = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || '';
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || '';
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || 'mailto:admin@dastiyor.com';

if (VAPID_PUBLIC_KEY && VAPID_PRIVATE_KEY) {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
}

interface PushPayload {
    title: string;
    body: string;
    icon?: string;
    url?: string;
}

/**
 * Send a web push notification to all subscriptions for a given user.
 * Automatically removes expired/invalid subscriptions.
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

    const subscriptions = await prisma.pushSubscription.findMany({
        where: { userId },
    });

    if (subscriptions.length === 0) return;

    const pushPayload = JSON.stringify({
        title: payload.title,
        body: payload.body,
        icon: payload.icon || '/icon-192x192.png',
        data: { url: payload.url || '/' },
    });

    const expiredIds: string[] = [];

    await Promise.allSettled(
        subscriptions.map(async (sub) => {
            try {
                await webpush.sendNotification(
                    {
                        endpoint: sub.endpoint,
                        keys: { p256dh: sub.p256dh, auth: sub.auth },
                    },
                    pushPayload
                );
            } catch (err: any) {
                if (err.statusCode === 404 || err.statusCode === 410) {
                    expiredIds.push(sub.id);
                }
            }
        })
    );

    if (expiredIds.length > 0) {
        await prisma.pushSubscription.deleteMany({
            where: { id: { in: expiredIds } },
        }).catch(() => {});
    }
}
