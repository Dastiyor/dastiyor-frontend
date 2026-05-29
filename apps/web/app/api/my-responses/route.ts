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

        const [responses, total] = await Promise.all([
            prisma.response.findMany({
                where: { userId: payload.id as string },
                orderBy: { createdAt: 'desc' },
                include: {
                    task: {
                        select: { id: true, title: true, category: true, city: true, status: true },
                    },
                },
                skip,
                take: limit,
            }),
            prisma.response.count({ where: { userId: payload.id as string } }),
        ]);

        return NextResponse.json({
            responses: responses.map((r) => ({
                id: r.id,
                message: r.message,
                price: r.price,
                estimatedTime: r.estimatedTime,
                status: r.status,
                createdAt: r.createdAt.toISOString(),
                task: r.task,
            })),
            pagination: {
                page,
                limit,
                total,
                hasMore: skip + responses.length < total,
            },
        });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
