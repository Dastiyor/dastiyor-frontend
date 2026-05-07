import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { verifyJWT, getBearerToken } from '@/lib/auth';
import { cookies } from 'next/headers';
import { sendOfferRejectedNotification } from '@/lib/notifications/email';
import { logAction, getRequestIP } from '@/lib/audit';

export async function POST(request: Request) {
    try {
        const bearerToken = getBearerToken(request);
        let token: string | undefined = bearerToken ?? undefined;
        if (!token) {
            const cookieStore = await cookies();
            token = cookieStore.get('token')?.value;
        }
        if (!token) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const payload = await verifyJWT(token);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.id as string;
        const body = await request.json();
        const { responseId } = body;

        if (!responseId) {
            return NextResponse.json({ error: 'Response ID is required' }, { status: 400 });
        }

        // Get the response and task
        const response = await prisma.response.findUnique({
            where: { id: responseId },
            include: { task: true }
        });

        if (!response) {
            return NextResponse.json({ error: 'Response not found' }, { status: 404 });
        }

        // Verify the user is the task owner
        if (response.task.userId !== userId) {
            return NextResponse.json({ error: 'Only task owner can reject responses' }, { status: 403 });
        }

        // Can only reject pending responses
        if (response.status !== 'PENDING') {
            return NextResponse.json({
                error: 'Only pending responses can be rejected'
            }, { status: 400 });
        }

        // Update response status
        await prisma.response.update({
            where: { id: responseId },
            data: { status: 'REJECTED' }
        });

        // Notify the provider
        await prisma.notification.create({
            data: {
                userId: response.userId,
                type: 'OFFER_REJECTED',
                title: 'Отклик отклонен',
                message: `Ваш отклик на задание "${response.task.title}" был отклонен заказчиком.`,
                link: `/tasks/${response.taskId}`
            }
        });

        // Send email notification to provider (non-blocking)
        const provider = await prisma.user.findUnique({
            where: { id: response.userId },
            select: { email: true }
        });
        if (provider?.email) {
            const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
            sendOfferRejectedNotification(
                provider.email,
                response.task.title,
                `${baseUrl}/tasks`
            ).catch(err => console.error('Email notification error:', err));
        }

        logAction({
            action: 'REJECT_RESPONSE',
            userId,
            entity: 'Response',
            entityId: responseId,
            details: { taskId: response.taskId, providerId: response.userId },
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({
            message: 'Response rejected successfully'
        });

    } catch (error) {
        console.error('Reject Response Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
