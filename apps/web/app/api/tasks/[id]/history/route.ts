import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';

// GET - Get task status history
export async function GET(
    request: Request,
    { params }: { params: Promise<{ id: string }> }
) {
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

        const { id } = await params;
        const task = await prisma.task.findUnique({
            where: { id },
            select: {
                id: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                userId: true,
                assignedUserId: true
            }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Check if user has access (owner or assigned provider)
        if (task.userId !== payload.id && task.assignedUserId !== payload.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Build history from task data
        const history = [
            {
                status: 'OPEN',
                timestamp: task.createdAt,
                description: 'Задание создано'
            }
        ];

        if (task.assignedUserId && task.status !== 'OPEN') {
            history.push({
                status: 'IN_PROGRESS',
                timestamp: task.updatedAt,
                description: 'Исполнитель назначен'
            });
        }

        if (task.status === 'COMPLETED') {
            history.push({
                status: 'COMPLETED',
                timestamp: task.updatedAt,
                description: 'Задание завершено'
            });
        } else if (task.status === 'CANCELLED') {
            history.push({
                status: 'CANCELLED',
                timestamp: task.updatedAt,
                description: 'Задание отменено'
            });
        }

        return NextResponse.json({ history });

    } catch (error: any) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
