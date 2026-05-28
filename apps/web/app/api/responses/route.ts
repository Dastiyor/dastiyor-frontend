import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { logAction, getRequestIP } from '@/lib/audit';
import { sendTaskResponseNotification } from '@/lib/notifications/email';
import { sendPushNotification } from '@/lib/web-push';
import { requireAuth } from '@/lib/require-auth';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const clientIP = getClientIP(request);
        const rateLimit = await checkRateLimit(clientIP, 'responses');

        if (!rateLimit.allowed) {
            return rateLimitExceededResponse(rateLimit.resetIn);
        }

        // 1. Authenticate Request
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // 2. Load User
        // TODO: Re-enable subscription include when payment gateway is ready
        const user = await prisma.user.findUnique({
            where: { id: payload.id as string }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 3. Enforce Provider Role
        if (user.role !== 'PROVIDER') {
            return NextResponse.json(
                { error: 'Only providers can respond to tasks', code: 'PROVIDER_REQUIRED' },
                { status: 403 }
            );
        }

        // Subscription gate — active when SUBSCRIPTION_GATE_ENABLED=true
        if (process.env.SUBSCRIPTION_GATE_ENABLED === 'true') {
            const subscription = await prisma.subscription.findUnique({
                where: { userId: payload.id as string },
                select: { isActive: true, endDate: true, plan: true },
            });
            const hasActiveSub =
                subscription?.isActive && new Date(subscription.endDate) > new Date();
            if (!hasActiveSub) {
                return NextResponse.json(
                    { error: 'Active subscription required to respond', code: 'SUBSCRIPTION_REQUIRED' },
                    { status: 403 }
                );
            }
        }

        // 4. Parse Body
        const body = await request.json();
        const { taskId, message, price, estimatedTime } = body;

        if (!taskId || !message || !price) {
            return NextResponse.json(
                { error: 'Missing required fields' },
                { status: 400 }
            );
        }

        // Fetch the task and its owner for notification
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { userId: true, title: true, status: true, user: { select: { email: true } } }
        });

        if (!task) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 }
            );
        }

        // Only allow responses on open tasks
        if (task.status !== 'OPEN') {
            return NextResponse.json(
                { error: 'This task is no longer accepting responses' },
                { status: 409 }
            );
        }

        // Prevent duplicate responses from same provider
        const existingResponse = await prisma.response.findFirst({
            where: { taskId, userId: payload.id as string },
            select: { id: true },
        });
        if (existingResponse) {
            return NextResponse.json(
                { error: 'You have already submitted a response for this task' },
                { status: 409 }
            );
        }

        const priceStr = price.toString();
        const priceNum = parseInt(priceStr, 10);
        const response = await prisma.response.create({
            data: {
                taskId,
                userId: payload.id as string,
                message,
                price: priceStr,
                priceNum: !isNaN(priceNum) ? priceNum : null,
                estimatedTime: estimatedTime || null,
                status: 'PENDING'
            }
        });

        // Create notification for task owner
        await prisma.notification.create({
            data: {
                userId: task.userId,
                type: 'NEW_OFFER',
                title: 'Новое предложение',
                message: `На ваше задание "${task.title}" поступило новое предложение: ${price} с.`,
                link: `/tasks/${taskId}`
            }
        });

        // Send email notification to task owner (non-blocking)
        if (task.user?.email) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
            sendTaskResponseNotification(
                task.user.email!,
                task.title,
                user.fullName || 'Исполнитель',
                priceStr,
                `${baseUrl}/tasks/${taskId}`
            ).catch(err => console.error('Email notification error:', err));
        }

        // Web push notification to task owner (non-blocking)
        sendPushNotification(task.userId, {
            title: 'Новое предложение',
            body: `${user.fullName || 'Исполнитель'} предложил ${priceStr} с. за "${task.title}"`,
            url: `/tasks/${taskId}`,
        }).catch(() => {});

        logAction({
            action: 'SUBMIT_RESPONSE',
            userId: payload.id as string,
            entity: 'Response',
            entityId: response.id,
            details: { taskId, price: priceStr },
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({
            message: 'Response submitted successfully',
            response
        }, { status: 201 });

    } catch (error) {
        console.error('Response Creation Error:', error);
        return NextResponse.json(
            { error: 'Internal Server Error' },
            { status: 500 }
        );
    }
}
