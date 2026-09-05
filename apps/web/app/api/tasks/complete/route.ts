import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notificationStrings, notificationParams } from '@/lib/notifications/strings';
import { sendPushNotification } from '@/lib/web-push';
import { isValidId } from '@/lib/validation';
import { sendTaskCompletedNotification } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';
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
        const { taskId } = body;

        if (!isValidId(taskId)) {
            return NextResponse.json({ error: 'Не указан ID задания' }, { status: 400 });
        }

        // 3. Verify Ownership & Current Status
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: 'Задание не найдено' }, { status: 404 });
        }

        if (task.userId !== currentUserId) {
            return NextResponse.json({ error: 'Доступ запрещён: это не ваше задание' }, { status: 403 });
        }

        if (task.status !== 'IN_PROGRESS') {
            return NextResponse.json({ error: 'Завершить можно только задание в работе' }, { status: 400 });
        }

        // 4. Update Task and provider balance atomically
        // Use budgetAmountNum (integer DB column) — avoids float parsing inaccuracy
        const balanceIncrement =
            task.assignedUserId && task.budgetType === 'fixed' && task.budgetAmountNum != null
                ? task.budgetAmountNum
                : 0;

        let updatedTask;
        try {
            updatedTask = await prisma.$transaction(async (tx) => {
                // Atomic claim: only the call that flips IN_PROGRESS -> COMPLETED wins.
                // A losing duplicate POST gets count === 0 and aborts before crediting balance.
                const claim = await tx.task.updateMany({
                    where: { id: taskId, status: 'IN_PROGRESS' },
                    data: { status: 'COMPLETED' },
                });
                if (claim.count === 0) {
                    throw new Error('TASK_NOT_IN_PROGRESS');
                }
                // The provider's own list shows the response status, not the
                // task status — without this a finished job still reads
                // "Accepted" on their side.
                if (task.assignedUserId) {
                    await tx.response.updateMany({
                        where: { taskId, userId: task.assignedUserId, status: 'ACCEPTED' },
                        data: { status: 'COMPLETED' },
                    });
                }
                // Accepting deliberately leaves the other bids PENDING so the
                // customer can still switch providers. The job being done is
                // what finally closes that option.
                await tx.response.updateMany({
                    where: { taskId, status: 'PENDING' },
                    data: { status: 'REJECTED' },
                });
                if (task.assignedUserId && balanceIncrement > 0) {
                    await tx.user.update({
                        where: { id: task.assignedUserId },
                        data: { balance: { increment: balanceIncrement } },
                    });
                }
                return await tx.task.findUnique({ where: { id: taskId } });
            });
        } catch (error) {
            if (error instanceof Error && error.message === 'TASK_NOT_IN_PROGRESS') {
                return NextResponse.json({ error: 'Завершить можно только задание в работе' }, { status: 400 });
            }
            throw error;
        }

        // Notify Provider if assigned
        if (task.assignedUserId) {
            const providerStrings = notificationStrings(
                (await prisma.user.findUnique({ where: { id: task.assignedUserId }, select: { locale: true } }))?.locale
            );

            await prisma.notification.create({
                data: {
                    userId: task.assignedUserId,
                    type: 'TASK_COMPLETED',
                    title: providerStrings.completedTitle,
                    message: providerStrings.completedBody(task.title, balanceIncrement),
                    params: notificationParams({ task: task.title, credited: balanceIncrement }),
                    link: `/tasks/${taskId}`
                }
            });

            // Push too, matching the accept and new-response events. Being told
            // the job is done -- and the balance credited -- should not require
            // opening the app to notice.
            sendPushNotification(task.assignedUserId, {
                title: providerStrings.completedTitle,
                body: providerStrings.completedBody(task.title, balanceIncrement),
                url: `/tasks/${taskId}`,
            }).catch(() => {});

            // Send email notification to provider (non-blocking)
            const provider = await prisma.user.findUnique({
                where: { id: task.assignedUserId },
                select: { email: true, locale: true }
            });
            if (provider?.email) {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
                const earnings = balanceIncrement > 0 ? String(balanceIncrement) : undefined;
                sendTaskCompletedNotification(
                    provider.email,
                    task.title,
                    `${baseUrl}/tasks/${taskId}`,
                    earnings,
                    provider?.locale,
                ).catch(err => console.error('Email notification error:', err));
            }
        }

        logAction({
            action: 'COMPLETE_TASK',
            userId: currentUserId,
            entity: 'Task',
            entityId: taskId,
            details: { assignedUserId: task.assignedUserId },
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({ message: 'Task completed', task: updatedTask });

    } catch (error) {
        console.error('Complete Task Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
