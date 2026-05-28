import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';

export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const limit = Math.min(50, Math.max(1, parseInt(searchParams.get('limit') || '20', 10)));
        const skip = (page - 1) * limit;

        const [notifications, unreadCount, total] = await Promise.all([
            prisma.notification.findMany({
                where: { userId: payload.id as string },
                orderBy: { createdAt: 'desc' },
                take: limit,
                skip,
            }),
            prisma.notification.count({
                where: { userId: payload.id as string, isRead: false },
            }),
            prisma.notification.count({
                where: { userId: payload.id as string },
            }),
        ]);

        return NextResponse.json({
            notifications,
            unreadCount,
            pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
        });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const payload = await requireAuth(request);
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
