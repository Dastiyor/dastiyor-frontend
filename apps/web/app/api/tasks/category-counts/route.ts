import { NextResponse } from 'next/server';
import type { Prisma } from '@prisma/client';
import type { TaskCategoryCountsResponse } from '@dastiyor/types';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { logger } from '@/lib/logger';

/**
 * GET - open tasks per category, for the mobile feed's category chips (the web
 * sidebar counts on the server in app/tasks/page.tsx, with the same filter).
 * `city` narrows the count the way it narrows the feed. Public, like the feed.
 */
export async function GET(request: Request) {
    try {
        const rateLimit = await checkRateLimit(getClientIP(request), 'api');
        if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

        const city = new URL(request.url).searchParams.get('city');
        const where: Prisma.TaskWhereInput = { status: 'OPEN' };
        if (city) where.city = { contains: city, mode: 'insensitive' };

        const rows = await prisma.task.groupBy({ by: ['category'], where, _count: true });
        const body: TaskCategoryCountsResponse = {
            counts: Object.fromEntries(rows.map(r => [r.category, r._count])),
        };
        return NextResponse.json(body, {
            // Shared by every visitor; a minute old is fine for a count.
            headers: { 'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300' },
        });
    } catch (error) {
        logger.error('Category counts error', { error: error instanceof Error ? error.message : String(error) });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
