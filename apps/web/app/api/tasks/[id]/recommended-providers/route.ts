import { NextResponse } from 'next/server';
import type { RecommendedProvidersResponse } from '@dastiyor/types';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { getRecommendedProviders } from '@/lib/recommended-providers';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';

/** GET - up to six providers to suggest for the caller's own task. Empty unless the task is OPEN. */
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const rateLimit = await checkRateLimit(getClientIP(request), 'api');
        if (!rateLimit.allowed) return rateLimitExceededResponse(rateLimit.resetIn);

        const { id } = await params;
        const task = await prisma.task.findUnique({
            where: { id },
            select: { id: true, userId: true, category: true, city: true, status: true },
        });

        if (!task) return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
        if (task.userId !== payload.id) {
            return NextResponse.json({ error: 'Доступ запрещён: это не ваше задание' }, { status: 403 });
        }

        const body: RecommendedProvidersResponse = {
            providers: task.status === 'OPEN' ? await getRecommendedProviders(task) : [],
        };
        return NextResponse.json(body);
    } catch (error) {
        console.error('Recommended Providers Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
