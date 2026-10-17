/**
 * App Store / Google Play subscriptions, through RevenueCat.
 *
 * The app's RevenueCat user id is our User.id. Entitlement ids in RevenueCat are
 * our plan ids (basic, standard, premium). Rather than interpret each webhook
 * event, we re-read the subscriber from RevenueCat and mirror it into our
 * Subscription row (RevenueCat's own recommendation), so duplicates and
 * out-of-order events are harmless.
 *
 * ponytail: no Payment rows for store purchases — store amounts are in the
 * store's currency, net of commission. Store revenue is read in RevenueCat (or
 * its PostHog integration); add rows here if accounting needs them in our DB.
 */

import { prisma } from '@/lib/prisma';
import type { PlanId } from './index';

const API = 'https://api.revenuecat.com/v1';
const RANK: PlanId[] = ['premium', 'standard', 'basic'];

interface Entitlement {
    expires_date: string | null;
    grace_period_expires_date?: string | null;
}

/** The highest active store entitlement, or null. Throws when RevenueCat can't be read. */
export async function getStoreEntitlement(userId: string): Promise<{ plan: PlanId; expiresAt: Date } | null> {
    const key = process.env.REVENUECAT_SECRET_KEY;
    if (!key) return null;

    const res = await fetch(`${API}/subscribers/${encodeURIComponent(userId)}`, {
        headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
    });
    if (!res.ok) throw new Error(`RevenueCat ${res.status}`);
    const entitlements: Record<string, Entitlement> = (await res.json()).subscriber?.entitlements ?? {};

    const now = Date.now();
    for (const plan of RANK) {
        const e = entitlements[plan];
        // Our products are subscriptions; a null expiry (lifetime grant) isn't one of ours.
        const until = e?.grace_period_expires_date ?? e?.expires_date;
        if (until && new Date(until).getTime() > now) return { plan, expiresAt: new Date(until) };
    }
    return null;
}

/**
 * Mirror the user's store subscription into Subscription without ever shortening
 * a longer web (SmartPay) subscription, and deactivate a store one that lapsed.
 */
export async function syncStoreSubscription(userId: string): Promise<void> {
    const [entitlement, existing] = await Promise.all([
        getStoreEntitlement(userId),
        prisma.subscription.findUnique({ where: { userId } }),
    ]);
    const now = new Date();

    if (!entitlement) {
        if (existing?.source === 'store' && existing.isActive) {
            await prisma.subscription.update({ where: { userId }, data: { isActive: false } });
        }
        return;
    }

    const data = { plan: entitlement.plan, endDate: entitlement.expiresAt, isActive: true, source: 'store' };
    if (!existing) {
        await prisma.subscription.create({ data: { userId, startDate: now, ...data } });
        return;
    }

    const existingValid = existing.isActive && existing.endDate > now;
    if (existingValid && existing.source === 'web' && existing.endDate > entitlement.expiresAt) return;

    await prisma.subscription.update({
        where: { userId },
        data: { ...data, ...(existingValid ? {} : { startDate: now }) },
    });
}
