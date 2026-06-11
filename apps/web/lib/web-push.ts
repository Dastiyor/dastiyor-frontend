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
 * Send a push notification to a user across ALL channels:
 *  - Web push (VAPID) for browser subscriptions
 *  - Expo push for native iOS/Android device tokens
 *
 * Both are fire-and-forget and independently guarded, so a misconfigured or
 * empty channel never blocks the other. Backward compatible: existing callers
 * that only relied on web push keep working unchanged.
 */
export async function sendPushNotification(userId: string, payload: PushPayload): Promise<void> {
    await Promise.allSettled([
        sendWebPush(userId, payload),
        sendExpoPush(userId, payload),
    ]);
}

async function sendWebPush(userId: string, payload: PushPayload): Promise<void> {
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

const EXPO_PUSH_ENDPOINT = 'https://exp.host/--/api/v2/push/send';

/**
 * Send an Expo push notification to all native device tokens for a user.
 * Prunes tokens Expo reports as DeviceNotRegistered.
 */
export async function sendExpoPush(userId: string, payload: PushPayload): Promise<void> {
    const devices = await prisma.deviceToken.findMany({ where: { userId } });
    if (devices.length === 0) return;

    const messages = devices.map((d) => ({
        to: d.token,
        title: payload.title,
        body: payload.body,
        sound: 'default',
        data: { url: payload.url || '/' },
    }));

    let tickets: Array<{ status?: string; details?: { error?: string } }> = [];
    try {
        const res = await fetch(EXPO_PUSH_ENDPOINT, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Accept: 'application/json',
                'Accept-Encoding': 'gzip, deflate',
                ...(process.env.EXPO_ACCESS_TOKEN
                    ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` }
                    : {}),
            },
            body: JSON.stringify(messages),
        });
        const json = await res.json().catch(() => null);
        tickets = Array.isArray(json?.data) ? json.data : [];
    } catch {
        return; // network/transport error — non-blocking
    }

    // Prune tokens Expo says are dead.
    const deadTokens: string[] = [];
    tickets.forEach((ticket, i) => {
        if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
            deadTokens.push(devices[i].token);
        }
    });
    if (deadTokens.length > 0) {
        await prisma.deviceToken
            .deleteMany({ where: { token: { in: deadTokens } } })
            .catch(() => {});
    }
}
