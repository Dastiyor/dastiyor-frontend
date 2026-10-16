import { Prisma } from '@prisma/client';
import type { PaginatedResult, ProfessionalCard, ProfessionalSort, SubscriptionTier } from '@dastiyor/types';
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
const TIERS: SubscriptionTier[] = ['basic', 'standard', 'premium'];
const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

const ORDER: Record<ProfessionalSort, Prisma.Sql> = {
    rating: Prisma.sql`"avgRating" DESC NULLS LAST, "reviewCount" DESC`,
    reviews: Prisma.sql`"reviewCount" DESC`,
    completed: Prisma.sql`"completedCount" DESC`,
    newest: Prisma.sql`u."createdAt" DESC`,
};

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
 * not one page. Paid tiers rank first while subscriptions are switched on.
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

    const tierRank = SUBSCRIPTIONS_ENABLED ? Prisma.sql`tier_rank DESC, ` : Prisma.empty;

    const [rows, [{ total }]] = await Promise.all([
        prisma.$queryRaw<(ProfessionalCard & { tier_rank: number })[]>(Prisma.sql`
            SELECT u.id, u."fullName", u.avatar, u.city, u.categories, u."experienceYears", u."isVerified",
                   r.avg_rating AS "avgRating",
                   COALESCE(r.review_count, 0)::int AS "reviewCount",
                   COALESCE(c.completed, 0)::int AS "completedCount",
                   s.plan AS tier,
                   CASE s.plan WHEN 'premium' THEN 3 WHEN 'standard' THEN 2 WHEN 'basic' THEN 1 ELSE 0 END AS tier_rank
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
            ORDER BY ${tierRank}${ORDER[sort]}, u."createdAt" DESC, u.id
            LIMIT ${limit} OFFSET ${(page - 1) * limit}`),
        prisma.$queryRaw<{ total: number }[]>(Prisma.sql`SELECT COUNT(*)::int AS total FROM "User" u WHERE ${where}`),
    ]);

    const items = rows.map(({ tier_rank: _rank, ...card }) => ({
        ...card,
        tier: SUBSCRIPTIONS_ENABLED && TIERS.includes(card.tier as SubscriptionTier) ? card.tier : null,
    }));
    return { items, total, page, limit };
}

/** The provider's paid tier for badges, or null (also null while subscriptions are off). */
export async function getActiveTier(userId: string): Promise<SubscriptionTier | null> {
    if (!SUBSCRIPTIONS_ENABLED) return null;
    const sub = await prisma.subscription.findFirst({
        where: { userId, isActive: true, endDate: { gt: new Date() } },
        select: { plan: true },
    });
    return TIERS.includes(sub?.plan as SubscriptionTier) ? (sub!.plan as SubscriptionTier) : null;
}
