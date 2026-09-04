import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { notificationStrings } from '@/lib/notifications/strings';
import { isValidId } from '@/lib/validation';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { logAction, getRequestIP } from '@/lib/audit';
import { validateResponseInput } from '@/lib/validation';
import { sendTaskResponseNotification } from '@/lib/notifications/email';
import { sendPushNotification } from '@/lib/web-push';
import { requireAuth } from '@/lib/require-auth';
import { needsPhoneVerification, PHONE_VERIFICATION_REQUIRED } from '@/lib/phone-gate';

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
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }

        // 3. Enforce Provider Role
        if (user.role !== 'PROVIDER') {
            return NextResponse.json(
                { error: 'Откликаться на задания могут только исполнители', code: 'PROVIDER_REQUIRED' },
                { status: 403 }
            );
        }

        // Every user must verify a phone number before responding to tasks
        if (needsPhoneVerification(user)) {
            return NextResponse.json(
                { error: 'Подтвердите номер телефона, чтобы откликаться на задания', code: PHONE_VERIFICATION_REQUIRED },
                { status: 403 }
            );
        }

        // Subscription gate — disabled only when SUBSCRIPTION_GATE_ENABLED=false
        if (process.env.SUBSCRIPTION_GATE_ENABLED !== 'false') {
            const subscription = await prisma.subscription.findUnique({
                where: { userId: payload.id as string },
                select: { isActive: true, endDate: true, plan: true },
            });
            const hasActiveSub =
                subscription?.isActive && new Date(subscription.endDate) > new Date();
            if (!hasActiveSub) {
                return NextResponse.json(
                    { error: 'Для отклика нужна активная подписка', code: 'SUBSCRIPTION_REQUIRED' },
                    { status: 403 }
                );
            }
        }

        // 4. Parse Body
        const body = await request.json();
        const { taskId, message, price, estimatedTime } = body;

        if (!isValidId(taskId) || !message || !price) {
            return NextResponse.json(
                { error: 'Заполнены не все обязательные поля' },
                { status: 400 }
            );
        }

        // Server-side validation: minimum message length and price sanity check
        const inputValidation = validateResponseInput({
            message: String(message),
            price: String(price),
        });
        if (!inputValidation.isValid) {
            return NextResponse.json({ error: inputValidation.errors[0] }, { status: 400 });
        }

        // Fetch the task and its owner for notification
        const task = await prisma.task.findUnique({
            where: { id: taskId },
            select: { userId: true, title: true, status: true, user: { select: { email: true, locale: true } } }
        });

        if (!task) {
            return NextResponse.json(
                { error: 'Задание не найдено' },
                { status: 404 }
            );
        }

        // Bidding on your own task lets one account run the whole lifecycle --
        // post, bid, accept, complete, review itself -- and manufacture a 5.0
        // rating, a completed-job count and a balance with no counterparty.
        // Customers pick providers on exactly those numbers.
        if (task.userId === (payload.id as string)) {
            return NextResponse.json(
                { error: 'Нельзя откликнуться на собственное задание' },
                { status: 403 }
            );
        }

        // Only allow responses on open tasks
        if (task.status !== 'OPEN') {
            return NextResponse.json(
                { error: 'Это задание больше не принимает отклики' },
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
                { error: 'Вы уже откликнулись на это задание', code: 'DUPLICATE_RESPONSE' },
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
        const ownerStrings = notificationStrings(task.user?.locale);

        await prisma.notification.create({
            data: {
                userId: task.userId,
                type: 'NEW_OFFER',
                title: ownerStrings.newResponseTitle,
                message: ownerStrings.newResponseBody(user.fullName || 'Исполнитель', String(price), task.title),
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
                `${baseUrl}/tasks/${taskId}`,
                task.user?.locale,
            ).catch(err => console.error('Email notification error:', err));
        }

        // Web push notification to task owner (non-blocking)
        sendPushNotification(task.userId, {
            title: ownerStrings.newResponseTitle,
            body: ownerStrings.newResponseBody(user.fullName || 'Исполнитель', priceStr, task.title),
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
