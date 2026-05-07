import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT } from '@/lib/auth';
import { cookies } from 'next/headers';
import { PLANS, isValidPlan } from '@/lib/payments';

// GET - Check payment status by orderId
export async function GET(request: Request) {
    try {
        const cookieStore = await cookies();
        const token = cookieStore.get('token')?.value;

        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { searchParams } = new URL(request.url);
        const orderId = searchParams.get('orderId');

        if (!orderId) {
            return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
        }

        const payment = await prisma.payment.findUnique({
            where: { smartpayOrderId: orderId }
        });

        if (!payment) {
            return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
        }

        // Ensure user can only check their own payments
        if (payment.userId !== payload.id) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        const planName = payment.plan && isValidPlan(payment.plan)
            ? PLANS[payment.plan].nameRu
            : null;

        return NextResponse.json({
            status: payment.status,
            planName,
            amount: payment.amount,
            currency: payment.currency,
        });

    } catch (error) {
        console.error('Payment Status Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
