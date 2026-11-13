import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/require-auth';
import { alertPlan } from '@/lib/task-alerts';

/**
 * The caller's new-task alert switch (lib/task-alerts.ts).
 *
 * `plan` is the tier the alerts follow: 'free' (no alerts), 'pro' (15 minutes
 * after posting), 'pro_plus' or 'business' (at once). Kept apart from
 * PUT /api/profile, which requires a full name.
 */
const SELECT = {
    taskAlertsEnabled: true,
    subscription: { select: { plan: true, isActive: true, endDate: true } },
} as const;

function toState(user: { taskAlertsEnabled: boolean; subscription: { plan: string; isActive: boolean; endDate: Date } | null }) {
    return { enabled: user.taskAlertsEnabled, plan: alertPlan(user.subscription) ?? 'free' };
}

export async function GET(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }
        const user = await prisma.user.findUnique({ where: { id: payload.id as string }, select: SELECT });
        if (!user) {
            return NextResponse.json({ error: 'Пользователь не найден' }, { status: 404 });
        }
        return NextResponse.json(toState(user));
    } catch (error) {
        console.error('Get Task Alerts Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function PUT(request: Request) {
    try {
        const payload = await requireAuth(request);
        if (!payload?.id) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const body = await request.json().catch(() => null);
        if (typeof body?.enabled !== 'boolean') {
            return NextResponse.json({ error: 'Некорректное значение настройки' }, { status: 400 });
        }

        const user = await prisma.user.update({
            where: { id: payload.id as string },
            data: { taskAlertsEnabled: body.enabled },
            select: SELECT,
        });
        return NextResponse.json(toState(user));
    } catch (error) {
        console.error('Set Task Alerts Error:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
