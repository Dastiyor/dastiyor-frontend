import type { Subscription } from '@prisma/client';
import { normalizePlan } from '@/lib/plans';

const DAY_MS = 24 * 60 * 60 * 1000;

/** The subscription as GET /api/subscription and POST /api/subscription/sync return it. */
export function subscriptionView(subscription: Subscription | null) {
    if (!subscription) return null;
    const isActive = subscription.isActive && new Date(subscription.endDate) > new Date();
    return {
        ...subscription,
        plan: normalizePlan(subscription.plan) ?? subscription.plan,
        isCurrentlyActive: isActive,
        daysRemaining: isActive ? Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / DAY_MS) : 0,
    };
}
