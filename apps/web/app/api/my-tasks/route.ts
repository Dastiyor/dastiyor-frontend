import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
    try {
        const bearerToken = getBearerToken(request);
        let token: string | undefined = bearerToken ?? undefined;
        if (!token) {
            const cookieStore = await cookies();
            token = cookieStore.get('token')?.value;
        }
        if (!token) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const payload = await verifyJWT(token);
        if (!payload?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const tasks = await prisma.task.findMany({
            where: { userId: payload.id as string },
            orderBy: { createdAt: 'desc' },
            include: { _count: { select: { responses: true } } },
        });

        return NextResponse.json({
            tasks: tasks.map((t) => ({
                id: t.id,
                title: t.title,
                category: t.category,
                budget: t.budgetType === 'fixed' ? `${t.budgetAmount} TJS` : 'Договорная',
                city: t.city,
                status: t.status,
                urgency: t.urgency,
                postedAt: new Date(t.createdAt).toLocaleDateString('ru-RU'),
                responseCount: t._count.responses,
            })),
        });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
