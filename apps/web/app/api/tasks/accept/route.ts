import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOfferAcceptedNotification } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';
import { sendPushNotification } from '@/lib/web-push';
import { requireAuth } from '@/lib/require-auth';

export async function POST(request: Request) {
    try {
        // 1. Authenticate
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUserId = payload.id as string;

        // 2. Parse Body
        const body = await request.json();
        const { taskId, providerId } = body; // We can accept responseId too, but providerId is direct for Schema

        if (!taskId || !providerId) {
            return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
        }

        // 3. Verify Ownership and Task State
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        if (task.userId !== currentUserId) {
            return NextResponse.json({ error: 'Forbidden: You do not own this task' }, { status: 403 });
        }

        if (task.status !== 'OPEN') {
            return NextResponse.json({ error: 'Task is not open for acceptance' }, { status: 400 });
        }

        // 4. Verify the provider submitted a PENDING response to this task
        const providerResponse = await prisma.response.findFirst({
            where: { taskId, userId: providerId, status: 'PENDING' },
        });

        if (!providerResponse) {
            return NextResponse.json(
                { error: 'Provider has no pending response for this task' },
                { status: 400 }
            );
        }

        // 5. Atomically update task + accept response + notify — all or nothing
        await prisma.$transaction([
            prisma.task.update({
                where: { id: taskId },
                data: { status: 'IN_PROGRESS', assignedUserId: providerId },
            }),
            prisma.response.update({
                where: { id: providerResponse.id },
                data: { status: 'ACCEPTED' },
            }),
            prisma.notification.create({
                data: {
                    userId: providerId,
                    type: 'OFFER_ACCEPTED',
                    title: 'Отклик принят!',
                    message: `Вас выбрали исполнителем задания "${task.title}". Свяжитесь с заказчиком.`,
                    link: `/tasks/${taskId}`,
                },
            }),
        ]);

        const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });

        // Send email notification to provider (non-blocking)
        const provider = await prisma.user.findUnique({
            where: { id: providerId },
            select: { email: true }
        });
        if (provider?.email) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
            sendOfferAcceptedNotification(
                provider.email,
                task.title,
                `${baseUrl}/tasks/${taskId}`
            ).catch(err => console.error('Email notification error:', err));
        }

        // Web push notification to provider (non-blocking)
        sendPushNotification(providerId, {
            title: 'Отклик принят!',
            body: `Вас выбрали исполнителем задания "${task.title}"`,
            url: `/tasks/${taskId}`,
        }).catch(() => {});

        logAction({
            action: 'ACCEPT_RESPONSE',
            userId: currentUserId,
            entity: 'Task',
            entityId: taskId,
            details: { providerId },
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({ message: 'Task accepted', task: updatedTask });

    } catch (error) {
        console.error('Accept Task Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
