import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';

export async function GET(request: Request) {
    const payload = await requireAuth(request);
    if (!payload || !payload.id) {
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
