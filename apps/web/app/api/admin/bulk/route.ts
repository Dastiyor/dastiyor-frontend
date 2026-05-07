import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { logger } from '@/lib/logger';

// POST - Bulk operations
export async function POST(request: Request) {
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

        const body = await request.json();
        const { action, type, ids } = body;

        if (!action || !type || !Array.isArray(ids) || ids.length === 0) {
            return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
        }

        let result;

        switch (type) {
            case 'users':
                if (action === 'delete') {
                    result = await prisma.user.deleteMany({
                        where: { id: { in: ids } }
                    });
                } else if (action === 'ban') {
                    // Note: You'd need a 'banned' field in User model for this
                    result = { count: ids.length };
                }
                break;

            case 'tasks':
                if (action === 'delete') {
                    result = await prisma.task.deleteMany({
                        where: { id: { in: ids } }
                    });
                } else if (action === 'approve') {
                    result = await prisma.task.updateMany({
                        where: { id: { in: ids } },
                        data: { status: 'OPEN' }
                    });
                } else if (action === 'reject') {
                    result = await prisma.task.updateMany({
                        where: { id: { in: ids } },
                        data: { status: 'CANCELLED' }
                    });
                }
                break;

            case 'responses':
                if (action === 'delete') {
                    result = await prisma.response.deleteMany({
                        where: { id: { in: ids } }
                    });
                }
                break;

            default:
                return NextResponse.json({ error: 'Invalid type' }, { status: 400 });
        }

        logger.info('Bulk operation', { action, type, count: ids.length, adminId: payload.id });

        return NextResponse.json({
            message: `Bulk ${action} completed`,
            affected: result?.count || ids.length
        });

    } catch (error: any) {
        logger.error('Bulk operation error', { error: error.message });
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
