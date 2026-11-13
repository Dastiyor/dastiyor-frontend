import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { activePlan } from '@/lib/response-allowance';
import { getProviderAnalytics } from '@/lib/provider-analytics';

export const dynamic = 'force-dynamic';

/**
 * The signed-in provider's analytics: only the sections their active plan
 * includes, the rest null and listed in `locked`. See lib/provider-analytics.ts.
 */
export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const user = await prisma.user.findUnique({
            where: { id: payload.id as string },
            select: {
                id: true,
                role: true,
                categories: true,
                subscription: { select: { plan: true, isActive: true, startDate: true, endDate: true } },
            },
        });
        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }
        if (user.role !== 'PROVIDER') {
            return NextResponse.json({ error: 'Аналитика доступна только исполнителям' }, { status: 403 });
        }

        const analytics = await getProviderAnalytics(user, activePlan(user.subscription));
        return NextResponse.json(analytics, { headers: { 'Cache-Control': 'private, no-store' } });
    } catch (error) {
        console.error('Provider analytics error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
