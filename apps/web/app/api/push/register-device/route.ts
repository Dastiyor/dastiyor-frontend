import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';

// Expo push tokens look like: ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]
// (or the legacy ExpoPushToken[...] form).
const EXPO_TOKEN_RE = /^Expo(nent)?PushToken\[[^\]]+\]$/;

/** POST — register or refresh the current user's Expo device push token. */
export async function POST(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { token, platform } = body;

        if (!token || typeof token !== 'string' || !EXPO_TOKEN_RE.test(token)) {
            return NextResponse.json({ error: 'Invalid push token' }, { status: 400 });
        }

        const safePlatform =
            platform === 'ios' || platform === 'android' ? platform : null;

        // A device token is globally unique; upsert reassigns it to the current
        // user (e.g. after a logout/login on the same device).
        await prisma.deviceToken.upsert({
            where: { token },
            update: { userId: payload.id as string, platform: safePlatform },
            create: { token, platform: safePlatform, userId: payload.id as string },
        });

        return NextResponse.json({ message: 'Device registered' });
    } catch (error) {
        console.error('Register Device Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

/** DELETE — unregister a device token (logout / disable push). */
export async function DELETE(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json();
        const { token } = body;

        if (!token || typeof token !== 'string') {
            return NextResponse.json({ error: 'Token required' }, { status: 400 });
        }

        await prisma.deviceToken.deleteMany({
            where: { token, userId: payload.id as string },
        });

        return NextResponse.json({ message: 'Device unregistered' });
    } catch (error) {
        console.error('Unregister Device Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
