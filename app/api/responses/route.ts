import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { checkRateLimit, getClientIP, rateLimitExceededResponse } from '@/lib/rate-limit';
import { sendTaskResponseNotification } from '@/lib/notifications/email';

export async function POST(request: Request) {
    try {
        // Rate limiting
        const clientIP = getClientIP(request);
        const rateLimit = checkRateLimit(clientIP, 'responses');

        if (!rateLimit.allowed) {
            return rateLimitExceededResponse(rateLimit.resetIn);
        }

        // 1. Authenticate Request
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json(
                { error: 'Unauthorized' },
                { status: 401 }
            );
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json(
                { error: 'Unauthorized: Invalid token' },
                { status: 401 }
            );
        }

        // 2. Load User with Subscription
        const user = await prisma.user.findUnique({
            where: { id: payload.id as string },
            include: { subscription: true }
        });

        if (!user) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // 3. Enforce Provider Role & Subscription
        if (user.role !== 'PROVIDER') {
            return NextResponse.json(
                { error: 'Only providers can respond to tasks', code: 'PROVIDER_REQUIRED' },
                { status: 403 }
            );
        }

        const hasActiveSubscription = user.subscription &&
            user.subscription.isActive &&
            new Date(user.subscription.endDate) > new Date();

        if (!hasActiveSubscription) {
            return NextResponse.json(
                { error: 'Active subscription required to respond', code: 'SUBSCRIPTION_REQUIRED' },
                { status: 403 }
            );
        }

        // 4. Check Response Limits based on plan
        const planLimits: Record<string, { limit: number, period: 'daily' | 'monthly' }> = {
            'basic': { limit: 15, period: 'daily' }, // Basic: 15 per day
            'standard': { limit: 50, period: 'monthly' }, // Standard: 50 per month
            'premium': { limit: Infinity, period: 'monthly' } // Premium: unlimited
        };

        const userPlan = user.subscription!.plan.toLowerCase();
        const planConfig = planLimits[userPlan] || { limit: 15, period: 'daily' };

        if (planConfig.limit === Infinity) {
            // Premium plan - no limit check needed
        } else {
            let startDate: Date;
            if (planConfig.period === 'daily') {
                // Count responses today
                startDate = new Date();
                startDate.setHours(0, 0, 0, 0);
            } else {
                // Count responses this month
                startDate = new Date();
                startDate.setDate(1);
                startDate.setHours(0, 0, 0, 0);
            }

            const responseCount = await prisma.response.count({
                where: {
                    userId: user.id,
                    createdAt: {
                        gte: startDate
                    }
                }
            });

            if (responseCount >= planConfig.limit) {
                const periodText = planConfig.period === 'daily' ? 'сегодня' : 'в этом месяце';
                return NextResponse.json(
                    {
                        error: `Вы достигли лимита откликов (${planConfig.limit} ${planConfig.period === 'daily' ? 'в день' : 'в месяц'}) для вашего плана "${user.subscription!.plan}". Обновите подписку для большего количества откликов.`,
                        code: 'RESPONSE_LIMIT_REACHED',
                        limit: planConfig.limit,
                        used: responseCount,
                        period: planConfig.period
                    },
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
            select: { userId: true, title: true, user: { select: { email: true } } }
        });

        if (!task) {
            return NextResponse.json(
                { error: 'Task not found' },
                { status: 404 }
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
                task.user.email,
                task.title,
                user.fullName || 'Исполнитель',
                priceStr,
                `${baseUrl}/tasks/${taskId}`
            ).catch(err => console.error('Email notification error:', err));
        }

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
