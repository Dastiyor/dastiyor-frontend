import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
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

        if (!taskId) {
            return NextResponse.json({ error: 'Task ID is required' }, { status: 400 });
        }

        // Get the task
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        // Verify the user is the task owner
        if (task.userId !== userId) {
            return NextResponse.json({ error: 'Only task owner can cancel' }, { status: 403 });
        }

        // Can only cancel OPEN tasks (not in progress or completed)
        if (task.status !== 'OPEN') {
            return NextResponse.json({
                error: 'Only open tasks can be cancelled. Tasks in progress or completed cannot be cancelled.'
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
            include: { user: { select: { email: true } } }
        });
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
        for (const resp of pendingResponses) {
            if (resp.user?.email) {
                sendTaskCancelledNotification(
                    resp.user.email!,
                    task.title,
                    `${baseUrl}/tasks`
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
