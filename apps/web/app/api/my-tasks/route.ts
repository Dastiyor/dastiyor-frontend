import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';

const DEFAULT_LIMIT = 20;
const MAX_LIMIT = 50;

export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const url = new URL(request.url);
        const page = Math.max(1, parseInt(url.searchParams.get('page') ?? '1', 10));
        const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(url.searchParams.get('limit') ?? String(DEFAULT_LIMIT), 10)));
        const skip = (page - 1) * limit;

        const [tasks, total] = await Promise.all([
            prisma.task.findMany({
                where: { userId: payload.id as string },
                orderBy: { createdAt: 'desc' },
                include: { _count: { select: { responses: true } } },
                skip,
                take: limit,
            }),
            prisma.task.count({ where: { userId: payload.id as string } }),
        ]);

        return NextResponse.json({
            tasks: tasks.map((t) => ({
                id: t.id,
                title: t.title,
                category: t.category,
                budget: t.budgetType === 'fixed' ? `${t.budgetAmount} TJS` : 'Договорная',
                city: t.city,
                status: t.status,
                urgency: t.urgency,
                postedAt: t.createdAt.toISOString(),
                responseCount: t._count.responses,
            })),
            pagination: {
                page,
                limit,
                total,
                hasMore: skip + tasks.length < total,
            },
        });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
