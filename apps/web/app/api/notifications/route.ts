import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';

async function authenticate(request: Request) {
    const bearerToken = getBearerToken(request);
    let token: string | undefined = bearerToken ?? undefined;
    if (!token) {
        const cookieStore = await cookies();
        token = cookieStore.get('token')?.value;
    }
    if (!token) return null;
    const payload = await verifyJWT(token);
    return payload?.id ? payload : null;
}

export async function GET(request: Request) {
    try {
        const payload = await authenticate(request);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const [notifications, unreadCount] = await Promise.all([
            prisma.notification.findMany({
                where: { userId: payload.id as string },
                orderBy: { createdAt: 'desc' },
                take: 30,
            }),
            prisma.notification.count({
                where: { userId: payload.id as string, isRead: false },
            }),
        ]);

        return NextResponse.json({ notifications, unreadCount });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const payload = await authenticate(request);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        await prisma.notification.updateMany({
            where: { userId: payload.id as string, isRead: false },
            data: { isRead: true },
        });

        return NextResponse.json({ success: true });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
