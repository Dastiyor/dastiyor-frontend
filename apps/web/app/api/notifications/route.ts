import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET - Link notifications
export async function GET() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const notifications = await prisma.notification.findMany({
            where: { userId: payload.id as string },
            orderBy: { createdAt: 'desc' },
            take: 20
        });

        const unreadCount = await prisma.notification.count({
            where: {
                userId: payload.id as string,
                isRead: false
            }
        });

        return NextResponse.json({ notifications, unreadCount });

    } catch (error) {
        console.error('Notifications Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// PUT - Mark all as read
export async function PUT() {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        await prisma.notification.updateMany({
            where: {
                userId: payload.id as string,
                isRead: false
            },
            data: { isRead: true }
        });

        return NextResponse.json({ success: true });

    } catch (error) {
        console.error('Notifications Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
