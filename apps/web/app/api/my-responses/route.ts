import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';

export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const responses = await prisma.response.findMany({
            where: { userId: payload.id as string },
            orderBy: { createdAt: 'desc' },
            include: {
                task: {
                    select: { id: true, title: true, category: true, city: true, status: true },
                },
            },
        });

        return NextResponse.json({
            responses: responses.map((r) => ({
                id: r.id,
                message: r.message,
                price: r.price,
                estimatedTime: r.estimatedTime,
                status: r.status,
                createdAt: new Date(r.createdAt).toLocaleDateString('ru-RU'),
                task: r.task,
            })),
        });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
