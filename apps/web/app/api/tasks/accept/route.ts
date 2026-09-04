import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notificationStrings } from '@/lib/notifications/strings';
import { isValidId } from '@/lib/validation';
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

        if (!isValidId(taskId) || !isValidId(providerId)) {
            return NextResponse.json({ error: 'Заполнены не все поля' }, { status: 400 });
        }

        // 3. Verify Ownership and Task State
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
        }

        if (task.userId !== currentUserId) {
            return NextResponse.json({ error: 'Доступ запрещён: это не ваше задание' }, { status: 403 });
        }

        if (task.status !== 'OPEN') {
            return NextResponse.json({ error: 'Задание недоступно для принятия' }, { status: 400 });
        }

        // 4. Verify the provider submitted a PENDING response to this task
        const providerResponse = await prisma.response.findFirst({
            where: { taskId, userId: providerId, status: 'PENDING' },
        });

        if (!providerResponse) {
            return NextResponse.json(
                { error: 'У исполнителя нет отклика в ожидании на это задание' },
                { status: 400 }
            );
        }

        const providerStrings = notificationStrings(
            (await prisma.user.findUnique({ where: { id: providerId }, select: { locale: true } }))?.locale
        );

        // 5. Atomically update task + accept response + notify — all or nothing.
        //    Guarded claim: the task transition only wins if it's still OPEN, so two
        //    concurrent accepts for different providers can't both commit.
        try {
            await prisma.$transaction(async (tx) => {
                const claim = await tx.task.updateMany({
                    where: { id: taskId, status: 'OPEN' },
                    data: { status: 'IN_PROGRESS', assignedUserId: providerId },
                });
                if (claim.count === 0) {
                    throw new Error('TASK_NOT_OPEN');
                }
                await tx.response.update({
                    where: { id: providerResponse.id },
                    data: { status: 'ACCEPTED' },
                });
                // The task can only be assigned once, so every other bid is out.
                // Leaving them PENDING told those providers they were still in
                // the running, and kept the customer's accept/reject buttons up.
                await tx.response.updateMany({
                    where: { taskId, status: 'PENDING' },
                    data: { status: 'REJECTED' },
                });
                await tx.notification.create({
                    data: {
                        userId: providerId,
                        type: 'OFFER_ACCEPTED',
                        title: providerStrings.acceptedTitle,
                        message: providerStrings.acceptedBody(task.title),
                        link: `/tasks/${taskId}`,
                    },
                });
            });
        } catch (e) {
            if (e instanceof Error && e.message === 'TASK_NOT_OPEN') {
                return NextResponse.json({ error: 'Задание недоступно для принятия' }, { status: 400 });
            }
            throw e;
        }

        const updatedTask = await prisma.task.findUnique({ where: { id: taskId } });

        // Send email notification to provider (non-blocking)
        const provider = await prisma.user.findUnique({
            where: { id: providerId },
            select: { email: true, locale: true }
        });
        if (provider?.email) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
            sendOfferAcceptedNotification(
                provider.email,
                task.title,
                `${baseUrl}/tasks/${taskId}`,
                provider?.locale,
            ).catch(err => console.error('Email notification error:', err));
        }

        // Web push notification to provider (non-blocking)
        sendPushNotification(providerId, {
            title: providerStrings.acceptedTitle,
            body: providerStrings.acceptedBody(task.title),
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
