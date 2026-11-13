import type { ProfessionalCard } from '@dastiyor/types';
import { prisma } from '@/lib/prisma';
import { searchProfessionals } from '@/lib/professionals';

export const RECOMMENDED_LIMIT = 6;

export interface RecommendationTask {
    id: string;
    userId: string;
    category: string;
    city: string | null;
}

/**
 * Providers to suggest to a customer for their task, shown on the task page
 * (web and app) while it is OPEN.
 *
 * Picks from the task's category, the task's city first, then any city to
 * fill up to six; skips the author and anyone who already responded. Order
 * within each pass is the directory's (lib/professionals.ts: paid tier, then
 * rating). Of the providers picked, BUSINESS ones are moved to the top
 * ("priority among recommended providers"), so a BUSINESS provider from
 * another city can list above a FREE one from the task's city, but only once
 * the task's city has run short of six.
 *
 * Tier is null while plans are switched off (searchProfessionals handles
 * MOBILE_PURCHASE_ENABLED), and the BUSINESS hoist is then a no-op.
 */
export async function getRecommendedProviders(task: RecommendationTask, limit = RECOMMENDED_LIMIT): Promise<ProfessionalCard[]> {
    const responders = await prisma.response.findMany({
        where: { taskId: task.id },
        select: { userId: true },
    });
    const skip = new Set([task.userId, ...responders.map((r) => r.userId)]);
    // Asking for limit + |skip| guarantees `limit` survivors whenever that many exist.
    const want = limit + skip.size;

    const picked: ProfessionalCard[] = [];
    const take = (items: ProfessionalCard[]) => {
        for (const pro of items) {
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

    return [
        ...picked.filter((p) => p.tier === 'business'),
        ...picked.filter((p) => p.tier !== 'business'),
    ];
}
