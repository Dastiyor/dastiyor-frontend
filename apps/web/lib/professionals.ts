import { Prisma } from '@prisma/client';
import type { PaginatedResult, ProfessionalCard, ProfessionalSort, PublicProfile, SubscriptionTier } from '@dastiyor/types';
import { normalizePlan } from '@/lib/plans';
import { prisma } from '@/lib/prisma';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';

export interface ProfessionalSearch {
    q?: string;
    category?: string;
    city?: string;
    sort?: ProfessionalSort;
    page?: number;
    limit?: number;
}

const SORTS: ProfessionalSort[] = ['rating', 'reviews', 'completed', 'newest'];
/** Plans can be live in the app alone, and buyers still get their badge and ranking. */
const tiersLive = () => SUBSCRIPTIONS_ENABLED || process.env.MOBILE_PURCHASE_ENABLED === 'true';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

// Built per call, not at module load: Prisma.sql throws when the module is
// merely imported in a browser-like environment (jsdom tests).
function orderFor(sort: ProfessionalSort): Prisma.Sql {
    switch (sort) {
        case 'reviews': return Prisma.sql`"reviewCount" DESC`;
        case 'completed': return Prisma.sql`"completedCount" DESC`;
        case 'newest': return Prisma.sql`u."createdAt" DESC`;
        default: return Prisma.sql`"avgRating" DESC NULLS LAST, "reviewCount" DESC`;
    }
}

/** Read and clamp the query string of GET /api/professionals and the /professionals page. */
export function parseSearchParams(params: URLSearchParams): Required<Pick<ProfessionalSearch, 'sort' | 'page' | 'limit'>> & ProfessionalSearch {
    const text = (key: string, max = 100) => params.get(key)?.trim().slice(0, max) || undefined;
    const int = (key: string, fallback: number) => {
        const n = parseInt(params.get(key) ?? '', 10);
        return Number.isFinite(n) ? n : fallback;
    };
    const sort = params.get('sort') as ProfessionalSort;
    return {
        q: text('q'),
        category: text('category'),
        city: text('city'),
        sort: SORTS.includes(sort) ? sort : 'rating',
        page: Math.max(1, int('page', 1)),
        limit: Math.min(MAX_LIMIT, Math.max(1, int('limit', DEFAULT_LIMIT))),
    };
}

/**
 * Provider search: text, category and city filters, sorting and paging, with
 * rating and counts computed in Postgres so sorting covers every provider,
 * not one page. While plans are live, providers pinned in the searched
 * category rank first, then providers with a running promotion, then paid
 * tiers (lib/promotions.ts).
 *
 * ponytail: the review/task aggregates are recomputed per query. Fine for
 * thousands of providers; add counter columns or a materialized view if this
 * shows up in traces.
 */
export async function searchProfessionals(search: ProfessionalSearch): Promise<PaginatedResult<ProfessionalCard>> {
    const page = search.page ?? 1;
    const limit = search.limit ?? DEFAULT_LIMIT;
    const sort = search.sort ?? 'rating';

    const filters: Prisma.Sql[] = [Prisma.sql`u.role = 'PROVIDER'`];
    if (search.q) {
        const like = `%${search.q.replace(/[\\%_]/g, '\\$&')}%`;
        filters.push(Prisma.sql`(u."fullName" ILIKE ${like} ESCAPE '\\' OR u.skills ILIKE ${like} ESCAPE '\\' OR u.bio ILIKE ${like} ESCAPE '\\')`);
    }
    if (search.category) filters.push(Prisma.sql`${search.category} = ANY(u.categories)`);
    if (search.city) filters.push(Prisma.sql`u.city = ${search.city}`);
    const where = Prisma.join(filters, ' AND ');

    // Pinned in the searched category, then promoted, then plan tier — only while plans are live.
    const live = tiersLive();
    const tierRank = live ? Prisma.sql`pinned DESC, promoted DESC, tier_rank DESC, ` : Prisma.empty;
    const pinned = search.category
        ? Prisma.sql`EXISTS (SELECT 1 FROM "ProfilePromotion" pp WHERE pp."userId" = u.id AND pp.category = ${search.category} AND pp."endsAt" > now())`
        : Prisma.sql`false`;

    const [rows, [{ total }]] = await Promise.all([
        prisma.$queryRaw<(Omit<ProfessionalCard, 'promotedUntil'> & { tier_rank: number; promoted: boolean; promotedUntil: Date | null })[]>(Prisma.sql`
            SELECT u.id, u."fullName", u.avatar, u.city, u.categories, u."experienceYears", u."isVerified",
                   r.avg_rating AS "avgRating",
                   COALESCE(r.review_count, 0)::int AS "reviewCount",
                   COALESCE(c.completed, 0)::int AS "completedCount",
                   s.plan AS tier,
                   -- BUSINESS, PRO+, PRO, FREE; old plan ids rank as their replacements (lib/plans.ts)
                   CASE WHEN s.plan IN ('business', 'premium') THEN 3
                        WHEN s.plan IN ('pro_plus', 'standard') THEN 2
                        WHEN s.plan IN ('pro', 'basic') THEN 1 ELSE 0 END AS tier_rank,
                   -- subqueries, not joins: a provider with several promotion rows must stay one row
                   (SELECT MAX(pp."endsAt") FROM "ProfilePromotion" pp
                     WHERE pp."userId" = u.id AND pp.category IS NULL AND pp."endsAt" > now()) AS "promotedUntil",
                   EXISTS (SELECT 1 FROM "ProfilePromotion" pp
                     WHERE pp."userId" = u.id AND pp.category IS NULL AND pp."endsAt" > now()) AS promoted,
                   ${pinned} AS pinned
            FROM "User" u
            LEFT JOIN (
                SELECT "reviewedId", ROUND(AVG(rating)::numeric, 1)::float AS avg_rating, COUNT(*) AS review_count
                FROM "Review" WHERE hidden = false GROUP BY "reviewedId"
            ) r ON r."reviewedId" = u.id
            LEFT JOIN (
                SELECT "assignedUserId", COUNT(*) AS completed
                FROM "Task" WHERE status = 'COMPLETED' GROUP BY "assignedUserId"
            ) c ON c."assignedUserId" = u.id
            LEFT JOIN "Subscription" s ON s."userId" = u.id AND s."isActive" AND s."endDate" > now()
            WHERE ${where}
            ORDER BY ${tierRank}${orderFor(sort)}, u."createdAt" DESC, u.id
            LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
        prisma.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS total FROM "User" u WHERE ${where}`),
    ]);

    const items = rows.map(({ tier_rank: _rank, promoted: _promoted, promotedUntil, pinned: isPinned, ...card }) => ({
        ...card,
        tier: live ? normalizePlan(card.tier) : null,
        promotedUntil: live && promotedUntil ? new Date(promotedUntil).toISOString() : null,
        pinned: live && !!isPinned,
    }));
    return { items, total, page, limit };
}

/** The provider's paid tier for badges, or null (also null while subscriptions are off). */
export async function getActiveTier(userId: string): Promise<SubscriptionTier | null> {
    if (!tiersLive()) return null;
    const sub = await prisma.subscription.findFirst({
        where: { userId, isActive: true, endDate: { gt: new Date() } },
        select: { plan: true },
    });
    return normalizePlan(sub?.plan);
}

/**
 * Everything a public profile shows: provider fields, stats from visible
 * reviews only, the latest reviews, portfolio and tier. Shared by
 * GET /api/users/[id] (mobile) and the web profile page so they can't drift.
 * Dates are Date objects here; JSON turns them into the strings PublicProfile declares.
 */
export async function getPublicProfile(id: string, { reviewLimit = 20 } = {}) {
    const user = await prisma.user.findUnique({
        where: { id },
        select: {
            id: true, fullName: true, avatar: true, bio: true, skills: true, role: true, createdAt: true,
            experienceYears: true, city: true, categories: true, isVerified: true,
        },
    });
    if (!user) return null;

    const visible = { reviewedId: id, hidden: false };
    const [completedCount, byRating, reviews, portfolio, tier] = await Promise.all([
        prisma.task.count({ where: { assignedUserId: id, status: 'COMPLETED' } }),
        prisma.review.groupBy({ by: ['rating'], where: visible, _count: { rating: true } }),
        prisma.review.findMany({
            where: visible,
            select: {
                id: true, rating: true, comment: true, createdAt: true,
                reviewer: { select: { id: true, fullName: true } },
                task: { select: { id: true, title: true, category: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: reviewLimit,
        }),
        prisma.portfolioProject.findMany({
            where: { userId: id },
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            select: { id: true, title: true, description: true, images: true, order: true },
        }),
        getActiveTier(id),
    ]);

    const ratingBreakdown: PublicProfile['ratingBreakdown'] = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    let reviewCount = 0;
    let ratingSum = 0;
    for (const { rating, _count } of byRating) {
        if (rating in ratingBreakdown) ratingBreakdown[rating as 1 | 2 | 3 | 4 | 5] = _count.rating;
        reviewCount += _count.rating;
        ratingSum += rating * _count.rating;
    }
    const avgRating = reviewCount ? Math.round((ratingSum / reviewCount) * 10) / 10 : 0;

    return { ...user, completedCount, avgRating, reviewCount, ratingBreakdown, reviews, portfolio, tier };
}
