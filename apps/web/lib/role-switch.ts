import { prisma } from '@/lib/prisma';
import { sendTaskCancelledNotification } from '@/lib/notifications/email';

/**
 * Switching an account between CUSTOMER and PROVIDER, for people who picked
 * the wrong role at signup (usually providers who signed up as customers and
 * then advertised their services as tasks).
 *
 * What a switch leaves behind:
 * - CUSTOMER → PROVIDER: the customer's OPEN tasks are cancelled, exactly as
 *   POST /api/tasks/cancel would (pending responses rejected, responders emailed).
 *   A provider has no screen to manage them from.
 * - PROVIDER → CUSTOMER: the provider's PENDING responses are withdrawn.
 * Blocked while any task the user owns or is assigned to is IN_PROGRESS, and
 * PROVIDER → CUSTOMER while a paid plan is running (it would be lost).
 */

export type AccountRole = 'CUSTOMER' | 'PROVIDER';

export const ROLE_SWITCH_ERRORS = {
    invalidRole: 'Неверный тип аккаунта',
    sameRole: 'У вас уже этот тип аккаунта',
    inProgress: 'Сначала завершите задания, которые сейчас в работе',
    activePlan: 'У вас действует платный тариф. Сменить тип аккаунта можно после его окончания',
} as const;

export interface RoleSwitchPreview {
    role: AccountRole;
    target: AccountRole;
    /** OPEN tasks that will be cancelled (CUSTOMER → PROVIDER). */
    openTasks: number;
    /** PENDING responses that will be withdrawn (PROVIDER → CUSTOMER). */
    pendingResponses: number;
    /** Russian error text when the switch is not allowed right now. */
    blocker: string | null;
}

export function isAccountRole(value: unknown): value is AccountRole {
    return value === 'CUSTOMER' || value === 'PROVIDER';
}

export async function getRoleSwitchPreview(userId: string): Promise<RoleSwitchPreview | null> {
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: { role: true, subscription: { select: { isActive: true, endDate: true } } },
    });
    if (!user || !isAccountRole(user.role)) return null;

    const role = user.role;
    const target: AccountRole = role === 'CUSTOMER' ? 'PROVIDER' : 'CUSTOMER';

    const [inProgress, openTasks, pendingResponses] = await Promise.all([
        prisma.task.count({
            where: { status: 'IN_PROGRESS', OR: [{ userId }, { assignedUserId: userId }] },
        }),
        role === 'CUSTOMER' ? prisma.task.count({ where: { userId, status: 'OPEN' } }) : 0,
        role === 'PROVIDER' ? prisma.response.count({ where: { userId, status: 'PENDING' } }) : 0,
    ]);

    const sub = user.subscription;
    const paidPlanRunning = role === 'PROVIDER' && !!sub?.isActive && sub.endDate > new Date();

    const blocker = inProgress > 0
        ? ROLE_SWITCH_ERRORS.inProgress
        : paidPlanRunning
            ? ROLE_SWITCH_ERRORS.activePlan
            : null;

    return { role, target, openTasks, pendingResponses, blocker };
}

export type RoleSwitchResult =
    | { ok: true; role: AccountRole; cancelledTasks: number; withdrawnResponses: number }
    | { ok: false; status: number; error: string };

export async function switchRole(userId: string, target: unknown): Promise<RoleSwitchResult> {
    if (!isAccountRole(target)) {
        return { ok: false, status: 400, error: ROLE_SWITCH_ERRORS.invalidRole };
    }

    const preview = await getRoleSwitchPreview(userId);
    if (!preview) return { ok: false, status: 404, error: 'Пользователь не найден' };
    if (preview.role === target) return { ok: false, status: 400, error: ROLE_SWITCH_ERRORS.sameRole };
    if (preview.blocker) return { ok: false, status: 409, error: preview.blocker };

    const cancelled = target === 'PROVIDER'
        ? await prisma.task.findMany({
            where: { userId, status: 'OPEN' },
            select: {
                id: true,
                title: true,
                responses: {
                    where: { status: 'PENDING' },
                    select: { user: { select: { email: true, locale: true } } },
                },
            },
        })
        : [];
    const taskIds = cancelled.map((t) => t.id);

    const withdrawn = await prisma.$transaction(async (tx) => {
        let withdrawnCount = 0;
        if (taskIds.length > 0) {
            await tx.task.updateMany({ where: { id: { in: taskIds }, status: 'OPEN' }, data: { status: 'CANCELLED' } });
            await tx.response.updateMany({ where: { taskId: { in: taskIds }, status: 'PENDING' }, data: { status: 'REJECTED' } });
        }
        if (target === 'CUSTOMER') {
            // Withdrawn, not rejected: the customer never turned these down.
            const { count } = await tx.response.deleteMany({ where: { userId, status: 'PENDING' } });
            withdrawnCount = count;
        }
        await tx.user.update({ where: { id: userId }, data: { role: target } });
        return withdrawnCount;
    });

    // Same notice POST /api/tasks/cancel sends; after the commit, never throws.
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL || 'https://dastiyor.com';
    for (const task of cancelled) {
        for (const resp of task.responses) {
            if (!resp.user?.email) continue;
            sendTaskCancelledNotification(resp.user.email, task.title, `${baseUrl}/tasks`, resp.user.locale)
                .catch((err) => console.error('Email notification error:', err));
        }
    }

    return { ok: true, role: target, cancelledTasks: taskIds.length, withdrawnResponses: withdrawn };
}
