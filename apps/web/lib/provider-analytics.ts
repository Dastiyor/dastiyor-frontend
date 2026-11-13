/**
 * Provider analytics behind GET /api/provider/analytics and /provider/analytics.
 *
 * Each section is computed only when the caller's plan includes it:
 *   profile   — PRO+ and BUSINESS ("Расширенная аналитика профиля")
 *   advanced  — BUSINESS ("Продвинутая аналитика профиля")
 *   responses — BUSINESS ("Расширенная статистика откликов")
 * FREE and PRO get none of them; FREE's basic statistics stay on the dashboard.
 *
 * No daily rollup: a provider's 30 days of views is one range read on the
 * (providerId, createdAt) index, and the peer comparison is three counts.
 * Revisit if ProfileView grows into the millions.
 *
 * Server-only: imports Prisma.
 */
import type {
    AdvancedProfileAnalytics,
    AnalyticsComparisonFigures,
    AnalyticsNamedCount,
    AnalyticsSection,
    ProfileAnalytics,
    ProfileViewSource,
    ProviderAnalytics,
    ResponseAnalytics,
    SubscriptionTier,
} from '@dastiyor/types';
import { prisma } from '@/lib/prisma';
import type { PlanId } from '@/lib/plans';

/** Which plans unlock each section, cheapest first. */
export const SECTION_PLANS: Record<AnalyticsSection, SubscriptionTier[]> = {
    profile: ['pro_plus', 'business'],
    advanced: ['business'],
    responses: ['business'],
};

const SECTIONS = Object.keys(SECTION_PLANS) as AnalyticsSection[];

export function canSee(section: AnalyticsSection, plan: PlanId | null): boolean {
    return plan !== null && SECTION_PLANS[section].includes(plan);
}

/** A response counts as hired once accepted (and stays so when the task completes). */
const HIRED = ['ACCEPTED', 'COMPLETED'];

/** Dushanbe is UTC+5 all year. */
const TZ_OFFSET_MS = 5 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;

/** YYYY-MM-DD in Dushanbe time. */
export function localDay(d: Date): string {
    return new Date(d.getTime() + TZ_OFFSET_MS).toISOString().slice(0, 10);
}

/** Midnight in Dushanbe, `daysAgo` days before `now`'s day. */
export function startOfLocalDay(now: Date, daysAgo = 0): Date {
    const local = new Date(now.getTime() + TZ_OFFSET_MS);
    const midnight = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) - daysAgo * DAY_MS;
    return new Date(midnight - TZ_OFFSET_MS);
}

/** Share in percent, one decimal; null when there is nothing to divide by. */
export function rate(part: number, whole: number): number | null {
    return whole > 0 ? Math.round((part / whole) * 1000) / 10 : null;
}

const SOURCE_KEYS: Record<string, ProfileViewSource> = { DIRECTORY: 'directory', TASK: 'task', SEARCH: 'search', DIRECT: 'direct' };

type ViewRow = { createdAt: Date; source: string; category: string | null; city: string | null };

function countBy(rows: ViewRow[], key: 'category' | 'city'): AnalyticsNamedCount[] {
    const counts = new Map<string, number>();
    for (const r of rows) {
        const name = r[key];
        if (name) counts.set(name, (counts.get(name) ?? 0) + 1);
    }
    return [...counts].map(([name, views]) => ({ name, views })).sort((a, b) => b.views - a.views || a.name.localeCompare(b.name));
}

function profileSection(views: ViewRow[], since7: Date, now: Date, responses: number, hired: number): ProfileAnalytics {
    const byDay = new Map<string, number>();
    const sources: Record<ProfileViewSource, number> = { directory: 0, task: 0, search: 0, direct: 0 };
    let views7 = 0;
    for (const v of views) {
        const day = localDay(v.createdAt);
        byDay.set(day, (byDay.get(day) ?? 0) + 1);
        sources[SOURCE_KEYS[v.source] ?? 'direct'] += 1;
        if (v.createdAt >= since7) views7 += 1;
    }
    const daily = Array.from({ length: 30 }, (_, i) => {
        const date = localDay(startOfLocalDay(now, 29 - i));
        return { date, views: byDay.get(date) ?? 0 };
    });
    return { views7, views30: views.length, daily, sources, responses, hired, conversion: rate(hired, responses) };
}

async function comparison(
    user: { id: string; categories: string[] },
    since30: Date,
): Promise<AdvancedProfileAnalytics['peers']> {
    if (user.categories.length === 0) return null;
    const peers = await prisma.user.findMany({
        where: { role: 'PROVIDER', id: { not: user.id }, categories: { hasSome: user.categories } },
        select: { id: true },
        take: 2000,
    });
    if (peers.length === 0) return null;
    const ids = peers.map(p => p.id);
    const [views, responses, hired] = await Promise.all([
        prisma.profileView.count({ where: { providerId: { in: ids }, createdAt: { gte: since30 } } }),
        prisma.response.count({ where: { userId: { in: ids }, createdAt: { gte: since30 } } }),
        prisma.response.count({ where: { userId: { in: ids }, createdAt: { gte: since30 }, status: { in: HIRED } } }),
    ]);
    const avg = (n: number) => Math.round((n / ids.length) * 10) / 10;
    return { count: ids.length, views30: avg(views), responses30: avg(responses), conversion30: rate(hired, responses) };
}

async function responseSection(userId: string, now: Date): Promise<ResponseAnalytics> {
    const rows = await prisma.response.findMany({
        where: { userId },
        select: { status: true, createdAt: true, task: { select: { category: true, createdAt: true } } },
        orderBy: { createdAt: 'desc' },
        take: 5000,
    });

    const months = Array.from({ length: 6 }, (_, i) => {
        const local = new Date(now.getTime() + TZ_OFFSET_MS);
        const d = new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth() - (5 - i), 1));
        return { month: d.toISOString().slice(0, 7), sent: 0, hired: 0 };
    });
    const monthIndex = new Map(months.map((m, i) => [m.month, i]));
    const categories = new Map<string, { sent: number; hired: number }>();
    let hired = 0;
    let delaySum = 0;

    for (const r of rows) {
        const isHired = HIRED.includes(r.status);
        if (isHired) hired += 1;
        delaySum += Math.max(0, r.createdAt.getTime() - r.task.createdAt.getTime());

        const cat = categories.get(r.task.category) ?? { sent: 0, hired: 0 };
        cat.sent += 1;
        if (isHired) cat.hired += 1;
        categories.set(r.task.category, cat);

        const m = monthIndex.get(localDay(r.createdAt).slice(0, 7));
        if (m !== undefined) {
            months[m].sent += 1;
            if (isHired) months[m].hired += 1;
        }
    }

    return {
        sent: rows.length,
        viewed: null,
        hired,
        conversion: rate(hired, rows.length),
        byCategory: [...categories]
            .map(([name, c]) => ({ name, sent: c.sent, hired: c.hired, conversion: rate(c.hired, c.sent) }))
            .sort((a, b) => b.sent - a.sent || a.name.localeCompare(b.name)),
        avgResponseMinutes: rows.length ? Math.round(delaySum / rows.length / 60000) : null,
        monthly: months,
    };
}

/** The day the first profile view was recorded anywhere, or today when there is none yet. */
async function viewsTrackedSince(now: Date): Promise<string> {
    const first = await prisma.profileView.findFirst({ orderBy: { createdAt: 'asc' }, select: { createdAt: true } });
    return localDay(first?.createdAt ?? now);
}

export async function getProviderAnalytics(
    user: { id: string; categories: string[] },
    plan: PlanId | null,
    now = new Date(),
): Promise<ProviderAnalytics> {
    const since30 = startOfLocalDay(now, 29);
    const since7 = startOfLocalDay(now, 6);
    const showProfile = canSee('profile', plan);
    const showAdvanced = canSee('advanced', plan);
    const showResponses = canSee('responses', plan);

    const result: ProviderAnalytics = {
        plan: plan ?? 'free',
        viewsTrackedSince: await viewsTrackedSince(now),
        profile: null,
        advanced: null,
        responses: null,
        locked: SECTIONS.filter(s => !canSee(s, plan)).map(section => ({ section, plan: SECTION_PLANS[section][0] })),
    };

    if (showProfile) {
        const [views, responses, hired] = await Promise.all([
            prisma.profileView.findMany({
                where: { providerId: user.id, createdAt: { gte: since30 } },
                select: { createdAt: true, source: true, category: true, city: true },
            }),
            prisma.response.count({ where: { userId: user.id } }),
            prisma.response.count({ where: { userId: user.id, status: { in: HIRED } } }),
        ]);
        result.profile = profileSection(views, since7, now, responses, hired);

        if (showAdvanced) {
            const [responses30, hired30] = await Promise.all([
                prisma.response.count({ where: { userId: user.id, createdAt: { gte: since30 } } }),
                prisma.response.count({ where: { userId: user.id, createdAt: { gte: since30 }, status: { in: HIRED } } }),
            ]);
            const you: AnalyticsComparisonFigures = { views30: views.length, responses30, conversion30: rate(hired30, responses30) };
            result.advanced = {
                you,
                peers: await comparison(user, since30),
                byCategory: countBy(views, 'category'),
                byCity: countBy(views, 'city'),
            };
        }
    }

    if (showResponses) result.responses = await responseSection(user.id, now);
    return result;
}
