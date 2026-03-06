import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendTaskCompletedNotification } from '@/lib/notifications/email';

export async function POST(request: Request) {
    try {
        // 1. Authenticate
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const currentUserId = payload.id as string;

        // 2. Parse Body
        const body = await request.json();
        const { taskId } = body;

        if (!taskId) {
            return NextResponse.json({ error: 'Missing taskId' }, { status: 400 });
        }

        // 3. Verify Ownership & Current Status
        const task = await prisma.task.findUnique({
            where: { id: taskId }
        });

        if (!task) {
            return NextResponse.json({ error: 'Task not found' }, { status: 404 });
        }

        if (task.userId !== currentUserId) {
            return NextResponse.json({ error: 'Forbidden: You do not own this task' }, { status: 403 });
        }

        if (task.status !== 'IN_PROGRESS') {
            return NextResponse.json({ error: 'Task must be in progress to complete' }, { status: 400 });
        }

        // 4. Update Task
        const updatedTask = await prisma.task.update({
            where: { id: taskId },
            data: {
                status: 'COMPLETED'
            }
        });

        // Update provider balance if task has fixed budget
        if (task.assignedUserId && task.budgetType === 'fixed' && task.budgetAmount) {
            const amount = parseFloat(task.budgetAmount);
            if (!isNaN(amount) && amount > 0) {
                await prisma.user.update({
                    where: { id: task.assignedUserId },
                    data: {
                        balance: {
                            increment: amount
                        }
                    }
                });
            }
        }

        // Notify Provider if assigned
        if (task.assignedUserId) {
            await prisma.notification.create({
                data: {
                    userId: task.assignedUserId,
                    type: 'TASK_COMPLETED',
                    title: 'Задание выполнено',
                    message: `Заказчик подтвердил выполнение задания "${task.title}".${task.budgetType === 'fixed' && task.budgetAmount ? ` Баланс пополнен на ${task.budgetAmount} с.` : ''}`,
                    link: `/tasks/${taskId}`
                }
            });

            // Send email notification to provider (non-blocking)
            const provider = await prisma.user.findUnique({
                where: { id: task.assignedUserId },
                select: { email: true }
            });
            if (provider?.email) {
                const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
                const earnings = task.budgetType === 'fixed' && task.budgetAmount ? task.budgetAmount : undefined;
                sendTaskCompletedNotification(
                    provider.email,
                    task.title,
                    `${baseUrl}/tasks/${taskId}`,
                    earnings
                ).catch(err => console.error('Email notification error:', err));
            }
        }

        return NextResponse.json({ message: 'Task completed', task: updatedTask });

    } catch (error) {
        console.error('Complete Task Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
