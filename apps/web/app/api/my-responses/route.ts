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
