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

        const response = await prisma.response.findFirst({
            where: { taskId, userId: payload.id as string },
            select: {
                id: true,
                message: true,
                price: true,
                estimatedTime: true,
                status: true,
                createdAt: true,
            },
        });

        return NextResponse.json({ response: response ?? null });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
