import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notificationStrings, notificationParams } from '@/lib/notifications/strings';
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

        // IN_PROGRESS is allowed on purpose: the losing bids are left PENDING so
        // the customer can switch providers if the chosen one falls through
        // mid-job. Only a finished task closes the choice.
        if (task.status !== 'OPEN' && task.status !== 'IN_PROGRESS') {
            return NextResponse.json({ error: 'Задание недоступно для принятия' }, { status: 400 });
        }

        if (task.assignedUserId === providerId) {
            return NextResponse.json({ error: 'Этот исполнитель уже назначен' }, { status: 400 });
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
        //    Guarded claim on the status and assignee we just read, so two
        //    concurrent accepts can't both commit and a stale client can't
        //    clobber a newer choice.
        try {
            await prisma.$transaction(async (tx) => {
                const claim = await tx.task.updateMany({
                    where: { id: taskId, status: task.status, assignedUserId: task.assignedUserId },
                    data: { status: 'IN_PROGRESS', assignedUserId: providerId },
                });
                if (claim.count === 0) {
                    throw new Error('TASK_NOT_OPEN');
                }
                // Replacing someone puts them back in the pool rather than out
                // of it — same reason the losing bids are left alone.
                if (task.assignedUserId) {
                    await tx.response.updateMany({
                        where: { taskId, userId: task.assignedUserId, status: 'ACCEPTED' },
                        data: { status: 'PENDING' },
                    });
                }
                await tx.response.update({
                    where: { id: providerResponse.id },
                    data: { status: 'ACCEPTED' },
                });
                await tx.notification.create({
                    data: {
                        userId: providerId,
                        type: 'OFFER_ACCEPTED',
                        title: providerStrings.acceptedTitle,
                        message: providerStrings.acceptedBody(task.title),
                        params: notificationParams({ task: task.title }),
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
