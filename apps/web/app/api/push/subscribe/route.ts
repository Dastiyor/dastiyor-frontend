import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

export async function POST(request: Request) {
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

        const body = await request.json();
        const { endpoint, keys } = body;

        if (!endpoint || !keys?.p256dh || !keys?.auth) {
            return NextResponse.json({ error: 'Invalid subscription data' }, { status: 400 });
        }

        await prisma.pushSubscription.upsert({
            where: { endpoint },
            update: {
                p256dh: keys.p256dh,
                auth: keys.auth,
                userId: payload.id as string,
            },
            create: {
                endpoint,
                p256dh: keys.p256dh,
                auth: keys.auth,
                userId: payload.id as string,
            },
        });

        return NextResponse.json({ message: 'Subscription saved' });
    } catch (error) {
        console.error('Push Subscribe Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request) {
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

        const body = await request.json();
        const { endpoint } = body;

        if (!endpoint) {
            return NextResponse.json({ error: 'Endpoint required' }, { status: 400 });
        }

        await prisma.pushSubscription.deleteMany({
            where: { endpoint, userId: payload.id as string },
        });

        return NextResponse.json({ message: 'Subscription removed' });
    } catch (error) {
        console.error('Push Unsubscribe Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
