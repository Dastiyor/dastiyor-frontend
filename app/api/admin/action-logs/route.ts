import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

const LOGS_PER_PAGE = 50;

export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || payload.role !== 'ADMIN') {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const { searchParams } = new URL(request.url);
        const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
        const action = searchParams.get('action');
        const userId = searchParams.get('userId');

        const where: Record<string, unknown> = {};
        if (action) where.action = action;
        if (userId) where.userId = userId;

        const [logs, total] = await Promise.all([
            prisma.actionLog.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * LOGS_PER_PAGE,
                take: LOGS_PER_PAGE,
                include: {
                    user: { select: { id: true, fullName: true, email: true, role: true } },
                },
            }),
            prisma.actionLog.count({ where }),
        ]);

        return NextResponse.json({
            logs,
            pagination: {
                page,
                limit: LOGS_PER_PAGE,
                total,
                totalPages: Math.ceil(total / LOGS_PER_PAGE),
            },
        });
    } catch (error) {
        console.error('Action Logs Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
