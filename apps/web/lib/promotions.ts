import type { Prisma, ProfilePromotion } from '@prisma/client';
import type { PromotionStatus } from '@dastiyor/types';
import { prisma } from '@/lib/prisma';
import { PLANS, type PlanId } from '@/lib/plans';
import { activePlan, periodStart } from '@/lib/response-allowance';
import { getCategories } from '@/lib/categories';

/**
 * Profile promotions bought with a paid plan's monthly credits
 * (PLANS[plan].promotionsPerMonth).
 *
 * - A promotion (category null) lifts the provider in the directory for 24 hours.
 * - A pin (category set, BUSINESS only) puts them first in that category's
 *   listing for 24 hours; at most PIN_SLOTS providers per category at once.
 *
 * Both spend one credit. Credits are counted per 30-day period from the
 * plan's start (periodStart in lib/response-allowance.ts) and do not carry
 * over. One promotion and one pin may run at the same time, never two of either.
 */

export const PROMOTION_MS = 24 * 60 * 60 * 1000;
export const PIN_SLOTS = 3;
const DAY_MS = 24 * 60 * 60 * 1000;

const SUB_SELECT = { plan: true, isActive: true, startDate: true, endDate: true } as const;
type SubFields = Prisma.SubscriptionGetPayload<{ select: typeof SUB_SELECT }>;

/** Error strings: Russian literals, translated by the clients (api-errors.ts / serverErrors.ts). */
export const PROMOTION_ERRORS = {
    providerOnly: 'Продвигать профиль могут только исполнители',
    planRequired: 'Продвижение профиля доступно на платных тарифах',
    businessOnly: 'Закрепление в категории доступно только на тарифе BUSINESS',
    unknownCategory: 'Неизвестная категория',
    categoryNotInProfile: 'Сначала добавьте эту категорию в свой профиль',
    promotionActive: 'Продвижение уже активно',
    pinActive: 'Закрепление уже активно',
    noCredits: 'Продвижения на этот период закончились',
    slotsFull: 'В этой категории уже закреплены 3 исполнителя',
} as const;

function periodEnd(sub: SubFields, plan: PlanId, start: Date): Date {
    const end = start.getTime() + PLANS[plan].durationDays * DAY_MS;
    return new Date(Math.min(end, sub.endDate.getTime()));
}

type Db = Pick<Prisma.TransactionClient, 'profilePromotion'>;

/** Active pins per category: how many and when the first one ends. */
async function pinSlots(db: Db, categories: string[], now: Date) {
    if (!categories.length) return [];
    const groups = await db.profilePromotion.groupBy({
        by: ['category'],
        where: { category: { in: categories }, endsAt: { gt: now } },
        _count: { _all: true },
        _min: { endsAt: true },
    });
    return categories.map(category => {
        const g = groups.find(x => x.category === category);
        const taken = g?._count._all ?? 0;
        return { category, taken, nextFreeAt: taken >= PIN_SLOTS && g?._min.endsAt ? g._min.endsAt.toISOString() : null };
    });
}

const iso = (d: Date) => d.toISOString();
const view = (p: ProfilePromotion) => ({ id: p.id, category: p.category, startsAt: iso(p.createdAt), endsAt: iso(p.endsAt) });

/**
 * What GET /api/promotions returns: credits this period, the running
 * promotion and pin, and (BUSINESS) pin availability in each of the
 * provider's categories that still exists in getCategories().
 */
export async function getPromotionStatus(
    userId: string,
    { categories = [], now = new Date() }: { categories?: string[]; now?: Date } = {},
): Promise<PromotionStatus> {
    const sub = await prisma.subscription.findUnique({ where: { userId }, select: SUB_SELECT });
    const plan = activePlan(sub, now);
    if (!plan || !sub) {
        return { plan: null, limit: 0, used: 0, remaining: 0, periodStart: null, periodEnd: null, promotion: null, pin: null, canPin: false, pinSlots: [] };
    }

    const start = periodStart(sub, now);
    const canPin = plan === 'business';
    const [used, running, slots] = await Promise.all([
        prisma.profilePromotion.count({ where: { userId, createdAt: { gte: start } } }),
        prisma.profilePromotion.findMany({ where: { userId, endsAt: { gt: now } }, orderBy: { endsAt: 'desc' } }),
        canPin ? pinSlots(prisma, categories, now) : Promise.resolve([]),
    ]);
    const limit = PLANS[plan].promotionsPerMonth;
    const promotion = running.find(p => p.category === null);
    const pin = running.find(p => p.category !== null);

    return {
        plan,
        limit,
        used,
        remaining: Math.max(0, limit - used),
        periodStart: iso(start),
        periodEnd: iso(periodEnd(sub, plan, start)),
        promotion: promotion ? view(promotion) : null,
        pin: pin ? view(pin) : null,
        canPin,
        pinSlots: slots,
    };
}

/** The provider's profile categories that still exist (admin may have removed one). */
export async function pinnableCategories(profileCategories: string[]): Promise<string[]> {
    const known = await getCategories();
    return profileCategories.filter(c => known.includes(c));
}

export type StartResult =
    | { ok: true; promotion: ReturnType<typeof view> }
    | { ok: false; status: number; error: string; code: string; nextFreeAt?: string };

const fail = (status: number, error: string, code: string, nextFreeAt?: string): StartResult =>
    ({ ok: false, status, error, code, ...(nextFreeAt && { nextFreeAt }) });

/**
 * Start a promotion (no category) or a pin (category). The caller has already
 * checked the role and that the category is one of getCategories() and the
 * provider's own.
 *
 * Runs under transaction-scoped advisory locks — one per provider, plus one
 * per category for pins, always taken in that order — so a double tap cannot
 * spend two credits and two providers cannot both take the third slot.
 */
export async function startPromotion(userId: string, category: string | null, now = new Date()): Promise<StartResult> {
    return prisma.$transaction(async tx => {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`promotion:user:${userId}`}))`;
        if (category) await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${`promotion:pin:${category}`}))`;

        const sub = await tx.subscription.findUnique({ where: { userId }, select: SUB_SELECT });
        const plan = activePlan(sub, now);
        if (!plan || !sub) return fail(403, PROMOTION_ERRORS.planRequired, 'PROMOTION_PLAN_REQUIRED');
        if (category && plan !== 'business') return fail(403, PROMOTION_ERRORS.businessOnly, 'PIN_BUSINESS_ONLY');

        const running = await tx.profilePromotion.findFirst({
            where: { userId, endsAt: { gt: now }, category: category ? { not: null } : null },
        });
        if (running) {
            return category
                ? fail(409, PROMOTION_ERRORS.pinActive, 'PIN_ACTIVE')
                : fail(409, PROMOTION_ERRORS.promotionActive, 'PROMOTION_ACTIVE');
        }

        const used = await tx.profilePromotion.count({ where: { userId, createdAt: { gte: periodStart(sub, now) } } });
        if (used >= PLANS[plan].promotionsPerMonth) return fail(409, PROMOTION_ERRORS.noCredits, 'PROMOTION_CREDITS_EXHAUSTED');

        if (category) {
            const [slot] = await pinSlots(tx, [category], now);
            if (slot.taken >= PIN_SLOTS) return fail(409, PROMOTION_ERRORS.slotsFull, 'PIN_SLOTS_FULL', slot.nextFreeAt ?? undefined);
        }

        const created = await tx.profilePromotion.create({
            data: { userId, category, createdAt: now, endsAt: new Date(now.getTime() + PROMOTION_MS) },
        });
        return { ok: true as const, promotion: view(created) };
    });
}
