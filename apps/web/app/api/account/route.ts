import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { logAction, getRequestIP } from '@/lib/audit';

// DELETE - Permanently delete the authenticated user's account and all
// associated data. Required by App Store guideline 5.1.1(v) and Google Play
// account-deletion policy. Irreversible.
export async function DELETE(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload || !payload.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const userId = payload.id as string;

        await prisma.$transaction(async (tx) => {
            const userRecord = await tx.user.findUnique({
                where: { id: userId },
                select: { phone: true },
            });
            if (userRecord?.phone) {
                await tx.verificationCode.deleteMany({ where: { phone: userRecord.phone } });
            }

            // Tasks owned by this user — their child rows must go first.
            const ownedTasks = await tx.task.findMany({
                where: { userId },
                select: { id: true },
            });
            const taskIds = ownedTasks.map((t) => t.id);

            // Children referencing either the user directly or the user's tasks.
            await tx.taskFavorite.deleteMany({
                where: { OR: [{ userId }, { taskId: { in: taskIds } }] },
            });
            await tx.review.deleteMany({
                where: {
                    OR: [
                        { reviewerId: userId },
                        { reviewedId: userId },
                        { taskId: { in: taskIds } },
                    ],
                },
            });
            await tx.message.deleteMany({
                where: {
                    OR: [
                        { senderId: userId },
                        { receiverId: userId },
                        { taskId: { in: taskIds } },
                    ],
                },
            });
            await tx.response.deleteMany({
                where: { OR: [{ userId }, { taskId: { in: taskIds } }] },
            });
            await tx.report.deleteMany({
                where: {
                    OR: [
                        { reporterId: userId },
                        { targetUserId: userId },
                        { targetTaskId: { in: taskIds } },
                    ],
                },
            });
            await tx.notification.deleteMany({ where: { userId } });
            await tx.passwordReset.deleteMany({ where: { userId } });
            await tx.payment.deleteMany({ where: { userId } });
            await tx.subscription.deleteMany({ where: { userId } });
            await tx.pushSubscription.deleteMany({ where: { userId } });
            await tx.deviceToken.deleteMany({ where: { userId } });

            // Audit logs: keep the trail but drop the personal link.
            await tx.actionLog.updateMany({
                where: { userId },
                data: { userId: null },
            });

            // Other users' tasks assigned to this user — unassign, don't delete.
            await tx.task.updateMany({
                where: { assignedUserId: userId },
                data: { assignedUserId: null },
            });

            // Now the user's own tasks, then the user.
            await tx.task.deleteMany({ where: { userId } });
            await tx.user.delete({ where: { id: userId } });
        });

        logAction({
            action: 'DELETE_ACCOUNT',
            userId: null,
            entity: 'User',
            entityId: userId,
            ipAddress: getRequestIP(request),
        });

        return NextResponse.json({ message: 'Account deleted successfully' });
    } catch (error) {
        console.error('Delete Account Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
