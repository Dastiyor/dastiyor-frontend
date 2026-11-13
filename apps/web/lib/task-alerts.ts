/**
 * New-task alerts for providers on a paid plan.
 *
 * When a customer posts a task, providers whose categories (and city) match
 * hear about it: an in-app Notification row, web push and Expo push.
 *
 * - PRO+ and BUSINESS: at once, after the POST /api/tasks response is sent.
 * - PRO: 15 minutes later. A TaskAlert row is queued per provider and
 *   GET /api/cron/send-task-alerts sends it, if the task is still open and the
 *   provider still has a paid plan. Rows older than 2 hours are dropped.
 * - FREE: nothing.
 *
 * Matching: the task's category is one of the provider's `categories`, and
 * the city matches -- a provider with no city set hears about every city, and
 * an online task ('Онлайн') goes to every city. The task's author and
 * providers who switched alerts off (`taskAlertsEnabled`) are left out.
 */
import { after } from 'next/server';
import { randomUUID } from 'crypto';
import type { Prisma } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { normalizePlan, type PlanId } from '@/lib/plans';
import { categoryName, notificationParams, notificationStrings } from '@/lib/notifications/strings';
import { sendPushToMany } from '@/lib/web-push';
import { logger } from '@/lib/logger';

export const PRO_DELAY_MS = 15 * 60 * 1000;
export const MAX_ALERT_AGE_MS = 2 * 60 * 60 * 1000;
/** Most providers alerted about one task. */
export const MAX_RECIPIENTS = 500;
/** Most queued alerts one drain run claims. */
export const DRAIN_BATCH = 500;
/** Finished rows are kept this long, then deleted. */
const KEEP_MS = 2 * 24 * 60 * 60 * 1000;

const IMMEDIATE_PLANS: PlanId[] = ['pro_plus', 'business'];
const DELAYED_PLANS: PlanId[] = ['pro'];
const ONLINE_CITY = 'Онлайн';

export interface AlertTask {
    id: string;
    title: string;
    category: string;
    city: string;
    userId: string;
    createdAt: Date;
}

interface Recipient {
    id: string;
    locale: string | null;
}

/** The alert tier of a subscription: null when it is not a paid, active one. */
export function alertPlan(
    subscription: { plan: string; isActive: boolean; endDate: Date } | null | undefined,
    now: Date = new Date(),
): PlanId | null {
    if (!subscription || !subscription.isActive || subscription.endDate <= now) return null;
    return normalizePlan(subscription.plan);
}

const activeSubscription = (now: Date): Prisma.UserWhereInput['subscription'] => ({
    is: { isActive: true, endDate: { gt: now } },
});

/**
 * Called once from POST /api/tasks. Synchronous and never throws: the work
 * runs after the response is sent, so posting a task never waits on alerts or
 * fails because of them.
 */
export function queueTaskAlerts(task: AlertTask): void {
    const run = () =>
        dispatchTaskAlerts(task).catch((error) => {
            logger.error('Task alerts failed', { taskId: task.id, error: error instanceof Error ? error.message : String(error) });
        });
    try {
        after(run);
    } catch {
        // Outside a request scope (scripts, tests): plain fire-and-forget.
        void run();
    }
}

/** Find matching paid providers; alert PRO+/BUSINESS now and queue PRO. */
export async function dispatchTaskAlerts(task: AlertTask, now: Date = new Date()) {
    const providers = await prisma.user.findMany({
        where: {
            role: 'PROVIDER',
            taskAlertsEnabled: true,
            id: { not: task.userId },
            categories: { has: task.category },
            subscription: activeSubscription(now),
            ...(task.city === ONLINE_CITY ? {} : { OR: [{ city: null }, { city: task.city }] }),
        },
        select: { id: true, locale: true, subscription: { select: { plan: true } } },
        orderBy: { updatedAt: 'desc' },
        take: MAX_RECIPIENTS,
    });

    const immediate: Recipient[] = [];
    const delayed: string[] = [];
    for (const p of providers) {
        const plan = normalizePlan(p.subscription?.plan);
        if (plan && IMMEDIATE_PLANS.includes(plan)) immediate.push({ id: p.id, locale: p.locale });
        else if (plan && DELAYED_PLANS.includes(plan)) delayed.push(p.id);
    }

    const dueAt = new Date(task.createdAt.getTime() + PRO_DELAY_MS);
    // Independent: a failed queue insert must not cost PRO+/BUSINESS their alert, nor the reverse.
    const results = await Promise.allSettled([
        deliver(task, immediate),
        delayed.length > 0
            ? prisma.taskAlert.createMany({
                data: delayed.map((userId) => ({ taskId: task.id, userId, dueAt })),
                skipDuplicates: true,
            })
            : null,
    ]);
    const failure = results.find((r): r is PromiseRejectedResult => r.status === 'rejected');
    if (failure) throw failure.reason;

    return { immediate: immediate.length, queued: delayed.length };
}

/** One createMany for the in-app rows, then push, batched across recipients. */
async function deliver(task: Pick<AlertTask, 'id' | 'title' | 'category'>, recipients: Recipient[]): Promise<void> {
    if (recipients.length === 0) return;
    const link = `/tasks/${task.id}`;
    const params = notificationParams({ task: task.title, category: task.category });
    const rows = recipients.map((r) => {
        const s = notificationStrings(r.locale);
        return {
            userId: r.id,
            type: 'NEW_TASK',
            title: s.newTaskTitle(categoryName(task.category, r.locale)),
            message: s.newTaskBody(task.title),
            params,
            link,
        };
    });
    await prisma.notification.createMany({ data: rows });
    await sendPushToMany(rows.map((r) => ({ userId: r.userId, payload: { title: r.title, body: r.message, url: link } })));
}

/**
 * Send the queued PRO alerts that are due. Rows are claimed with a single
 * conditional update (PENDING -> CLAIMED under a fresh claimId), so two
 * overlapping runs can never both send the same row.
 */
export async function drainTaskAlerts(now: Date = new Date()) {
    const { count: expired } = await prisma.taskAlert.updateMany({
        where: { status: 'PENDING', createdAt: { lt: new Date(now.getTime() - MAX_ALERT_AGE_MS) } },
        data: { status: 'DROPPED' },
    });

    const due = await prisma.taskAlert.findMany({
        where: { status: 'PENDING', dueAt: { lte: now } },
        select: { id: true },
        orderBy: { dueAt: 'asc' },
        take: DRAIN_BATCH,
    });

    let sent = 0;
    let skipped = 0;
    let failed = 0;
    let claimedCount = 0;

    if (due.length > 0) {
        const claimId = randomUUID();
        await prisma.taskAlert.updateMany({
            where: { id: { in: due.map((d) => d.id) }, status: 'PENDING' },
            data: { status: 'CLAIMED', claimId },
        });
        const claimed = await prisma.taskAlert.findMany({
            where: { claimId },
            select: { id: true, taskId: true, userId: true },
        });
        claimedCount = claimed.length;

        if (claimed.length > 0) {
            const [tasks, users] = await Promise.all([
                prisma.task.findMany({
                    where: { id: { in: unique(claimed.map((c) => c.taskId)) }, status: 'OPEN' },
                    select: { id: true, title: true, category: true },
                }),
                prisma.user.findMany({
                    where: {
                        id: { in: unique(claimed.map((c) => c.userId)) },
                        taskAlertsEnabled: true,
                        subscription: activeSubscription(now),
                    },
                    select: { id: true, locale: true, subscription: { select: { plan: true } } },
                }),
            ]);
            const openTasks = new Map(tasks.map((t) => [t.id, t]));
            const paidUsers = new Map(
                users.filter((u) => normalizePlan(u.subscription?.plan)).map((u) => [u.id, u]),
            );

            const byTask = new Map<string, { ids: string[]; recipients: Recipient[] }>();
            const skippedIds: string[] = [];
            for (const row of claimed) {
                const user = paidUsers.get(row.userId);
                if (!openTasks.has(row.taskId) || !user) {
                    skippedIds.push(row.id);
                    continue;
                }
                const group = byTask.get(row.taskId) ?? { ids: [], recipients: [] };
                group.ids.push(row.id);
                group.recipients.push({ id: user.id, locale: user.locale });
                byTask.set(row.taskId, group);
            }

            const sentIds: string[] = [];
            for (const [taskId, group] of byTask) {
                try {
                    await deliver(openTasks.get(taskId)!, group.recipients);
                    sentIds.push(...group.ids);
                } catch (error) {
                    // Left CLAIMED: at most once, never twice. Pruned with the rest.
                    failed += group.ids.length;
                    logger.error('Task alert delivery failed', { taskId, error: error instanceof Error ? error.message : String(error) });
                }
            }

            if (sentIds.length > 0) {
                await prisma.taskAlert.updateMany({ where: { id: { in: sentIds } }, data: { status: 'SENT', sentAt: now } });
            }
            if (skippedIds.length > 0) {
                await prisma.taskAlert.updateMany({ where: { id: { in: skippedIds } }, data: { status: 'DROPPED' } });
            }
            sent = sentIds.length;
            skipped = skippedIds.length;
        }
    }

    const { count: pruned } = await prisma.taskAlert.deleteMany({
        where: { status: { not: 'PENDING' }, createdAt: { lt: new Date(now.getTime() - KEEP_MS) } },
    });

    return { claimed: claimedCount, sent, skipped, failed, expired, pruned };
}

function unique(values: string[]): string[] {
    return Array.from(new Set(values));
}
