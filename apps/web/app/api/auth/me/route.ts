import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(request: Request) {
    const bearerToken = getBearerToken(request);
    let token: string | undefined = bearerToken ?? undefined;

    if (!token) {
        const cookieStore = await cookies();
        token = cookieStore.get('token')?.value;
    }

    if (!token) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const payload = await verifyJWT(token);
    if (!payload?.id) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({
        where: { id: payload.id as string },
        select: { id: true, email: true, fullName: true, role: true, phone: true, avatar: true, createdAt: true },
    });

    if (!user) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    return NextResponse.json(user);
}
