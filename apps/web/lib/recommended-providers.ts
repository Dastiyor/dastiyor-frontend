import type { ProfessionalCard } from '@dastiyor/types';
import { prisma } from '@/lib/prisma';
import { searchProfessionals } from '@/lib/professionals';

export const RECOMMENDED_LIMIT = 6;
/** Directory rows read per pass, beyond the ones we must skip. */
const WINDOW = 50;

export interface RecommendationTask {
    id: string;
    userId: string;
    category: string;
    city: string | null;
}

/** BUSINESS first, everyone else after in the order given. */
const businessFirst = (list: ProfessionalCard[]) => [
    ...list.filter((p) => p.tier === 'business'),
    ...list.filter((p) => p.tier !== 'business'),
];

/**
 * Providers to suggest to a customer for their task, shown on the task page
 * (web and app) while it is OPEN.
 *
 * Picks from the task's category, the task's city first, then any city to
 * fill up to six; skips the author and anyone who already responded. Within a
 * pass, BUSINESS providers ("priority among recommended providers") go ahead
 * of the rest before the cut, and the rest keep the directory's order
 * (lib/professionals.ts). The six picked are then ordered BUSINESS first, so a
 * BUSINESS provider from another city can list above a FREE one from the
 * task's city, but only gets in once the task's city has run short of six.
 *
 * Each pass reads a window of the directory (WINDOW rows plus the skipped
 * ones), not every provider: there is no tier filter to ask for, so a
 * BUSINESS provider ranked below that window is not seen.
 *
 * Tier is null while plans are switched off (searchProfessionals handles
 * MOBILE_PURCHASE_ENABLED), and the BUSINESS priority is then a no-op.
 */
export async function getRecommendedProviders(task: RecommendationTask, limit = RECOMMENDED_LIMIT): Promise<ProfessionalCard[]> {
    const responders = await prisma.response.findMany({
        where: { taskId: task.id },
        select: { userId: true },
    });
    const skip = new Set([task.userId, ...responders.map((r) => r.userId)]);
    const want = Math.max(limit, WINDOW) + skip.size;

    const picked: ProfessionalCard[] = [];
    const take = (items: ProfessionalCard[]) => {
        for (const pro of businessFirst(items)) {
            if (picked.length >= limit) return;
            if (skip.has(pro.id)) continue;
            skip.add(pro.id);
            picked.push(pro);
        }
    };

    if (task.city) {
        take((await searchProfessionals({ category: task.category, city: task.city, limit: want })).items);
    }
    if (picked.length < limit) {
        take((await searchProfessionals({ category: task.category, limit: want })).items);
    }

    return businessFirst(picked);
}
