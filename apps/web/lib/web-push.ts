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
            } catch (err) {
                const statusCode = (err as { statusCode?: number }).statusCode;
                if (statusCode === 404 || statusCode === 410) {
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

/** Expo accepts at most 100 messages per request. */
const EXPO_BATCH = 100;

export interface PushMessage {
    userId: string;
    payload: PushPayload;
}

/**
 * Send many users their own push, web and Expo, with one query per channel
 * instead of two per user. Used for fan-out (new-task alerts); single-user
 * callers keep using sendPushNotification. Never throws.
 */
export async function sendPushToMany(messages: PushMessage[]): Promise<void> {
    if (messages.length === 0) return;
    const userIds = Array.from(new Set(messages.map((m) => m.userId)));
    const byUser = new Map(messages.map((m) => [m.userId, m.payload]));

    await Promise.allSettled([
        sendWebPushToMany(userIds, byUser),
        sendExpoPushToMany(userIds, byUser),
    ]);
}

async function sendWebPushToMany(userIds: string[], byUser: Map<string, PushPayload>): Promise<void> {
    if (!VAPID_PUBLIC_KEY || !VAPID_PRIVATE_KEY) return;

    const subscriptions = await prisma.pushSubscription.findMany({ where: { userId: { in: userIds } } });
    if (subscriptions.length === 0) return;

    const expiredIds: string[] = [];
    await Promise.allSettled(subscriptions.map(async (sub) => {
        const payload = byUser.get(sub.userId)!;
        try {
            await webpush.sendNotification(
                { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
                JSON.stringify({
                    title: payload.title,
                    body: payload.body,
                    icon: payload.icon || '/icon-192x192.png',
                    data: { url: payload.url || '/' },
                }),
            );
        } catch (err) {
            const statusCode = (err as { statusCode?: number }).statusCode;
            if (statusCode === 404 || statusCode === 410) expiredIds.push(sub.id);
        }
    }));

    if (expiredIds.length > 0) {
        await prisma.pushSubscription.deleteMany({ where: { id: { in: expiredIds } } }).catch(() => {});
    }
}

async function sendExpoPushToMany(userIds: string[], byUser: Map<string, PushPayload>): Promise<void> {
    const devices = await prisma.deviceToken.findMany({ where: { userId: { in: userIds } } });
    if (devices.length === 0) return;

    const deadTokens: string[] = [];
    for (let i = 0; i < devices.length; i += EXPO_BATCH) {
        const chunk = devices.slice(i, i + EXPO_BATCH);
        const messages = chunk.map((d) => {
            const payload = byUser.get(d.userId)!;
            return { to: d.token, title: payload.title, body: payload.body, sound: 'default', data: { url: payload.url || '/' } };
        });
        let tickets: Array<{ status?: string; details?: { error?: string } }> = [];
        try {
            const res = await fetch(EXPO_PUSH_ENDPOINT, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    Accept: 'application/json',
                    'Accept-Encoding': 'gzip, deflate',
                    ...(process.env.EXPO_ACCESS_TOKEN ? { Authorization: `Bearer ${process.env.EXPO_ACCESS_TOKEN}` } : {}),
                },
                body: JSON.stringify(messages),
            });
            const json = await res.json().catch(() => null);
            tickets = Array.isArray(json?.data) ? json.data : [];
        } catch {
            continue; // transport error on this chunk; the others still go out
        }
        tickets.forEach((ticket, j) => {
            if (ticket?.status === 'error' && ticket.details?.error === 'DeviceNotRegistered') {
                deadTokens.push(chunk[j].token);
            }
        });
    }

    if (deadTokens.length > 0) {
        await prisma.deviceToken.deleteMany({ where: { token: { in: deadTokens } } }).catch(() => {});
    }
}
