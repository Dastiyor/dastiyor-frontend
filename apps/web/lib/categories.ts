import { prisma } from '@/lib/prisma';
import { CATEGORIES } from '@/lib/config-fallback';

/**
 * The live category list: admin-managed rows from `Category`, falling back to
 * the built-in list when that table is empty or unreachable.
 *
 * Server-only — imports Prisma. Client components should read /api/config and
 * use `CATEGORIES` from `@/lib/config-fallback` as their first-paint value.
 *
 * Both the picker (/api/config) and the task-creation allow-list
 * (POST /api/tasks) must read from here, or the form offers categories the
 * API then rejects.
 *
 * ponytail: one uncached query per call — it is a single indexed read on a
 * table with tens of rows. Wrap in unstable_cache if it ever shows up in traces.
 */
export async function getCategories(): Promise<string[]> {
    try {
        const rows = await prisma.category.findMany({
            orderBy: [{ order: 'asc' }, { createdAt: 'asc' }],
            select: { name: true },
        });
        if (rows.length) return rows.map(r => r.name);
    } catch (err) {
        console.error('[categories] lookup failed, using fallback:', err);
    }
    return CATEGORIES;
}
