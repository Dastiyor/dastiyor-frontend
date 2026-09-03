import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { isValidId } from '@/lib/validation';
import { sendTaskCancelledNotification } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';
import { requireAuth } from '@/lib/require-auth';

// POST - Cancel a task
export async function POST(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.id as string;
        const body = await request.json();
        const { taskId } = body;

        if (!isValidId(taskId)) {
            return NextResponse.json({ error: 'Не указан ID задания' }, { status: 400 });
        }

        // Get the task
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
        }

        // Verify the user is the task owner
        if (task.userId !== userId) {
            return NextResponse.json({ error: 'Отменить задание может только его автор' }, { status: 403 });
        }

        // Can only cancel OPEN tasks (not in progress or completed)
        if (task.status !== 'OPEN') {
            return NextResponse.json({
                error: 'Отменить можно только открытые задания. Задания в работе или завершённые отменить нельзя.'
            }, { status: 400 });
        }

        // Update task status
        await prisma.task.update({
            where: { id: taskId },
            data: { status: 'CANCELLED' }
        });

        // Notify providers who had pending responses (non-blocking)
        const pendingResponses = await prisma.response.findMany({
            where: { taskId, status: 'PENDING' },
            include: { user: { select: { email: true, locale: true } } }
        });
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
        for (const resp of pendingResponses) {
            if (resp.user?.email) {
                sendTaskCancelledNotification(
                    resp.user.email!,
                    task.title,
                    `${baseUrl}/tasks`,
                    resp.user.locale,
                ).catch(err => console.error('Email notification error:', err));
            }
        }

        logAction({
            action: 'CANCEL_TASK',
            userId,
            entity: 'Task',
            entityId: taskId,
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({
            message: 'Task cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel Task Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
