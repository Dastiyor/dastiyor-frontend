import type { Subscription } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { FREE_RESPONSES_PER_MONTH, PLANS, normalizePlan, type PlanId } from '@/lib/plans';

const DAY_MS = 24 * 60 * 60 * 1000;
/** Tajikistan is UTC+5 all year (no DST), so a FREE month starts at 19:00 UTC the day before the 1st. */
const DUSHANBE_OFFSET_MS = 5 * 60 * 60 * 1000;

export interface ResponseAllowance {
    /** null = FREE */
    plan: PlanId | null;
    /** null = unlimited */
    limit: number | null;
    used: number;
    /** Responses from this moment on count against the limit. */
    periodStart: Date;
}

type SubFields = Pick<Subscription, 'plan' | 'isActive' | 'startDate' | 'endDate'>;

/** The plan a subscription row grants right now, or null for FREE. */
export function activePlan(sub: SubFields | null, now = new Date()): PlanId | null {
    if (!sub?.isActive || sub.endDate <= now) return null;
    return normalizePlan(sub.plan);
}

/**
 * Where the current month starts.
 * - Paid: 30-day periods counted from the subscription start, so a renewal
 *   that extends an active plan still resets the count every 30 days.
 * - FREE: the calendar month in Dushanbe, or the moment the last paid plan
 *   ended if that was later this month, so responses sent on a paid plan
 *   don't eat the FREE allowance after it expires.
 */
export function periodStart(sub: SubFields | null, now = new Date()): Date {
    if (activePlan(sub, now)) {
        const start = sub!.startDate.getTime();
        const length = PLANS[activePlan(sub, now)!].durationDays * DAY_MS;
        return new Date(start + Math.floor((now.getTime() - start) / length) * length);
    }
    const local = new Date(now.getTime() + DUSHANBE_OFFSET_MS);
    const monthStart = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1) - DUSHANBE_OFFSET_MS);
    const paidEnd = sub && sub.endDate <= now ? sub.endDate : null;
    return paidEnd && paidEnd > monthStart ? paidEnd : monthStart;
}

/**
 * How many responses the provider has sent this month and may send.
 *
 * ponytail: count-then-create, so two simultaneous responses at the limit can
 * both land (one over). The responses rate limit keeps that rare; move the
 * count into a transaction with a lock if it matters.
 */
export async function getResponseAllowance(userId: string, now = new Date()): Promise<ResponseAllowance> {
    const sub = await prisma.subscription.findUnique({
        where: { userId },
        select: { plan: true, isActive: true, startDate: true, endDate: true },
    });
    const plan = activePlan(sub, now);
    const start = periodStart(sub, now);
    const used = await prisma.response.count({ where: { userId, createdAt: { gte: start } } });
    return {
        plan,
        limit: plan ? PLANS[plan].responsesPerMonth : FREE_RESPONSES_PER_MONTH,
        used,
        periodStart: start,
    };
}

export function canRespond(a: ResponseAllowance): boolean {
    return a.limit === null || a.used < a.limit;
}
