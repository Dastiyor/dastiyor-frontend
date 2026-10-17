import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLANS, isValidPlan, createSmartPayOrder, generateOrderId } from '@/lib/payments';
import { requireAuth } from '@/lib/require-auth';
import { SUBSCRIPTIONS_ENABLED } from '@/lib/features';
import { subscriptionView } from '@/lib/payments/subscription-view';

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';

// GET - Get current subscription
export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const subscription = await prisma.subscription.findUnique({
            where: { userId: payload.id as string }
        });

        return NextResponse.json({ subscription: subscriptionView(subscription) });

    } catch (error) {
        console.error('Get Subscription Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - Initiate subscription payment via SmartPay
export async function POST(request: Request) {
    try {
        // Subscriptions are temporarily hidden — see lib/features.ts
        if (!SUBSCRIPTIONS_ENABLED) {
            return NextResponse.json({ error: 'Подписки недоступны' }, { status: 404 });
        }

        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.id as string;
        const body = await request.json();
        const { plan } = body;

        if (!plan || !isValidPlan(plan)) {
            return NextResponse.json({ error: 'Неверный тариф' }, { status: 400 });
        }

        const planConfig = PLANS[plan];
        const orderId = generateOrderId();

        // Payer phone and name prefill the SmartPay invoice
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { phone: true, fullName: true }
        });

        // Create a pending payment record in our DB
        const payment = await prisma.payment.create({
            data: {
                userId,
                amount: planConfig.price,
                currency: 'TJS',
                status: 'PENDING',
                type: 'SUBSCRIPTION',
                description: `Подписка ${planConfig.nameRu}`,
                plan,
                smartpayOrderId: orderId,
            }
        });

        // Create order with SmartPay
        const smartPayResult = await createSmartPayOrder({
            orderId,
            amount: planConfig.price,
            description: `Dastiyor — Подписка ${planConfig.nameRu} (${planConfig.durationDays} дн.)`,
            returnUrl: `${APP_URL}/payment/result?orderId=${orderId}`,
            customerPhone: user?.phone || undefined,
            customerName: user?.fullName || undefined,
        });

        if (!smartPayResult.success) {
            // Mark payment as failed
            await prisma.payment.update({
                where: { id: payment.id },
                data: { status: 'FAILED' }
            });
            return NextResponse.json(
                { error: 'Не удалось создать платёж. Попробуйте позже.' },
                { status: 502 }
            );
        }

        // Save SmartPay transaction ID
        await prisma.payment.update({
            where: { id: payment.id },
            data: { transactionId: smartPayResult.transactionId }
        });

        // Return the payment URL for the frontend to redirect to
        return NextResponse.json({
            paymentUrl: smartPayResult.paymentUrl,
            orderId,
            paymentId: payment.id,
        });

    } catch (error) {
        console.error('Subscription Payment Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// DELETE - Cancel subscription
export async function DELETE(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.id as string;

        const subscription = await prisma.subscription.findUnique({
            where: { userId }
        });

        if (!subscription) {
            return NextResponse.json({ error: 'Подписка не найдена' }, { status: 404 });
        }

        // Don't delete, just mark as inactive (subscription continues until end date)
        await prisma.subscription.update({
            where: { userId },
            data: { isActive: false }
        });

        return NextResponse.json({
            message: 'Subscription cancelled. You will have access until the end of your billing period.'
        });

    } catch (error) {
        console.error('Cancel Subscription Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
