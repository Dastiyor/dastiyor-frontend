import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id: taskId } = await params;

        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { userId: true },
        });

        if (!task) return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        if (task.userId !== payload.id) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

        const responses = await prisma.response.findMany({
            where: { taskId },
            orderBy: { createdAt: 'asc' },
            include: {
                user: { select: { id: true, fullName: true, avatar: true } },
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
                provider: r.user,
            })),
        });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
