import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { PLANS, isValidPlan, createSmartPayOrder, generateOrderId } from '@/lib/payments';
import { requireAuth } from '@/lib/require-auth';

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

        if (!subscription) {
            return NextResponse.json({ subscription: null });
        }

        const isActive = subscription.isActive && new Date(subscription.endDate) > new Date();

        return NextResponse.json({
            subscription: {
                ...subscription,
                isCurrentlyActive: isActive,
                daysRemaining: isActive
                    ? Math.ceil((new Date(subscription.endDate).getTime() - Date.now()) / (1000 * 60 * 60 * 24))
                    : 0
            }
        });

    } catch (error) {
        console.error('Get Subscription Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

// POST - Initiate subscription payment via SmartPay
export async function POST(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.id as string;
        const body = await request.json();
        const { plan } = body;

        if (!plan || !isValidPlan(plan)) {
            return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
        }

        const planConfig = PLANS[plan];
        const orderId = generateOrderId();

        // Fetch user email/phone for SmartPay
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { email: true, phone: true }
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
            currency: 'TJS',
            description: `Dastiyor — Подписка ${planConfig.nameRu} (${planConfig.durationDays} дн.)`,
            returnUrl: `${APP_URL}/payment/result?orderId=${orderId}`,
            callbackUrl: `${APP_URL}/api/webhooks/smartpay`,
            customerEmail: user?.email ?? undefined,
            customerPhone: user?.phone || undefined,
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
            return NextResponse.json({ error: 'No subscription found' }, { status: 404 });
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
